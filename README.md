# Lovia & Chi · Reading Studio

Reeden 閱讀主題的展示畫報工坊：上傳日間、夜間截圖，排成一張畫報，匯出高清 PNG 或動態圖。
網址：https://reeden-tools.github.io/lovia-chi/

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 唯一的頁面（版面與樣式） |
| `studio.js` | 繪圖引擎與介面 |
| `studio-shell.js` | 繁／简切換、設置、作品集與雲端 |
| `studio-motion.js` | GIF／影片匯出 |
| `studio-extra.js` | 風琴頁、借閱卡、報紙版型 |
| `art-mosaic.js`、`art-mosaic.css` | 原創藝術打碼 |
| `assets/` | 示範截圖 |
| `daynight.html`、`studio.html` | 舊網址轉址，會保留 `#w=`、`#s=` 連結內容 |
| `archive/` | 合併前的經典模板、Day Night、早期單檔版本與舊測試，只留作參考，網站不會用到 |

## 開發

- `npm run build`：檢查語法和本地引用，輸出到 `dist/`。
- 介面規則見 `AGENTS.md`。
