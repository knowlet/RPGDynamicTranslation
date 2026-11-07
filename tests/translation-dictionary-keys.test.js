require('./setup');

describe('Translation dictionary property names', () => {
    let tm;
    let originalSend;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(Math, 'random').mockReturnValue(0);
        originalSend = XMLHttpRequest.prototype.send;
        global.loadPlugin();
        tm = new window.TranslationManager();
        tm._isInitialized = true;
    });

    afterEach(() => {
        XMLHttpRequest.prototype.send = originalSend;
        jest.restoreAllMocks();
    });

    function loadDictionary(json) {
        XMLHttpRequest.prototype.send = function () {
            this.status = 200;
            this.responseText = json;
            this.onload();
        };
        const loaded = jest.fn();
        tm.loadLanguage('zh', loaded);
        expect(loaded).toHaveBeenCalledTimes(1);
        expect(loaded).toHaveBeenCalledWith(true);
    }

    const inheritedNames = ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'];

    test.each(inheritedNames)('missing %s stays untranslated', (name) => {
        loadDictionary('{"Hello":"你好"}');
        expect(tm.translate(name)).toBe(name);
    });

    test.each(inheritedNames)('missing trimmed %s preserves the original whitespace', (name) => {
        loadDictionary('{"Hello":"你好"}');
        const original = '  ' + name + '  ';
        expect(tm.translate(original)).toBe(original);
    });

    test.each(inheritedNames)('an explicitly translated %s remains usable', (name) => {
        loadDictionary('{"' + name + '":"明確翻譯"}');
        expect(tm.translate(name)).toBe('明確翻譯');
        expect(tm.translate('  ' + name + '  ')).toBe('明確翻譯');
    });

    test('full mode accepts a hasOwnProperty translation while matching substrings', () => {
        loadDictionary('{"hasOwnProperty":"擁有屬性","Hello\\nWorld":"你好\\n世界"}');
        tm._enableSubstringExtraction = true;
        expect(tm.translate('World')).toBe('世界');
        expect(tm.translate('Unknown')).toBe('Unknown');
    });

    test.each(inheritedNames)('full mode does not return the inherited %s value', (name) => {
        loadDictionary('{"Hello\\nWorld":"你好\\n世界"}');
        tm._enableSubstringExtraction = true;
        expect(tm.translate(name)).toBe(name);
    });

    test('full mode can find a substring in an explicit prototype-named key', () => {
        loadDictionary('{"hasOwnProperty":"擁有屬性","constructor":"建構函式"}');
        tm._enableSubstringExtraction = true;
        const extract = jest.spyOn(tm, '_extractCorrespondingTranslation').mockReturnValue('部分翻譯');
        expect(tm.translate('struct')).toBe('部分翻譯');
        expect(extract).toHaveBeenCalledWith('struct', 'constructor', '建構函式', 3);
    });

    test('own empty strings and ordinary exact or trimmed translations are preserved', () => {
        loadDictionary('{"Silent":"","Hello":"你好"}');
        expect(tm.translate('Silent')).toBe('');
        expect(tm.translate('Hello')).toBe('你好');
        expect(tm.translate('  Hello  ')).toBe('你好');
    });

    test('non-enumerable inherited entries are not treated as translations', () => {
        loadDictionary('{"Hello":"你好"}');
        const prototype = Object.create(null);
        Object.defineProperty(prototype, 'Inherited', { value: '不應使用' });
        Object.setPrototypeOf(tm._translations.zh, prototype);
        expect(tm.translate('Inherited')).toBe('Inherited');
        expect(tm.translate('  Inherited  ')).toBe('  Inherited  ');
        expect(tm.translate('Hello')).toBe('你好');
    });

    test('enumerable inherited entries are ignored by full mode', () => {
        loadDictionary('{"Hello":"你好"}');
        Object.setPrototypeOf(tm._translations.zh, { 'Inherited text': '不應使用' });
        tm._enableSubstringExtraction = true;
        expect(tm.translate('Inherited')).toBe('Inherited');
    });
});
