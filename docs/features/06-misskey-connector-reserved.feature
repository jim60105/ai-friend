# language: zh-TW
功能: 預留 Misskey 平台整合點 (不要求現階段完成)

  背景:
    假設 Misskey 平台支援 REST API 與 WebSocket 串流
    而且 Misskey 以 access token 參數 i 進行認證
    而且 WebSocket 連線會在 URL 中帶上 i 參數
    而且系統需要為 Misskey 保留擴充點，但目前不強制實作完整功能

  情境: Misskey Adapter 的最小形狀
    當系統新增 Misskey 平台 Adapter
    那麼 Adapter 必須能提供 platform="misskey"
    而且能輸出正規化事件模型(包含 is_dm 與 channel_id)
    而且能實作 send_reply 能力以回覆提及或私訊

  情境: Misskey 即時事件接入的擴充點
    當 Misskey Adapter 接收到即時事件
    那麼系統必須能將其轉為統一事件並觸發相同的回覆流程
    而且系統必須允許未來以 WebSocket 串流承接 mention/reply/私訊事件
