# Img2GifChromePlugin

在 X（Twitter）發文時，把你選的圖片 **即時轉成 GIF** 並**直接丟回發文視窗**上傳。

你可以把它想成：

- **不想把圖丟去外部網站轉檔**（怕被 AI 亂咬一口）
- 只想在 X 發文框裡「點一下」就把圖片變 GIF 上傳

（宅宅吸血鬼小提醒：我們只吸你電腦的效能，不吸你的資料 🧛）

---

## 功能特色

- **一鍵選圖**：在 X 發文視窗的「發佈」按鈕旁邊加一個 GIF 按鈕。
- **支援格式**：`JPG` / `PNG` / `WEBP` / `GIF`。
- **不落地、不下載**：轉完直接塞進 X 的上傳框（模擬選檔）。
- **本機端處理**：轉檔在瀏覽器內完成，不會上傳到任何第三方伺服器。

---

## 系統需求

- Google Chrome（或 Chromium 系）
- 目前僅支援：
  - `https://x.com/*`
  - `https://twitter.com/*`

---

## 安裝方式（開發者模式載入 / Load unpacked）

> 這是「未上架 Chrome Web Store」時最常用的安裝方式。

1. 開啟下面連結
   - [URL](chrome://extensions/)
2. 右上角打開：
   - **Developer mode / 開發人員模式**
   ![示意圖](./img/openDevelopeMode.png)
3. 點擊：
   - **Load unpacked / 載入未封裝項目**
   ![示意圖](./img/loadPlugin.png)
4. 選擇這個專案的資料夾（包含 `manifest.json` 那層）
   ![示意圖](./img/chooseFolder.png)
5. 載入成功後，到 `https://x.com` 重新整理頁面（F5）

---

## 使用方式

1. 打開 `https://x.com` 或 `https://twitter.com`
2. 點「發文」打開發文視窗（Compose）
3. 在「發佈」按鈕旁邊，你會看到一個 GIF 圖示按鈕
4. 點 GIF 按鈕 → 選擇你要轉的圖片（可多選）
5. 稍等一下，轉好的 GIF 會自動「上傳進發文視窗」的媒體區

### 小提示

- 轉 GIF 可能會吃 CPU（尤其是大圖），建議先用圖片工具縮小解析度會更快。
- 一次多選多張時，會依序處理並上傳。

---

## 常見問題（Troubleshooting）

### 1) 看不到 GIF 按鈕

- 確認你是在 `x.com` / `twitter.com`
- 到 `chrome://extensions/`
  - 確認擴充功能已啟用
  - 點 **重新整理**（reload）
- 回到 X 頁面按 **F5**

### 2) 點了按鈕沒反應 / 沒有上傳

- 打開 DevTools Console 看是否有錯誤訊息
- X 的 DOM 常改版，如果按鈕位置被換掉，可能需要更新 selector

### 3) 轉出來不是 GIF（X 沒顯示 GIF 標籤）

- 本專案使用 `gif.js` 在本機產生真正 GIF（二進位），理論上會是 GIF。
- 如果你看到仍然被當成靜態圖，可能是 X 對某些情境不顯示標籤（例如只 1 frame）。
  - 本專案用 **2 個相同 frame** 提高顯示 GIF 標籤機率。

### 4) `Failed to construct 'Worker'` / Worker 相關錯誤

- 本專案已用 `blob:` 方式載入 `gif.worker.js` 來避免跨來源限制。
- 若仍出錯：
  - 先 reload extension
  - 再 F5 重新整理 X 頁面

---

## 隱私與資料使用（Privacy）

- 本擴充功能**不會**把你的圖片上傳到任何第三方伺服器。
- 圖片轉 GIF 在瀏覽器內完成。
- 最終只會把轉好的 GIF **上傳到你正在發文的 X/Twitter**（就像你自己手動選檔上傳一樣）。

---

## 專案結構（簡述）

- `manifest.json`：MV3 設定，限定只在 `x.com/twitter.com` 注入。
- `content.js`：
  - 注入 GIF 按鈕
  - 選圖 → Canvas 繪製 → `gif.js` 產 GIF → 觸發 X 的 `fileInput` 上傳
- `vendor/gif.js`、`vendor/gif.worker.js`：GIF 編碼用（本地打包，避開 CSP）

---

## 貢獻 / 開發

歡迎 PR / Issue。

建議測試流程：

1. `chrome://extensions/` reload 擴充功能
2. `x.com` F5
3. 打開發文視窗測按鈕與上傳

