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
                '%1 found!': '發現了 %1！'
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
});
