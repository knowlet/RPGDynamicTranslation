# RPG Maker 動態翻譯系統 (Dynamic Translation System)

這是一個專為 RPG Maker MV/MZ 設計的動態翻譯外掛，支援載入外部 JSON 翻譯檔案，並在遊戲中即時切換語言。

## ✨ 功能特色

*   **動態載入**：無需重新啟動遊戲即可載入新的翻譯檔案。
*   **即時切換**：玩家可以在選項選單中隨時切換語言。
*   **格式支援**：支援 mtool 工具生成的 key-value JSON 格式。
*   **自動偵測**：自動偵測並載入 `translations/` 資料夾下的語言檔案。
*   **簡易安裝**：提供自動化安裝腳本，一鍵設定。

---

## 📖 使用者指南 (User Guide)

如果您是遊戲開發者或翻譯者，想要將此系統整合到您的遊戲中，請參考以下步驟。

### 🚀 快速安裝

我們提供了一個 Python 腳本來自動化安裝過程。此腳本會將外掛複製到您的專案中，並自動設定 `plugins.js`。

1.  確保您已安裝 Python 3。
2.  下載此專案。
3.  在終端機 (Terminal) 或命令提示字元 (CMD) 中執行以下指令：

```bash
# 格式: python3 install_plugin.py [您的 RPG Maker 專案根目錄]
python3 install_plugin.py ../MyRPGProject
```

腳本會自動執行以下動作：
*   複製 `DynamicTranslation.js` 到 `js/plugins/`。
*   更新 `js/plugins.js` 以啟用外掛。
*   自動搜尋專案根目錄下的 JSON 翻譯檔（如 `A翻譯.json`），並將其安裝為預設中文翻譯 (`translations/zh.json`)。

### 📦 手動安裝

如果您無法使用腳本，也可以手動安裝：

1.  將 `DynamicTranslation.js` 複製到您專案的 `js/plugins/` 資料夾。
2.  開啟 RPG Maker 編輯器，進入「外掛管理器 (Plugin Manager)」。
3.  新增 `DynamicTranslation` 外掛並開啟狀態為 ON。
4.  在專案根目錄建立 `translations/` 資料夾。

### 📝 準備翻譯檔案

翻譯檔案使用 JSON 格式，放置於 `translations/` 資料夾中。檔名即為語言代碼（例如 `zh.json`, `en.json`, `ja.json`）。

**格式範例 (`translations/zh.json`)：**

```json
{
  "Level": "等級",
  "HP": "生命值",
  "Attack": "攻擊力",
  "Save which file?": "要儲存哪個檔案？",
  "%1 found!": "發現了 %1！"
}
```

### 🎮 遊戲內使用

#### 1. 選項選單
外掛會自動在「選項 (Options)」選單中加入「Language / 語言」選項，玩家可以直接在此切換。

#### 2. 事件指令
您也可以透過事件指令來控制語言：

*   **外掛命令 (Plugin Command)**:
    *   `SetLanguage en` (切換為英文)
    *   `SetLanguage zh` (切換為中文)

*   **腳本呼叫 (Script Call)**:
    ```javascript
    TranslationManager.setLanguage('en');
    ```

---

## 🛠️ 開發者指南 (Developer Guide)

如果您想協助改進此外掛或進行二次開發，請參考以下說明。

### 環境建置

本專案使用 Node.js 進行測試與開發管理。

1.  安裝 Node.js (建議 v18+)。
2.  安裝相依套件：

```bash
npm install
```

### 執行測試

我們使用 Jest 進行單元測試，並模擬了 RPG Maker 的執行環境。

**使用 npm:**
```bash
npm test
```

### 專案結構

*   `DynamicTranslation.js`: 外掛核心程式碼 (IIFE 格式)。
*   `install_plugin.py`: 自動安裝腳本 (Python)。
*   `tests/`: 測試檔案目錄。
    *   `setup.js`: 模擬 RPG Maker 全域變數與瀏覽器環境。
    *   `DynamicTranslation.test.js`: 主要測試邏輯。
*   `.github/workflows/`: CI/CD 自動化測試設定。

### 貢獻方式

歡迎提交 Pull Request 或 Issue。在提交程式碼前，請確保：
1.  所有測試皆通過 (`npm test`)。
2.  如有新增功能，請補上相應的測試案例。
