// src/utils/token-counter.ts

/**
 * Rough token estimation
 *
 * This is a simplified estimation:
 * - English: ~4 characters per token
 * - CJK: ~2 characters per token (each character is often 1 token)
 *
 * For accurate counting, use the actual tokenizer for your model.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let tokens = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);

    // CJK characters (Chinese, Japanese, Korean)
    // CJK Unified Ideographs: U+4E00 - U+9FFF
    // Hiragana: U+3040 - U+309F
    // Katakana: U+30A0 - U+30FF
    // Hangul: U+AC00 - U+D7AF
    if (
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3040 && code <= 0x309F) ||
      (code >= 0x30A0 && code <= 0x30FF) ||
      (code >= 0xAC00 && code <= 0xD7AF)
    ) {
      tokens += 1; // CJK characters are often 1 token each
    } else if (code > 127) {
      tokens += 0.5; // Other non-ASCII
    } else {
      tokens += 0.25; // ASCII characters (~4 chars per token)
    }
  }

  // Add some overhead for JSON structure and special tokens
  tokens *= 1.1;

  return Math.ceil(tokens);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);

  if (currentTokens <= maxTokens) {
    return text;
  }

  // Binary search for the right length
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const truncated = text.slice(0, mid);

    if (estimateTokens(truncated) <= maxTokens) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  // Add ellipsis if truncated
  if (low < text.length) {
    return text.slice(0, Math.max(0, low - 3)) + "...";
  }

  return text.slice(0, low);
}

/**
 * Calculate combined token count for multiple strings
 */
export function combinedTokenCount(...texts: string[]): number {
  return texts.reduce((sum, text) => sum + estimateTokens(text), 0);
}
