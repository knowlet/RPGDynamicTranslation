//=============================================================================
// 翻譯系統測試腳本
//=============================================================================

/*:
 * @plugindesc 測試翻譯系統功能
 * @help
 * 此腳本用於測試動態翻譯系統的功能。
 *
 * 使用方法：
 * 1. 將此腳本加入遊戲項目中
 * 2. 在遊戲中按 F12 開啟控制台
 * 3. 執行以下測試指令：
 *
 * TranslationManager.getStatus();          // 取得系統狀態
 * TranslationManager.setLanguage('zh');    // 切換到中文
 * TranslationManager.getCurrentLanguage(); // 取得當前語言
 * TranslationManager.getAvailableLanguages(); // 取得可用語言列表
 *
 * 或者使用插件命令：
 * SetLanguage zh
 *
 * 注意：TranslationManager 是構造函數，$translationManager 是實例
 *
 * ============================================================================
 */

(function() {
    'use strict';

    // 檢查翻譯系統狀態
    var checkTranslationSystem = function() {
        console.log('=== 翻譯系統狀態檢查 ===');

        if (typeof TranslationManager === 'undefined') {
            console.error('❌ TranslationManager 未定義 - 插件可能未正確載入');
            console.log('請確認 DynamicTranslation.js 插件已正確加入並啟用');
            return false;
        }

        if (typeof $translationManager === 'undefined') {
            console.error('❌ $translationManager 未定義 - 插件實例未正確創建');
            return false;
        }

        if (typeof TranslationManager.getStatus !== 'function') {
            console.error('❌ TranslationManager.getStatus 未定義 - 靜態方法未正確添加');
            return false;
        }

        var status = TranslationManager.getStatus();
        console.log('✅ 翻譯系統已載入');
        console.log('📊 系統狀態:', status);

        if (!status.isInitialized) {
            console.warn('⚠️ 翻譯系統尚未初始化，可能還在載入中...');
        }

        return true;
    };

    // 測試翻譯功能
    var testTranslations = function() {
        console.log('=== 翻譯功能測試 ===');

        if (!$translationManager._isInitialized) {
            console.log('翻譯系統尚未初始化，跳過測試');
            return;
        }

        // 測試基本文字翻譯
        var testTexts = [
            '等級', 'HP', 'MP', '攻擊', '防禦', '物品', '技能', '裝備', '儲存'
        ];

        console.log('基本文字翻譯測試:');
        testTexts.forEach(function(text) {
            var translated = $translationManager ? $translationManager.translate(text) : text;
            var status = translated !== text ? '✅' : '⚠️';
            console.log(status + ' ' + text + ' -> ' + translated);
        });

        // 測試訊息翻譯
        var messageTexts = [
            '要儲存這個檔案嗎？',
            '要載入這個檔案嗎？'
        ];

        console.log('訊息翻譯測試:');
        messageTexts.forEach(function(text) {
            var translated = $translationManager.translate(text);
            var status = translated !== text ? '✅' : '⚠️';
            console.log(status + ' ' + text + ' -> ' + translated);
        });

        console.log('=== 翻譯測試完成 ===');
    };

    // 切換語言測試
    var testLanguageSwitch = function() {
        console.log('=== 語言切換測試 ===');

        var languages = TranslationManager.getAvailableLanguages();
        console.log('可用語言:', languages);

        if (languages.length <= 1) {
            console.log('只有一種語言可用，無法測試切換');
            return;
        }

        var currentLang = TranslationManager.getCurrentLanguage();
        var nextIndex = (languages.indexOf(currentLang) + 1) % languages.length;
        var nextLang = languages[nextIndex];

        console.log('當前語言:', currentLang, '切換到:', nextLang);
        TranslationManager.setLanguage(nextLang);
        console.log('切換完成');
    };

    // 公開測試函數到全域
    window.testTranslationSystem = function() {
        console.log('🚀 開始翻譯系統測試...');

        var systemOk = checkTranslationSystem();
        if (!systemOk) {
            return '翻譯系統載入失敗，請檢查插件設定';
        }

        testTranslations();
        return '測試完成，請查看控制台輸出';
    };

    // 測試 TextManager 翻譯（這是最重要的測試）
    window.testTextManagerNow = function() {
        console.log('🔍 開始 TextManager 翻譯測試...');
        return testTextManager();
    };

    // 測試 Game_Message 翻譯
    window.testGameMessageTranslation = function() {
        console.log('=== Game_Message 翻譯測試 ===');
        if (typeof $gameMessage === 'undefined') {
            console.error('$gameMessage 未定義');
            return;
        }

        try {
            // 測試格式化文字
            var testTexts = [
                '測試訊息',
                '得到 %1 經驗值！',
                '戰鬥開始！'
            ];

            console.log('測試 Game_Message 翻譯:');
            testTexts.forEach(function(text, index) {
                var translated = $translationManager ? $translationManager.translate(text) : text;
                console.log('原始:', text, '翻譯:', translated);
            });

            // 測試實際的 $gameMessage.add
            console.log('測試 $gameMessage.add 翻譯:');
            $gameMessage.clear();
            $gameMessage.add('測試訊息');
            $gameMessage.add('得到 100 經驗值！');
            var allText = $gameMessage.allText();
            console.log('Game_Message 所有文字:', allText);

        } catch (e) {
            console.error('Game_Message 測試失敗:', e);
        }
        return 'Game_Message 翻譯測試完成';
    };

    // 檢查翻譯載入狀態
    window.checkTranslationLoading = function() {
        console.log('=== 翻譯載入狀態檢查 ===');
        console.log('翻譯系統初始化狀態:', TranslationManager.getStatus());

        if ($translationManager && $translationManager._translations) {
            console.log('載入的翻譯語言:', Object.keys($translationManager._translations));
            if ($translationManager._translations['zh']) {
                console.log('中文翻譯項目數量:', Object.keys($translationManager._translations['zh']).length);
                console.log('中文翻譯範例:', Object.keys($translationManager._translations['zh']).slice(0, 10));
            }
        }

        return '翻譯載入檢查完成';
    };

    // 強制刷新選項選單
    window.forceRefreshOptions = function() {
        console.log('🔄 強制刷新選項選單...');
        if (SceneManager._scene && SceneManager._scene._optionsWindow) {
            SceneManager._scene._optionsWindow.refresh();
            console.log('選項選單已刷新');
        } else {
            console.log('無法找到選項選單');
        }
        return '刷新完成';
    };

    // 檢查 TextManager 翻譯
    window.testTextManager = function() {
        console.log('=== TextManager 翻譯測試 ===');
        if (typeof TextManager === 'undefined') {
            console.error('TextManager 未定義');
            return;
        }

        try {
            // 檢查原始 $dataSystem.terms 的值
            console.log('原始 $dataSystem.terms 值:');
            if ($dataSystem && $dataSystem.terms) {
                console.log('basic[0]:', $dataSystem.terms.basic[0], '(索引 0)');
                console.log('basic[2]:', $dataSystem.terms.basic[2], '(索引 2)');
                console.log('commands[0]:', $dataSystem.terms.commands[0], '(指令索引 0)');
                console.log('messages[saveMessage]:', $dataSystem.terms.messages['saveMessage'], '(訊息 saveMessage)');

                // 檢查更多項目來確認
                console.log('commands[1]:', $dataSystem.terms.commands[1], '(指令索引 1)');
                console.log('commands[2]:', $dataSystem.terms.commands[2], '(指令索引 2)');
            }

            var testTexts = [
                TextManager.basic(0),  // 基本屬性 0
                TextManager.basic(2),  // 基本屬性 2
                TextManager.command(0), // 指令 0 (戰鬥)
                TextManager.message('saveMessage') // 訊息 saveMessage
            ];

            console.log('測試項目說明:');
            console.log('  basic(0): 基本屬性索引 0');
            console.log('  basic(2): 基本屬性索引 2');
            console.log('  command(0): 指令索引 0 (應該是 戦う/戰鬥)');
            console.log('  message(saveMessage): 訊息 saveMessage (應該是 save)');

            // 測試格式化文字
            console.log('測試格式化文字翻譯:');
            var formatTest = '得到 100 經驗值！';
            var translatedFormat = $translationManager ? $translationManager.translate(formatTest) : formatTest;
            console.log('格式化測試:', formatTest, '->', translatedFormat);

            console.log('當前 TextManager 輸出:');
            testTexts.forEach(function(text, index) {
                var expectedTranslations = [
                    '等級',  // basic(0) 應該翻譯為 "等級"
                    'HP',    // basic(2) 應該保持 "HP"
                    '戰鬥',  // command(0) 應該翻譯為 "戰鬥"
                    '要儲存這個檔案嗎？' // message(saveMessage) 應該翻譯為 "要儲存這個檔案嗎？"
                ];
                var status = text === expectedTranslations[index] ? '✅' : '❌';
                console.log('TextManager[' + index + ']:', text, status, '(預期:', expectedTranslations[index] + ')');
            });

            // 檢查翻譯系統狀態
            console.log('翻譯系統狀態:', TranslationManager.getStatus());

            // 檢查 TextManager 原始方法是否存在
            console.log('TextManager 原始方法檢查:');
            console.log('_originalBasic:', !!TextManager._originalBasic);
            console.log('_originalParam:', !!TextManager._originalParam);
            console.log('_originalCommand:', !!TextManager._originalCommand);
            console.log('_originalMessage:', !!TextManager._originalMessage);
        } catch (e) {
            console.error('TextManager 測試失敗:', e);
        }
        return 'TextManager 測試完成';
    };

    window.testLanguageSwitch = function() {
        console.log('🔄 開始語言切換測試...');
        testLanguageSwitch();
        return '語言切換測試完成';
    };

    // 自動檢查系統狀態
    console.log('翻譯系統載入檢查中...');
    setTimeout(function() {
        checkTranslationSystem();
    }, 500);

    console.log('💡 提示: 使用 testTranslationSystem() 進行完整測試');
    console.log('💡 提示: 使用 testLanguageSwitch() 測試語言切換');

    // 自動載入測試腳本（如果尚未載入）
    if (typeof window.testTranslationSystem === 'undefined') {
        console.log('🔧 測試腳本載入中...');
        // 測試腳本已經被包含了，所以不需要動態載入
    }

    // 提供載入指示
    console.log('💡 測試指令:');
    console.log('   testTextManager()        - 測試 TextManager 翻譯');
    console.log('   testTranslationSystem()  - 完整翻譯系統測試');
    console.log('   forceRefreshOptions()    - 強制刷新選項選單');
    console.log('   TranslationManager.getStatus() - 檢查系統狀態');

})();
