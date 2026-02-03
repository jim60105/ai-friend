// src/core/context-assembler.ts

import { createLogger } from "@utils/logger.ts";
import { combinedTokenCount, estimateTokens, truncateToTokenLimit } from "@utils/token-counter.ts";
import { MemoryStore } from "./memory-store.ts";
import { loadSystemPrompt } from "./config-loader.ts";
import type {
  AssembledContext,
  ContextAssemblyConfig,
  FormattedContext,
  MessageFetcher,
} from "../types/context.ts";
import type { WorkspaceInfo } from "../types/workspace.ts";
import type { NormalizedEvent, PlatformMessage } from "../types/events.ts";
import type { ResolvedMemory } from "../types/memory.ts";

const logger = createLogger("ContextAssembler");

export class ContextAssembler {
  private readonly memoryStore: MemoryStore;
  private readonly config: ContextAssemblyConfig;
  private systemPromptCache: string | null = null;

  constructor(memoryStore: MemoryStore, config: ContextAssemblyConfig) {
    this.memoryStore = memoryStore;
    this.config = config;
  }

  /**
   * Load and cache system prompt
   */
  private async getSystemPrompt(): Promise<string> {
    if (this.systemPromptCache === null) {
      this.systemPromptCache = await loadSystemPrompt(this.config.systemPromptPath);
      logger.debug("System prompt loaded", {
        path: this.config.systemPromptPath,
        length: this.systemPromptCache.length,
      });
    }
    return this.systemPromptCache;
  }

  /**
   * Assemble initial context for an Agent session
   */
  async assembleContext(
    event: NormalizedEvent,
    workspace: WorkspaceInfo,
    messageFetcher: MessageFetcher,
  ): Promise<AssembledContext> {
    logger.info("Assembling context", {
      workspaceKey: workspace.key,
      channelId: event.channelId,
    });

    // Load system prompt
    const systemPrompt = await this.getSystemPrompt();

    // Get important memories
    const importantMemories = await this.memoryStore.getImportantMemories(workspace);
    logger.debug("Loaded important memories", { count: importantMemories.length });

    // Fetch recent messages
    const recentMessages = await messageFetcher.fetchRecentMessages(
      event.channelId,
      this.config.recentMessageLimit,
    );
    logger.debug("Fetched recent messages", { count: recentMessages.length });

    // Fetch related messages if available and in guild context
    let relatedMessages: PlatformMessage[] | undefined;
    if (
      event.guildId &&
      !event.isDm &&
      messageFetcher.searchRelatedMessages
    ) {
      try {
        // Use trigger message content as search query
        relatedMessages = await messageFetcher.searchRelatedMessages(
          event.guildId,
          event.channelId,
          event.content,
          10, // Limit related messages
        );
        logger.debug("Fetched related messages", {
          count: relatedMessages?.length ?? 0,
        });
      } catch (error) {
        logger.warn("Failed to fetch related messages", {
          error: String(error),
        });
      }
    }

    // Create trigger message from event
    const triggerMessage: PlatformMessage = {
      messageId: event.messageId,
      userId: event.userId,
      username: event.userId, // Will be enriched by platform adapter
      content: event.content,
      timestamp: event.timestamp,
      isBot: false,
    };

    // Estimate token count
    const estimatedTokens = this.calculateTokenEstimate(
      systemPrompt,
      importantMemories,
      recentMessages,
      relatedMessages,
      triggerMessage,
    );

    const context: AssembledContext = {
      importantMemories,
      recentMessages,
      relatedMessages,
      systemPrompt,
      triggerMessage,
      estimatedTokens,
      assembledAt: new Date(),
    };

    logger.info("Context assembled", {
      workspaceKey: workspace.key,
      memoriesCount: importantMemories.length,
      recentMessagesCount: recentMessages.length,
      relatedMessagesCount: relatedMessages?.length ?? 0,
      estimatedTokens,
    });

    return context;
  }

  /**
   * Calculate estimated token count for the context
   */
  private calculateTokenEstimate(
    systemPrompt: string,
    memories: ResolvedMemory[],
    recentMessages: PlatformMessage[],
    relatedMessages: PlatformMessage[] | undefined,
    triggerMessage: PlatformMessage,
  ): number {
    const memoriesText = memories.map((m) => m.content).join("\n");
    const recentText = recentMessages
      .map((m) => `${m.username}: ${m.content}`)
      .join("\n");
    const relatedText = relatedMessages
      ?.map((m) => `${m.username}: ${m.content}`)
      .join("\n") ?? "";
    const triggerText = `${triggerMessage.username}: ${triggerMessage.content}`;

    return combinedTokenCount(
      systemPrompt,
      memoriesText,
      recentText,
      relatedText,
      triggerText,
    );
  }

  /**
   * Format context for LLM consumption
   */
  formatContext(context: AssembledContext): FormattedContext {
    // Format memories section
    const memoriesSection = context.importantMemories.length > 0
      ? this.formatMemoriesSection(context.importantMemories)
      : "";

    // Format conversation history
    const conversationSection = this.formatConversationSection(
      context.recentMessages,
      context.relatedMessages,
    );

    // Build user message with context
    const userMessage = this.buildUserMessage(
      memoriesSection,
      conversationSection,
      context.triggerMessage,
    );

    // Truncate if necessary
    const availableTokens = this.config.tokenLimit - estimateTokens(context.systemPrompt);
    const truncatedUserMessage = truncateToTokenLimit(userMessage, availableTokens);

    const estimatedTokens = combinedTokenCount(
      context.systemPrompt,
      truncatedUserMessage,
    );

    return {
      systemMessage: context.systemPrompt,
      userMessage: truncatedUserMessage,
      estimatedTokens,
    };
  }

  /**
   * Format memories into a readable section
   */
  private formatMemoriesSection(memories: ResolvedMemory[]): string {
    const lines = [
      "## Important Memories",
      "",
      ...memories.map((m, i) => `${i + 1}. ${m.content}`),
      "",
    ];
    return lines.join("\n");
  }

  /**
   * Format conversation history section
   */
  private formatConversationSection(
    recentMessages: PlatformMessage[],
    relatedMessages?: PlatformMessage[],
  ): string {
    const lines: string[] = [];

    // Add recent messages
    if (recentMessages.length > 0) {
      lines.push("## Recent Conversation");
      lines.push("");
      for (const msg of recentMessages) {
        const prefix = msg.isBot ? "[Bot]" : "[User]";
        lines.push(`${prefix} ${msg.username}: ${msg.content}`);
      }
      lines.push("");
    }

    // Add related messages if present
    if (relatedMessages && relatedMessages.length > 0) {
      lines.push("## Related Messages from this Server");
      lines.push("");
      for (const msg of relatedMessages) {
        const prefix = msg.isBot ? "[Bot]" : "[User]";
        lines.push(`${prefix} ${msg.username}: ${msg.content}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Build the complete user message
   */
  private buildUserMessage(
    memoriesSection: string,
    conversationSection: string,
    triggerMessage: PlatformMessage,
  ): string {
    const parts: string[] = [];

    if (memoriesSection) {
      parts.push(memoriesSection);
    }

    if (conversationSection) {
      parts.push(conversationSection);
    }

    // Add current message
    parts.push("## Current Message");
    parts.push("");
    parts.push(`${triggerMessage.username}: ${triggerMessage.content}`);
    parts.push("");
    parts.push("Please respond to the current message above.");

    return parts.join("\n");
  }

  /**
   * Invalidate system prompt cache (for hot reload)
   */
  invalidateSystemPromptCache(): void {
    this.systemPromptCache = null;
  }
}
