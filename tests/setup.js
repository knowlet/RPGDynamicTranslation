const fs = require('fs');
const path = require('path');

// Mock Browser Environment
global.window = global;
global.XMLHttpRequest = class XMLHttpRequest {
    open(method, url) {
        this.url = url;
        this.method = method;
    }
    overrideMimeType() { }
    send() {
        // Simulate file loading from local filesystem for tests
        // The url will be something like 'translations/zh.json'
        // We need to map this to the actual file path if it exists, or mock the response

        if (this.url.startsWith('translations/')) {
            const lang = path.basename(this.url, '.json');
            if (this.mockData && this.mockData[lang]) {
                this.status = 200;
                this.responseText = JSON.stringify(this.mockData[lang]);
                if (this.onload) this.onload();
                return;
            }
        }

        this.status = 404;
        if (this.onerror) this.onerror();
        else if (this.onload) this.onload();
    }
};

// Mock RPG Maker Globals
global.PluginManager = {
    parameters: () => ({
        'Default Language': 'zh',
        'Translation Path': 'translations/',
        'Auto Detect Translations': 'false', // Default to false for easier testing control
        'Translation Mode': 'simple'
    })
};

global.$dataSystem = {
    terms: {
        basic: ['Level', 'HP', 'MP'],
        params: ['Attack', 'Defense'],
        commands: ['Fight', 'Escape'],
        messages: {
            saveMessage: 'Save which file?'
        }
    },
    currencyUnit: 'G'
};

global.TextManager = {
    basic: (id) => global.$dataSystem.terms.basic[id],
    param: (id) => global.$dataSystem.terms.params[id],
    command: (id) => global.$dataSystem.terms.commands[id],
    message: (id) => global.$dataSystem.terms.messages[id],
    getter: (method, param) => ({ get: () => 'MockGetterValue' })
};

global.SceneManager = {
    _scene: {
        _refreshAllWindows: jest.fn()
    }
};

global.ConfigManager = {
    makeData: () => ({}),
    applyData: () => { },
    language: 'zh'
};

global.Game_Interpreter = class {
    pluginCommand() { }
};

global.Game_Message = class {
    add(text) { this._texts = this._texts || []; this._texts.push(text); }
};

global.Window_Message = class {
    startMessage() { }
};

global.Window_Options = class {
    makeCommandList() { }
    addCommand() { }
    statusText() { }
    processOk() { }
    redrawCurrentItem() { }
    index() { return 0; }
    commandSymbol() { return 'language'; }
};

global.SoundManager = {
    playCursor: jest.fn()
};

global.DataManager = {
    onLoad: function (object) { }
};

global.Scene_Base = class {
    create() { }
};

global.Window_Command = class {
    processOk() { }
};

// Helper to load the plugin
global.loadPlugin = () => {
    const pluginPath = path.resolve(__dirname, '../DynamicTranslation.js');
    const pluginContent = fs.readFileSync(pluginPath, 'utf8');
    eval(pluginContent);
};
