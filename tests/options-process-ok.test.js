describe('Window_Options confirmation dispatch', () => {
    let originalProcessOk;
    let baseProcessOk;

    beforeEach(() => {
        jest.resetModules();
        require('./setup');
        // Skip language-file loading. These tests only exercise option dispatch.
        global.$dataSystem = null;
        originalProcessOk = jest.fn(function (...args) {
            const symbol = this.commandSymbol(this.index());
            const value = this.values[symbol];
            if (symbol.endsWith('Volume')) {
                this.values[symbol] = value >= 100 ? 0 : Math.min(value + 20, 100);
            } else {
                this.values[symbol] = !value;
            }
            return args[0];
        });
        baseProcessOk = jest.fn();
        Window_Options.prototype.processOk = originalProcessOk;
        Window_Command.prototype.processOk = baseProcessOk;
        loadPlugin();
    });

    function options(symbol, value) {
        const window = new Window_Options();
        window.commandSymbol = jest.fn(() => symbol);
        window.values = { [symbol]: value };
        return window;
    }

    test('keeps the existing boolean option handler and receiver', () => {
        const window = options('alwaysDash', false);

        window.processOk();
        expect(window.values.alwaysDash).toBe(true);
        window.processOk();
        expect(window.values.alwaysDash).toBe(false);
        expect(originalProcessOk).toHaveBeenCalledTimes(2);
        expect(originalProcessOk.mock.contexts).toEqual([window, window]);
        expect(baseProcessOk).not.toHaveBeenCalled();
    });

    test('keeps volume adjustment and wraparound', () => {
        const window = options('bgmVolume', 80);

        window.processOk();
        expect(window.values.bgmVolume).toBe(100);
        window.processOk();
        expect(window.values.bgmVolume).toBe(0);
        expect(originalProcessOk).toHaveBeenCalledTimes(2);
        expect(baseProcessOk).not.toHaveBeenCalled();
    });

    test('preserves arguments and return value for an earlier plugin handler', () => {
        const window = options('customOption', false);
        const marker = {};

        expect(window.processOk(marker, 'extra')).toBe(marker);
        expect(originalProcessOk).toHaveBeenCalledWith(marker, 'extra');
        expect(baseProcessOk).not.toHaveBeenCalled();
    });

    test('still cycles language without invoking either inherited handler', () => {
        const window = options('language', 'zh');
        $translationManager._availableLanguages = ['zh', 'en'];
        $translationManager.setLanguage = jest.fn();
        window.redrawCurrentItem = jest.fn();

        window.processOk();

        expect($translationManager.setLanguage).toHaveBeenCalledWith('en');
        expect(ConfigManager.language).toBe('en');
        expect(window.redrawCurrentItem).toHaveBeenCalledTimes(1);
        expect(SoundManager.playCursor).toHaveBeenCalledTimes(1);
        expect(originalProcessOk).not.toHaveBeenCalled();
        expect(baseProcessOk).not.toHaveBeenCalled();
    });
});
