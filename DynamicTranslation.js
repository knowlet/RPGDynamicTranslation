//=============================================================================
// DynamicTranslation.js
//=============================================================================

/*:
 * @plugindesc 動態翻譯系統 - 支援 mtool 工具的 key-value 翻譯檔案格式
 * @author Supernova
 *
 * @param Default Language
 * @desc 預設語言代碼 (例如: zh, en, ja)
 * @default zh
 *
 * @param Translation Path
 * @desc 翻譯檔案路徑 (相對於遊戲根目錄)
 * @default translations/
 *
 * @param Auto Detect Translations
 * @desc 是否自動偵測並載入所有可用的翻譯檔案
 * @type boolean
 * @default true
 *
 * @help
 * ============================================================================
 * 動態翻譯系統 - 支援 mtool 工具格式
 * ============================================================================
 *
 * 此插件支援從 mtool 工具生成的 key-value 格式翻譯檔案。
 * 可以在遊戲運行時動態載入翻譯檔案並即時切換語言。
 *
 * 翻譯檔案結構:
 * translations/
 *   ├── zh.json  (中文翻譯)
 *   ├── en.json  (英文翻譯)
 *   └── ja.json  (日文翻譯)
 *
 * 翻譯檔案格式 (mtool 工具生成的格式):
 * {
 *   "原文文字1": "譯文文字1",
 *   "原文文字2": "譯文文字2",
 *   "等級": "Level",
 *   "HP": "HP",
 *   "MP": "MP",
 *   "攻擊": "Attack",
 *   "防禦": "Defense",
 *   "物品": "Item",
 *   "技能": "Skill",
 *   "裝備": "Equip",
 *   "儲存": "Save",
 *   "載入": "Load",
 *   "選項": "Options",
 *   "結束遊戲": "Exit Game",
 *   "新遊戲": "New Game",
 *   "繼續": "Continue",
 *   "取消": "Cancel",
 *   "買入": "Buy",
 *   "賣出": "Sell",
 *   "要儲存這個檔案嗎？": "Save this file?",
 *   "要載入這個檔案嗎？": "Load this file?",
 *   "%1 出現了！": "%1 appeared!",
 *   "%1 先發制人！": "%1 got the preemptive strike!",
 *   "%1 受到了 %2 點傷害！": "%1 took %2 damage!",
 *   "得到了 %1 %2！": "Gained %1 %2!",
 *   "得到了 %1 枚金幣！": "Gained %1 gold!"
 * }
 *
 * 使用方法:
 * 1. 使用 mtool 工具生成翻譯檔案並放在 translations/ 目錄中
 * 2. 系統會自動載入所有可用的翻譯檔案
 * 3. 在選項選單中選擇語言，或使用腳本呼叫切換語言
 * 4. 所有介面文字會自動更新為新語言
 *
 * 腳本呼叫:
 *   TranslationManager.setLanguage('en');     // 切換到英文
 *   TranslationManager.getCurrentLanguage(); // 取得當前語言
 *   TranslationManager.getAvailableLanguages(); // 取得可用語言列表
 *
 * 插件命令:
 *   SetLanguage en    // 切換到英文
 *   SetLanguage zh    // 切換到中文
 *
 * ============================================================================
 */

(function () {
    'use strict';

    // 插件參數
    var parameters = PluginManager.parameters('DynamicTranslation');
    var defaultLanguage = parameters['Default Language'] || 'zh';
    var translationPath = parameters['Translation Path'] || 'translations/';
    var autoDetectTranslations = parameters['Auto Detect Translations'] === 'true';
    var translationMode = parameters['Translation Mode'] || 'simple'; // simple, full

    // TranslationManager 類別 - 支援 mtool 工具的 key-value 格式
    var TranslationManager = function () {
        this._currentLanguage = defaultLanguage;
        this._translations = {}; // key-value 格式的翻譯字典
        this._originalTexts = {}; // 記錄原文的映射
        this._isInitialized = false;
        this._refreshCallbacks = [];
        this._availableLanguages = [];
        this._enableSubstringExtraction = translationMode === 'full';
    };

    // 初始化翻譯管理器
    TranslationManager.prototype.initialize = function () {
        if (this._isInitialized) return;

        this._buildOriginalTextMapping();
        if (autoDetectTranslations) {
            this._detectAvailableLanguages();
        } else {
            this._availableLanguages = [defaultLanguage];
            this.loadLanguage(defaultLanguage, function () {
                this._isInitialized = true;
                this._applyTranslations();
            }.bind(this));
        }
    };

    // 建立原文對映（從 TextManager 和系統資料建立）
    TranslationManager.prototype._buildOriginalTextMapping = function () {
        this._originalTexts = {};

        // 從 $dataSystem.terms 建立原文對映
        if ($dataSystem && $dataSystem.terms) {
            var terms = $dataSystem.terms;
            for (var category in terms) {
                if (terms.hasOwnProperty(category)) {
                    for (var id in terms[category]) {
                        if (terms[category].hasOwnProperty(id)) {
                            var originalText = terms[category][id];
                            if (originalText) {
                                this._originalTexts[originalText] = { category: category, id: id };
                            }
                        }
                    }
                }
            }
        }

        // 記錄貨幣單位
        if ($dataSystem && $dataSystem.currencyUnit) {
            this._originalTexts[$dataSystem.currencyUnit] = { category: 'currencyUnit', id: 'currencyUnit' };
        }
    };

    // 自動偵測可用的語言檔案
    TranslationManager.prototype._detectAvailableLanguages = function () {
        var testFiles = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru'];
        var loadedCount = 0;

        testFiles.forEach(function (lang) {
            this.loadLanguage(lang, function (success) {
                loadedCount++;
                if (success && this._availableLanguages.indexOf(lang) === -1) {
                    this._availableLanguages.push(lang);
                }

                // 當所有測試完成後，載入預設語言
                if (loadedCount === testFiles.length) {
                    if (this._availableLanguages.length === 0) {
                        this._availableLanguages = [defaultLanguage];
                    }

                    this._isInitialized = true;
                    this._applyTranslations();
                }
            }.bind(this));
        }.bind(this));
    };

    // 載入指定語言的翻譯檔案
    TranslationManager.prototype.loadLanguage = function (language, callback) {
        var filename = translationPath + language + '.json';
        var xhr = new XMLHttpRequest();

        xhr.open('GET', filename);
        xhr.overrideMimeType('application/json');
        xhr.onload = function () {
            if (xhr.status < 400) {
                try {
                    var translations = JSON.parse(xhr.responseText);
                    this._translations[language] = translations;
                    console.log('翻譯載入成功:', language, Object.keys(translations).length, '個項目');
                    console.log('載入的翻譯項目範例:', Object.keys(translations).slice(0, 5));
                    if (callback) callback(true);
                } catch (e) {
                    console.error('翻譯檔案解析失敗:', filename, e);
                    if (callback) callback(false);
                }
            } else {
                console.warn('翻譯檔案載入失敗:', filename, '狀態碼:', xhr.status);
                if (callback) callback(false);
            }
        }.bind(this);

        xhr.onerror = function () {
            console.warn('無法載入翻譯檔案:', filename);
            if (callback) callback(false);
        };

        xhr.send();
    };

    // 設定當前語言
    TranslationManager.prototype.setLanguage = function (language) {
        if (this._currentLanguage === language) return;

        if (!this._translations[language]) {
            this.loadLanguage(language, function (success) {
                if (success) {
                    this._currentLanguage = language;
                    this._applyTranslations();
                    this._refreshAllWindows();
                }
            }.bind(this));
        } else {
            this._currentLanguage = language;
            this._applyTranslations();
            this._refreshAllWindows();
        }
    };

    // 取得當前語言
    TranslationManager.prototype.getCurrentLanguage = function () {
        return this._currentLanguage;
    };

    // 取得可用語言列表
    TranslationManager.prototype.getAvailableLanguages = function () {
        return this._availableLanguages.slice();
    };

    // 提取對應的翻譯部分
    TranslationManager.prototype._extractCorrespondingTranslation = function (originalPart, fullKey, fullTranslation, keyIndex) {
        // 專門處理 RPG Maker 中的訊息分割情況

        // 分割原文和翻譯為行
        var originalLines = fullKey.split('\n');
        var translationLines = fullTranslation.split('\n');

        // 如果行數相同，嘗試按行匹配
        if (originalLines.length === translationLines.length && originalLines.length > 1) {
            // 計算子字串在哪一行
            var currentPos = 0;
            for (var i = 0; i < originalLines.length; i++) {
                var lineStart = currentPos;
                var lineEnd = currentPos + originalLines[i].length + (i < originalLines.length - 1 ? 1 : 0); // +1 for \n

                if (keyIndex >= lineStart && keyIndex < lineEnd) {
                    // 子字串在這一行中
                    var relativeIndex = keyIndex - lineStart;
                    var relativeLength = Math.min(originalPart.length, originalLines[i].length - relativeIndex);

                    // 在對應的翻譯行中提取
                    var translatedLine = translationLines[i];
                    if (translatedLine) {
                        // 使用比例映射起始和結束位置
                        var lineRatio = translatedLine.length / originalLines[i].length;

                        var transStart = Math.floor(relativeIndex * lineRatio);
                        var transEnd;

                        // 如果原文子字串延伸到行尾，則譯文也延伸到行尾
                        if (relativeIndex + relativeLength >= originalLines[i].length) {
                            transEnd = translatedLine.length;
                        } else {
                            transEnd = Math.floor((relativeIndex + relativeLength) * lineRatio);
                        }

                        return translatedLine.substring(transStart, transEnd);
                    }
                }

                currentPos = lineEnd;
            }
        }

        // 方法2: 如果長度比例接近，使用比例提取
        if (Math.abs(fullTranslation.length - fullKey.length) / fullKey.length < 0.5) {
            var startRatio = keyIndex / fullKey.length;
            var endRatio = (keyIndex + originalPart.length) / fullKey.length;

            var translationStart = Math.round(startRatio * fullTranslation.length);
            var translationEnd = Math.round(endRatio * fullTranslation.length);

            translationStart = Math.max(0, Math.min(translationStart, fullTranslation.length));
            translationEnd = Math.max(translationStart, Math.min(translationEnd, fullTranslation.length));

            var result = fullTranslation.substring(translationStart, translationEnd);

            // 如果結果包含換行但原文不包含，清理換行
            if (originalPart.indexOf('\n') === -1 && result.indexOf('\n') !== -1) {
                // 只保留第一行
                result = result.split('\n')[0];
            }

            return result;
        }

        // 方法3: 簡單的長度比例估計（最後的後備方案）
        var estimatedLength = Math.round(originalPart.length * (fullTranslation.length / fullKey.length));
        var estimatedStart = Math.round(keyIndex * (fullTranslation.length / fullKey.length));

        estimatedStart = Math.max(0, Math.min(estimatedStart, fullTranslation.length));
        estimatedLength = Math.max(1, Math.min(estimatedLength, fullTranslation.length - estimatedStart));

        var result = fullTranslation.substring(estimatedStart, estimatedStart + estimatedLength);

        // 清理結果：移除不必要的換行
        if (originalPart.indexOf('\n') === -1 && result.indexOf('\n') !== -1) {
            result = result.replace(/\n/g, '');
        }

        return result;
    };

    // 翻譯文字（支援 mtool 工具的 key-value 格式）
    TranslationManager.prototype.translate = function (originalText) {
        if (!originalText || !this._isInitialized) {
            return originalText;
        }

        var currentTranslations = this._translations[this._currentLanguage];
        if (!currentTranslations) {
            return originalText;
        }

        // 直接查找翻譯
        var translatedText = currentTranslations[originalText];
        if (translatedText !== undefined) {
            // 調試：記錄成功翻譯的文字
            if (Math.random() < 0.01) { // 只記錄 1% 的翻譯以避免刷屏
                console.log('翻譯:', originalText.substring(0, 50) + (originalText.length > 50 ? '...' : ''), '->', translatedText.substring(0, 50) + (translatedText.length > 50 ? '...' : ''));
            }
            return translatedText;
        }

        // 如果找不到完整翻譯，嘗試清理可能的格式差異後再查找
        var cleanedText = originalText.trim();
        if (cleanedText !== originalText) {
            translatedText = currentTranslations[cleanedText];
            if (translatedText !== undefined) {
                return translatedText;
            }
        }

        // 處理單行文字的特殊情況 (Substring Extraction)
        if (this._enableSubstringExtraction && originalText.indexOf('\n') === -1) {
            // 查找包含此文字的完整訊息翻譯
            for (var key in currentTranslations) {
                if (currentTranslations.hasOwnProperty(key)) {
                    // 如果原文是某個完整訊息的子字串，嘗試提取對應的翻譯部分
                    var keyIndex = key.indexOf(originalText);
                    if (keyIndex !== -1 && key !== originalText) { // 排除已經檢查過的直接匹配
                        var translatedKey = currentTranslations[key];
                        // 正確提取對應的翻譯部分，保持相對位置
                        var translatedPart = this._extractCorrespondingTranslation(originalText, key, translatedKey, keyIndex);
                        // console.log('子字串翻譯找到:', originalText, '->', translatedPart, '(來自完整訊息)');
                        return translatedPart;
                    }
                }
            }
        }

        return originalText;
    };

    // 取得翻譯系統狀態（用於調試）
    TranslationManager.prototype.getStatus = function () {
        return {
            isInitialized: this._isInitialized,
            currentLanguage: this._currentLanguage,
            availableLanguages: this._availableLanguages,
            loadedTranslations: Object.keys(this._translations),
            translationCount: this._availableLanguages.reduce((count, lang) => {
                return count + (this._translations[lang] ? Object.keys(this._translations[lang]).length : 0);
            }, 0)
        };
    };

    // 套用翻譯到 TextManager
    TranslationManager.prototype._applyTranslations = function () {
        if (!this._isInitialized) return;

        // 備份原始的 TextManager 方法
        if (!TextManager._originalBasic) {
            TextManager._originalBasic = TextManager.basic;
            TextManager._originalParam = TextManager.param;
            TextManager._originalCommand = TextManager.command;
            TextManager._originalMessage = TextManager.message;
            TextManager._originalGetter = TextManager.getter;
        }

        var self = this;

        // 覆蓋 TextManager 方法
        TextManager.basic = function (basicId) {
            var originalText = TextManager._originalBasic ? TextManager._originalBasic(basicId) : $dataSystem.terms.basic[basicId] || '';
            return self.translate(originalText);
        };

        TextManager.param = function (paramId) {
            var originalText = TextManager._originalParam ? TextManager._originalParam(paramId) : $dataSystem.terms.params[paramId] || '';
            return self.translate(originalText);
        };

        TextManager.command = function (commandId) {
            var originalText = TextManager._originalCommand ? TextManager._originalCommand(commandId) : $dataSystem.terms.commands[commandId] || '';
            return self.translate(originalText);
        };

        TextManager.message = function (messageId) {
            var originalText = TextManager._originalMessage ? TextManager._originalMessage(messageId) : $dataSystem.terms.messages[messageId] || '';
            return self.translate(originalText);
        };

        // 處理動態屬性
        if (TextManager._originalGetter) {
            var originalGetter = TextManager._originalGetter;
            TextManager.getter = function (method, param) {
                return {
                    get: function () {
                        var originalText = this[method](param);
                        return self.translate(originalText);
                    }.bind(originalGetter(method, param))
                };
            };
        }

        // 處理貨幣單位
        if (typeof TextManager.currencyUnit === 'object' && TextManager.currencyUnit.get) {
            var originalCurrencyUnit = $dataSystem ? $dataSystem.currencyUnit : '';
            Object.defineProperty(TextManager, 'currencyUnit', {
                get: function () {
                    return self.translate(originalCurrencyUnit);
                },
                configurable: true
            });
        }
    };

    // 重新整理所有視窗
    TranslationManager.prototype._refreshAllWindows = function () {
        if (SceneManager._scene) {
            SceneManager._scene._refreshAllWindows();
        }

        // 呼叫所有註冊的重新整理回呼
        this._refreshCallbacks.forEach(function (callback) {
            if (typeof callback === 'function') {
                callback();
            }
        });
    };

    // 註冊重新整理回呼
    TranslationManager.prototype.onRefresh = function (callback) {
        if (typeof callback === 'function') {
            this._refreshCallbacks.push(callback);
        }
    };

    // 移除重新整理回呼
    TranslationManager.prototype.offRefresh = function (callback) {
        var index = this._refreshCallbacks.indexOf(callback);
        if (index >= 0) {
            this._refreshCallbacks.splice(index, 1);
        }
    };

    // 建立全域實例
    window.TranslationManager = TranslationManager;
    window.$translationManager = new TranslationManager();

    // 在 DataManager 載入完成後初始化翻譯管理器
    var _DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        _DataManager_onLoad.call(this, object);

        if (object === $dataSystem) {
            // 系統資料載入完成後初始化翻譯管理器
            $translationManager.initialize();
        }
    };

    // 擴展 Scene_Base 來支援視窗重新整理
    var _Scene_Base_create = Scene_Base.prototype.create;
    Scene_Base.prototype.create = function () {
        _Scene_Base_create.call(this);
        this._refreshAllWindows = this._refreshAllWindows || function () {
            this.children.forEach(function (child) {
                if (child.refresh && typeof child.refresh === 'function') {
                    child.refresh();
                }
            });
        };
    };

    // 擴展 Window_Options 來支援語言選擇
    var _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function () {
        _Window_Options_makeCommandList.call(this);
        this.addLanguageOption();
    };

    Window_Options.prototype.addLanguageOption = function () {
        var languages = this.getAvailableLanguages();
        if (languages.length > 1) {
            this.addCommand('Language / 語言', 'language');
        }
    };

    Window_Options.prototype.getAvailableLanguages = function () {
        return $translationManager ? $translationManager.getAvailableLanguages() : ['zh'];
    };

    var _Window_Options_statusText = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function (index) {
        var symbol = this.commandSymbol(index);
        if (symbol === 'language') {
            return this.getCurrentLanguageName();
        }
        return _Window_Options_statusText.call(this, index);
    };

    Window_Options.prototype.getCurrentLanguageName = function () {
        var currentLang = $translationManager ? $translationManager.getCurrentLanguage() : 'zh';
        var langNames = {
            'zh': '中文',
            'en': 'English',
            'ja': '日本語',
            'ko': '한국어',
            'fr': 'Français',
            'de': 'Deutsch',
            'es': 'Español',
            'pt': 'Português',
            'ru': 'Русский'
        };
        return langNames[currentLang] || currentLang.toUpperCase();
    };

    Window_Options.prototype.processOk = function () {
        var index = this.index();
        var symbol = this.commandSymbol(index);
        if (symbol === 'language') {
            this.changeLanguage();
        } else {
            Window_Command.prototype.processOk.call(this);
        }
    };

    Window_Options.prototype.changeLanguage = function () {
        var languages = this.getAvailableLanguages();
        var currentLang = $translationManager ? $translationManager.getCurrentLanguage() : 'zh';
        var currentIndex = languages.indexOf(currentLang);
        var nextIndex = (currentIndex + 1) % languages.length;

        if ($translationManager) {
            $translationManager.setLanguage(languages[nextIndex]);
            ConfigManager.language = languages[nextIndex];
            this.redrawCurrentItem();
            SoundManager.playCursor();
        }
    };

    // 擴展 ConfigManager 來支援語言設定
    var _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        var config = _ConfigManager_makeData.call(this);
        config.language = this.language;
        return config;
    };

    var _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _ConfigManager_applyData.call(this, config);
        this.language = config.language || 'zh';
        if ($translationManager && this.language !== $translationManager.getCurrentLanguage()) {
            $translationManager.setLanguage(this.language);
        }
    };

    // 插件命令
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'SetLanguage' && args.length > 0 && $translationManager) {
            $translationManager.setLanguage(args[0]);
        }
    };

    // 建立全域實例並公開 API
    window.TranslationManager = TranslationManager;
    window.$translationManager = new TranslationManager();

    // 覆蓋 Game_Message 的 add 方法來支援翻譯
    var _Game_Message_add = Game_Message.prototype.add;
    Game_Message.prototype.add = function (text) {
        if (window.$translationManager && window.$translationManager._isInitialized) {
            text = window.$translationManager.translate(text);
        }
        _Game_Message_add.call(this, text);
    };

    // 覆蓋 Window_Message 的 startMessage 方法來支援多行翻譯
    var _Window_Message_startMessage = Window_Message.prototype.startMessage;
    Window_Message.prototype.startMessage = function () {
        _Window_Message_startMessage.call(this);

        // 如果翻譯系統已初始化，處理多行文字翻譯
        if (window.$translationManager && window.$translationManager._isInitialized) {
            var originalText = this._textState.text;

            // 首先嘗試翻譯完整的多行文字
            var fullTranslation = window.$translationManager.translate(originalText);

            // 如果完整翻譯成功，檢查是否包含換行符並正確處理
            if (fullTranslation !== originalText) {
                this._textState.text = fullTranslation;
            } else {
                // 如果完整翻譯失敗，嘗試按行翻譯（保持向後兼容）
                var translatedLines = [];
                var lines = originalText.split('\n');

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.trim()) { // 只翻譯非空行
                        var translatedLine = window.$translationManager.translate(line);
                        translatedLines.push(translatedLine !== line ? translatedLine : line);
                    } else {
                        translatedLines.push(line); // 保留空行
                    }
                }

                // 重新組合翻譯後的文字
                this._textState.text = translatedLines.join('\n');
            }
        }
    };

    // 為構造函數添加靜態方法
    TranslationManager.getStatus = function () {
        if (window.$translationManager) {
            return window.$translationManager.getStatus();
        }
        return null;
    };

    TranslationManager.setLanguage = function (language) {
        if (window.$translationManager) {
            return window.$translationManager.setLanguage(language);
        }
        return null;
    };

    TranslationManager.getCurrentLanguage = function () {
        if (window.$translationManager) {
            return window.$translationManager.getCurrentLanguage();
        }
        return null;
    };

    TranslationManager.getAvailableLanguages = function () {
        if (window.$translationManager) {
            return window.$translationManager.getAvailableLanguages();
        }
        return [];
    };

    // 為 DTextPicture 插件提供的方法
    TranslationManager.translateIfNeed = function (text, callback) {
        if (window.$translationManager && window.$translationManager._isInitialized) {
            var translatedText = window.$translationManager.translate(text);
            if (callback && typeof callback === 'function') {
                callback(translatedText);
            }
            return translatedText;
        } else {
            if (callback && typeof callback === 'function') {
                callback(text);
            }
            return text;
        }
    };

    // 立即初始化翻譯管理器（如果系統資料已載入）
    var initTranslationManager = function () {
        if (window.$translationManager && !$translationManager._isInitialized) {
            if ($dataSystem) {
                $translationManager.initialize();
            } else {
                // 在 DataManager 載入完成後初始化翻譯管理器
                var _DataManager_onLoad = DataManager.onLoad;
                DataManager.onLoad = function (object) {
                    _DataManager_onLoad.call(this, object);

                    if (object === $dataSystem) {
                        // 系統資料載入完成後初始化翻譯管理器
                        $translationManager.initialize();
                    }
                };
            }
        }
    };

    // 嘗試立即初始化
    initTranslationManager();

})();
