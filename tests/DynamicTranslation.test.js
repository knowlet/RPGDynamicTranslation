require('./setup');

describe('DynamicTranslation System', () => {
    beforeEach(() => {
        // Reset globals and re-load plugin for each test if needed
        // For simplicity, we assume the singleton pattern in the plugin handles re-initialization or we just test state changes
        // However, since it's an IIFE that runs once, we might need to manually reset the singleton if we want fresh state
        // But the plugin exposes window.$translationManager, so we can manipulate that.

        // Reload plugin to ensure fresh state
        // jest.resetModules(); // Not supported in Bun and not needed as we use eval

        global.loadPlugin();

        // Mock translation data
        const mockTranslations = {
            zh: {
                'Level': '等級',
                'HP': '生命值',
                'Attack': '攻擊力',
                'Save which file?': '要儲存哪個檔案？',
                '%1 found!': '發現了 %1！',
                '「"強制能力解除装置"。使いどころが大事ですよね。\n 並の戦闘員やロボットではこの装置なしではレミリアに傷一つ付けられませんが…」': '「强制能力解除装置」。使用时机很重要呢。\n 普通的战斗员或机器人如果没有这个装置，连在蕾米莉亚身上留下一道伤痕都做不到…」'
            },
            en: {
                'Level': 'Level',
                'HP': 'HP',
                'Attack': 'Attack'
            }
        };

        // Inject mock data into XMLHttpRequest prototype for our mock
        XMLHttpRequest.prototype.mockData = mockTranslations;
    });

    test('should initialize correctly', () => {
        expect(window.$translationManager).toBeDefined();
        expect(window.TranslationManager).toBeDefined();
    });

    test('should load language and translate text', (done) => {
        const tm = window.$translationManager;

        // Manually trigger load since we mocked it
        tm.loadLanguage('zh', (success) => {
            expect(success).toBe(true);
            tm.setLanguage('zh');

            expect(tm.translate('Level')).toBe('等級');
            expect(tm.translate('HP')).toBe('生命值');
            expect(tm.translate('Unknown')).toBe('Unknown'); // Fallback

            done();
        });
    });

    test('should handle formatting in translation', (done) => {
        const tm = window.$translationManager;
        tm.loadLanguage('zh', () => {
            tm.setLanguage('zh');
            // The plugin itself might not handle %1 replacement internally in translate(), 
            // it usually returns the format string and RPG Maker handles the replacement.
            // But let's verify it returns the translated format string.
            expect(tm.translate('%1 found!')).toBe('發現了 %1！');
            done();
        });
    });

    test('should switch languages', (done) => {
        const tm = window.$translationManager;

        tm.loadLanguage('zh', () => {
            tm.loadLanguage('en', () => {
                tm.setLanguage('zh');
                expect(tm.translate('Attack')).toBe('攻擊力');

                tm.setLanguage('en');
                expect(tm.translate('Attack')).toBe('Attack');

                done();
            });
        });
    });

    test('should integrate with TextManager', (done) => {
        const tm = window.$translationManager;
        tm.loadLanguage('zh', () => {
            tm.setLanguage('zh');

            // TextManager.basic(0) -> 'Level' -> '等級'
            expect(TextManager.basic(0)).toBe('等級');

            // TextManager.message('saveMessage') -> 'Save which file?' -> '要儲存哪個檔案？'
            expect(TextManager.message('saveMessage')).toBe('要儲存哪個檔案？');

            done();
        });
    });

    test('should handle missing keys gracefully', (done) => {
        const tm = window.$translationManager;
        tm.loadLanguage('zh', () => {
            tm.setLanguage('zh');
            expect(tm.translate('NonExistentKey')).toBe('NonExistentKey');
            done();
        });
    });

    test('should handle translations with newlines', (done) => {
        const tm = window.$translationManager;
        const originalText = '「"強制能力解除装置"。使いどころが大事ですよね。\n 並の戦闘員やロボットではこの装置なしではレミリアに傷一つ付けられませんが…」';
        const expectedText = '「强制能力解除装置」。使用时机很重要呢。\n 普通的战斗员或机器人如果没有这个装置，连在蕾米莉亚身上留下一道伤痕都做不到…」';

        tm.loadLanguage('zh', () => {
            tm.setLanguage('zh');
            expect(tm.translate(originalText)).toBe(expectedText);
            done();
        });
    });

    test('should extract substring translation in full mode', (done) => {
        // Enable full mode
        PluginManager.parameters = () => ({
            'Default Language': 'zh',
            'Translation Path': 'translations/',
            'Auto Detect Translations': 'false',
            'Translation Mode': 'full'
        });

        // Reload plugin to pick up new parameters
        global.loadPlugin();

        const tm = window.$translationManager;
        const fullOriginal = '「"強制能力解除装置"。使いどころが大事ですよね。\n 並の戦闘員やロボットではこの装置なしではレミリアに傷一つ付けられませんが…」';
        const fullTranslated = '「强制能力解除装置」。使用时机很重要呢。\n 普通的战斗员或机器人如果没有这个装置，连在蕾米莉亚身上留下一道伤痕都做不到…」';

        // Parts
        const part1 = '「"強制能力解除装置"。使いどころが大事ですよね。';
        const part2 = ' 並の戦闘員やロボットではこの装置なしではレミリアに傷一つ付けられませんが…」';

        const expectedPart1 = '「强制能力解除装置」。使用时机很重要呢。';
        const expectedPart2 = ' 普通的战斗员或机器人如果没有这个装置，连在蕾米莉亚身上留下一道伤痕都做不到…」';

        // Mock data with ONLY the full translation
        XMLHttpRequest.prototype.mockData = {
            zh: {
                [fullOriginal]: fullTranslated
            }
        };

        tm.loadLanguage('zh', () => {
            tm.setLanguage('zh');

            // Should extract from full translation
            expect(tm.translate(part1)).toBe(expectedPart1);
            expect(tm.translate(part2)).toBe(expectedPart2);
            done();
        });
    });
});

