# 網站結構（2026-10-30 起）

- 經典模板和日夜對開已合併成單一網站、單一畫面「Lovia & Chi」：`index.html` + `studio.js`（頁面標記 `data-studio-page="chi"`）。沒有風格切換。
- `daynight.html` 和 `studio.html` 只做轉址到 `index.html`，會保留 `#w=`、`#s=` 等連結內容。
- 合併前的檔案（經典 `app.js`／`styles.css`／`editorial-ui.*`、舊 Day Night 頁、`Lovia-template-v*.html`、舊測試）都移到 `archive/`，網站不再使用。
- 舊頁存的設置（`studio.presets.lovia`、`studio.presets.daynight`）第一次打開新頁會複製進 `studio.presets.chi`，套用時在 `applySettings` 轉換。

# 使用者確認的介面規則

- 不可移動預覽位置：桌機在左側黏住，手機固定在頂端、分頁列在預覽正下方。新功能放進右側面板的分頁裡。
- 分頁固定為「截圖 / 版型 / 細節 / 外觀 / 文字 / 匯出」，作品集是側滑面板。
- 原有功能不能減少；要減少必須有替代功能，並先問使用者。
- 只屬於某一種標題排法（一行報頭／大標＋副標）的選項，切到另一種時要隱藏。
- 所有拉桿旁邊都要有可輸入的數字框。
- 上傳、截圖拖動與縮放、文字設置、原創藝術打碼、預設與作品集、高清 PNG 和動態圖匯出必須繼續可用。改動後用 1300×900 與 iPhone 13 檢查，375/390/393 寬不可有橫向捲動。
