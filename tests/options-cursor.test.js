describe('Window_Options cursor dispatch', () => {
    let originals;

    beforeEach(() => {
        jest.resetModules();
        require('./setup');
        global.$dataSystem = null;
        originals = {};
        for (const [method, booleanValue, delta] of [
            ['cursorRight', true, 20], ['cursorLeft', false, -20]
        ]) {
            // RPG Maker MV's non-volume arrow handler writes a boolean option.
            originals[method] = jest.fn(function (...args) {
                const symbol = this.commandSymbol(this.index());
                ConfigManager[symbol] = symbol.endsWith('Volume')
                    ? Math.max(0, Math.min(100, ConfigManager[symbol] + delta))
                    : booleanValue;
                return args[0];
            });
            Window_Options.prototype[method] = originals[method];
        }
        loadPlugin();
    });

    test.each(['cursorRight', 'cursorLeft'])('%s preserves language strings and existing cycle order', method => {
        const window = new Window_Options();
        $translationManager._availableLanguages = ['zh', 'en', 'ja'];
        $translationManager._currentLanguage = 'en';
        $translationManager.setLanguage = jest.fn(language => {
            $translationManager._currentLanguage = language;
        });
        ConfigManager.language = 'en';
        window.redrawCurrentItem = jest.fn();

        for (const expected of ['ja', 'zh', 'en']) {
            window[method](false);
            expect(ConfigManager.makeData().language).toBe(expected);
            expect($translationManager.getCurrentLanguage()).toBe(expected);
        }
        expect(window.redrawCurrentItem).toHaveBeenCalledTimes(3);
        expect(SoundManager.playCursor).toHaveBeenCalledTimes(3);
        expect(originals[method]).not.toHaveBeenCalled();
    });

    test.each(['cursorRight', 'cursorLeft'])('%s preserves other handlers, arguments and return', method => {
        const window = new Window_Options();
        const marker = {};
        window.commandSymbol = jest.fn(() => 'alwaysDash');
        ConfigManager.alwaysDash = method === 'cursorLeft';
        expect(window[method](marker, 'extra')).toBe(marker);
        expect(ConfigManager.alwaysDash).toBe(method === 'cursorRight');
        window.commandSymbol = jest.fn(() => 'bgmVolume');
        ConfigManager.bgmVolume = method === 'cursorRight' ? 90 : 10;
        window[method](false);
        expect(ConfigManager.bgmVolume).toBe(method === 'cursorRight' ? 100 : 0);
        expect(originals[method].mock.contexts).toEqual([window, window]);
        expect(originals[method]).toHaveBeenNthCalledWith(1, marker, 'extra');
        expect(originals[method]).toHaveBeenNthCalledWith(2, false);
    });
});
