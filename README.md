# 動態翻譯系統使用指南

## 概述

此翻譯系統支援動態載入 mtool 工具生成的 key-value 格式翻譯檔案，可以在遊戲運行時即時切換語言並更新所有介面文字。

## 檔案結構

```
www/
├── js/
│   └── plugins/
│       └── DynamicTranslation.js    # 主要翻譯插件
├── translations/                    # 翻譯檔案目錄
│   ├── zh.json                     # 中文翻譯
│   ├── en.json                     # 英文翻譯
│   └── ja.json                     # 日文翻譯
└── test_translation_system.js      # 測試腳本
```

## 翻譯檔案格式

翻譯檔案使用 JSON 格式，支援 mtool 工具的 key-value 格式：

```json
{
  "原文文字1": "譯文文字1",
  "原文文字2": "譯文文字2",
  "等級": "Level",
  "HP": "HP",
  "攻擊": "Attack",
  "要儲存這個檔案嗎？": "Save this file?",
  "%1 出現了！": "%1 appeared!"
}
```

## 使用方法

### 1. 安裝插件

將 `DynamicTranslation.js` 加入遊戲的插件列表中，並啟用它。

### 2. 準備翻譯檔案

使用 mtool 工具生成翻譯檔案，並將其放在 `translations/` 目錄中。支援的語言代碼：
- `zh`: 中文
- `en`: 英文
- `ja`: 日文
- `ko`: 韓文
- `fr`: 法文
- `de`: 德文
- `es`: 西班牙文
- `pt`: 葡萄牙文
- `ru`: 俄文

### 3. 在遊戲中使用

#### 方法一：選項選單
系統會自動在選項選單中加入語言選擇項目。玩家可以：
1. 開啟遊戲選單
2. 選擇「選項」
3. 找到「Language / 語言」選項
4. 按確認鍵切換語言

#### 方法二：腳本呼叫
在事件中使用腳本呼叫：

```javascript
TranslationManager.setLanguage('en');     // 切換到英文
TranslationManager.setLanguage('ja');     // 切換到日文
TranslationManager.setLanguage('zh');     // 切換到中文
```

#### 方法三：插件命令
在事件中使用插件命令：

```
SetLanguage en    // 切換到英文
SetLanguage ja    // 切換到日文
SetLanguage zh    // 切換到中文
```

## API 參考

### TranslationManager 物件

```javascript
// 取得當前語言
TranslationManager.getCurrentLanguage()

// 取得可用語言列表
TranslationManager.getAvailableLanguages()

// 切換語言
TranslationManager.setLanguage(languageCode)

// 翻譯特定文字
TranslationManager.translate(originalText)
```

### 插件參數

在插件管理器中設定：

- **Default Language**: 預設語言代碼 (預設: zh)
- **Translation Path**: 翻譯檔案路徑 (預設: translations/)
- **Auto Detect Translations**: 是否自動偵測翻譯檔案 (預設: true)

## 工作原理

1. **初始化階段**: 系統載入 `$dataSystem.terms` 建立原文對映表
2. **載入階段**: 根據設定載入對應語言的翻譯檔案
3. **覆蓋階段**: 覆蓋 `TextManager` 的方法，讓所有文字查詢都經過翻譯處理
4. **切換階段**: 當語言切換時，重新整理所有視窗以更新顯示文字

## 測試

包含 `test_translation_system.js` 測試腳本，可以用來驗證翻譯系統功能。

在瀏覽器控制台中執行：
```javascript
testTranslationSystem();
```

## 支援的文字類型

系統支援翻譯以下類型的文字：
- 基本屬性名稱 (等級、HP、MP等)
- 指令文字 (戰鬥、物品、技能等)
- 系統訊息 (儲存確認、載入確認等)
- 戰鬥訊息 (傷害、恢復、獲得物品等)
- 介面文字 (選項、按鈕等)

## 注意事項

1. 翻譯檔案必須使用 UTF-8 編碼
2. 系統會自動處理含參數的文字 (如 `%1 出現了！`)
3. 未找到翻譯的文字會顯示原文
4. 建議先建立完整的中英文翻譯，再擴展到其他語言
5. 翻譯檔案載入失敗不會影響遊戲正常運行
