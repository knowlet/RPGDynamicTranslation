require('./setup');

describe('asynchronous language selection', () => {
    let tm;
    let pending;

    beforeAll(() => global.loadPlugin());
    beforeEach(() => {
        tm = new window.TranslationManager();
        tm._isInitialized = true;
        tm._translations.zh = { Level: '等級' };
        tm._applyTranslations = jest.fn();
        tm._refreshAllWindows = jest.fn();
        pending = [];
        jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function () {
            pending.push(this);
        });
    });
    afterEach(() => jest.restoreAllMocks());

    function complete(index, success = true) {
        const xhr = pending[index];
        xhr.status = success ? 200 : 404;
        xhr.responseText = JSON.stringify({ Level: xhr.url });
        xhr.onload();
    }

    test('the latest uncached selection wins even when responses arrive backwards', () => {
        tm.setLanguage('en');
        tm.setLanguage('ja');
        complete(1);
        complete(0);
        expect(tm.getCurrentLanguage()).toBe('ja');
        expect(tm.translate('Level')).toBe('translations/ja.json');
        expect(tm._refreshAllWindows).toHaveBeenCalledTimes(1);
        expect(tm._translations.en).toBeDefined();
    });

    test('an older completion does not temporarily apply while the latest is pending', () => {
        tm.setLanguage('en');
        tm.setLanguage('ja');
        complete(0);
        expect(tm.getCurrentLanguage()).toBe('zh');
        expect(tm._applyTranslations).not.toHaveBeenCalled();
        complete(1);
        expect(tm.getCurrentLanguage()).toBe('ja');
    });

    test('selecting the current language cancels an outstanding selection', () => {
        tm.setLanguage('en');
        tm.setLanguage('zh');
        complete(0);
        expect(tm.getCurrentLanguage()).toBe('zh');
        expect(tm._refreshAllWindows).not.toHaveBeenCalled();
    });

    test('a cached selection supersedes an outstanding load', () => {
        tm._translations.ja = { Level: 'レベル' };
        tm.setLanguage('en');
        tm.setLanguage('ja');
        complete(0);
        expect(tm.getCurrentLanguage()).toBe('ja');
        expect(tm.translate('Level')).toBe('レベル');
        expect(tm._refreshAllWindows).toHaveBeenCalledTimes(1);
    });

    test('a failed latest selection preserves the active language, not an older request', () => {
        tm.setLanguage('en');
        tm.setLanguage('ja');
        complete(1, false);
        complete(0);
        expect(tm.getCurrentLanguage()).toBe('zh');
        expect(tm._refreshAllWindows).not.toHaveBeenCalled();
    });

    test('a single successful selection still applies and refreshes', () => {
        tm.setLanguage('en');
        complete(0);
        expect(tm.getCurrentLanguage()).toBe('en');
        expect(tm._applyTranslations).toHaveBeenCalledTimes(1);
        expect(tm._refreshAllWindows).toHaveBeenCalledTimes(1);
    });

    test('a failed selection can be retried', () => {
        tm.setLanguage('en');
        complete(0, false);
        tm.setLanguage('en');
        complete(1);
        expect(tm.getCurrentLanguage()).toBe('en');
        expect(tm._refreshAllWindows).toHaveBeenCalledTimes(1);
    });
});
