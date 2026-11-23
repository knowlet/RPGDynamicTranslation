require('./setup');

describe('translation file schema', () => {
    beforeEach(() => {
        global.loadPlugin();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    function load(value) {
        jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function () {
            this.status = 200;
            this.responseText = JSON.stringify(value);
            this.onload();
        });
        const callback = jest.fn();
        window.$translationManager.loadLanguage('zh', callback);
        return callback;
    }

    test.each([
        ['null', null], ['array', ['translated']], ['string', 'translated'],
        ['number', 42], ['boolean', true],
        ['null entry', { Level: null }], ['number entry', { Level: 42 }],
        ['array entry', { Level: [] }], ['object entry', { Level: {} }],
        ['boolean entry', { Level: false }],
    ])('rejects %s without replacing a usable dictionary', (_name, value) => {
        const manager = window.$translationManager;
        const previous = { Level: '等級' };
        manager._translations.zh = previous;
        manager._currentLanguage = 'zh';
        manager._isInitialized = true;
        const callback = load(value);
        expect(callback.mock.calls).toEqual([[false]]);
        expect(manager._translations.zh).toBe(previous);
        expect(manager.translate('Level')).toBe('等級');
    });

    test.each([{}, { Level: '等級', Empty: '', hasOwnProperty: 'literal key' }])(
        'accepts string dictionaries including empty values', value => {
            const callback = load(value);
            expect(callback.mock.calls).toEqual([[true]]);
            expect(window.$translationManager._translations.zh).toEqual(value);
        }
    );
});
