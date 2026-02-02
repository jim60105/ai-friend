# language: zh-TW
功能: Deno 專案結構與依賴管理

  背景:
    假設專案使用 Deno 的原生依賴管理機制
    而且需要清晰的目錄結構以支援多平台擴充
    而且需要區分核心邏輯與平台 Adapter
    而且專案需要支援本地開發與容器化部署兩種情境

  情境: 使用 deno.json 作為專案配置檔
    當專案初始化時
    那麼必須在根目錄建立 deno.json 設定檔
    而且 deno.json 必須包含
      | 區塊 | 說明 |
      | imports | 依賴項對映(import map) |
      | tasks | 常用指令腳本(例如 dev、test、build) |
      | compilerOptions | TypeScript 編譯選項 |
      | fmt | 程式碼格式化規則 |
      | lint | 程式碼檢查規則 |
    而且不得使用獨立的 import_map.json 檔案

  情境: 目錄結構必須清晰分層
    當專案建立目錄結構時
    那麼必須遵循以下目錄規劃
      | 目錄 | 用途 |
      | src/ | 原始碼根目錄 |
      | src/core/ | 核心邏輯(Agent、記憶、工作目錄管理) |
      | src/platforms/ | 平台 Adapter(Discord、Misskey) |
      | src/skills/ | Agent 可呼叫的 skills 實作 |
      | src/types/ | TypeScript 型別定義 |
      | src/utils/ | 通用工具函式 |
      | config/ | 範例配置檔與預設配置 |
      | prompts/ | Bot 提示詞檔案 |
      | docs/ | 專案文件(包含 features) |
      | tests/ | 測試檔案(對應 src 結構) |
    而且每個目錄必須有清楚的職責邊界

  情境: 依賴項必須使用明確版本
    當在 deno.json 的 imports 中定義依賴項
    那麼必須使用明確的版本號
    而且不得使用浮動版本或 latest 標籤
    而且外部依賴必須使用 jsr: 或 npm: 或 https: 前綴
    而且範例如下
      | 依賴類型 | 範例 |
      | JSR 套件 | jsr:@std/path@^1.0.0 |
      | npm 套件 | npm:discord.js@^14.0.0 |
      | HTTP 模組 | https://deno.land/std@0.220.0/path/mod.ts |

  情境: 使用路徑別名簡化 import
    當在程式碼中 import 模組
    那麼可以在 deno.json imports 中定義路徑別名
    而且至少包含
      | 別名 | 對應路徑 |
      | @core/ | ./src/core/ |
      | @platforms/ | ./src/platforms/ |
      | @skills/ | ./src/skills/ |
      | @types/ | ./src/types/ |
      | @utils/ | ./src/utils/ |
    而且程式碼中必須使用別名而非相對路徑
    而且避免出現 ../../../ 等深層相對路徑

  情境: 主程式進入點與啟動流程
    當系統啟動時
    那麼主程式進入點必須為 src/main.ts
    而且 main.ts 負責
      | 職責 | 說明 |
      | 載入配置檔 | 讀取並驗證 config.yaml |
      | 初始化平台 Adapter | 根據配置啟動 Discord/Misskey 連線 |
      | 註冊事件處理器 | 將平台事件路由到核心處理流程 |
      | 啟動健康檢查 | 提供容器健康檢查端點(如使用) |
    而且在包含錯誤時必須記錄明確日誌並終止程序

  情境: 程式碼格式化與檢查規則
    當撰寫程式碼時
    那麼必須遵循 deno.json 中定義的格式化規則
    而且使用 deno fmt 自動格式化程式碼
    而且格式化規則至少包含
      | 規則 | 設定 |
      | lineWidth | 100 |
      | indentWidth | 2 |
      | useTabs | false |
      | singleQuote | false |
      | proseWrap | preserve |
    而且使用 deno lint 檢查程式碼品質
    而且所有程式碼提交前必須通過 fmt 與 lint 檢查

  情境: Tasks 定義常用開發指令
    當開發者需要執行常見操作
    那麼可以使用 deno task <task_name> 執行
    而且 deno.json 必須定義至少以下 tasks
      | Task | 說明 | 指令範例 |
      | dev | 開發模式啟動(含熱重載) | deno run --watch src/main.ts |
      | start | 正式環境啟動 | deno run --allow-net --allow-read --allow-write --allow-env src/main.ts |
      | test | 執行測試 | deno test --allow-read --allow-write |
      | fmt | 格式化程式碼 | deno fmt src/ |
      | lint | 檢查程式碼 | deno lint src/ |
      | check | 型別檢查 | deno check src/main.ts |

  情境: 環境特定的啟動參數
    當在不同環境啟動 Bot
    那麼可以透過 .env 檔案或環境變數控制行為
    而且 deno task dev 可自動載入 .env.local
    而且容器環境不依賴 .env 檔案而使用注入的環境變數
    而且 .env 檔案不得提交到版本控制
    而且必須提供 .env.example 作為範本

  情境: 鎖定檔管理依賴完整性
    當首次安裝依賴或更新依賴
    那麼 Deno 會自動產生 deno.lock 檔案
    而且 deno.lock 必須提交到版本控制
    而且在 CI/CD 與容器建構時必須使用 --frozen 旗標
    而且確保所有環境使用一致的依賴版本
    而且避免因依賴版本差異導致的執行問題
