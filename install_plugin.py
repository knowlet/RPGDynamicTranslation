import os
import sys
import shutil
import json

def install_plugin():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    plugin_source = os.path.join(script_dir, 'DynamicTranslation.js')
    plugin_dest_dir = os.path.join(target_dir, 'js', 'plugins')
    plugin_dest = os.path.join(plugin_dest_dir, 'DynamicTranslation.js')
    plugins_js_path = os.path.join(target_dir, 'js', 'plugins.js')
    translations_dir = os.path.join(target_dir, 'translations')

    print(f"Target directory: {target_dir}")

    # 1. Copy Plugin
    if not os.path.exists(plugin_dest_dir):
        print(f"Error: plugins directory not found at {plugin_dest_dir}")
        print("Make sure you are running this script in the root of an RPG Maker project.")
        sys.exit(1)

    print("Copying DynamicTranslation.js...")
    shutil.copy2(plugin_source, plugin_dest)
    print("Plugin copied successfully.")

    # 2. Update plugins.js
    if os.path.exists(plugins_js_path):
        print("Updating plugins.js...")
        with open(plugins_js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if '"name":"DynamicTranslation"' in content:
            print("DynamicTranslation is already in plugins.js. Skipping update.")
        else:
            plugin_config = {
                "name": "DynamicTranslation",
                "status": True,
                "description": "動態翻譯系統 - 支援動態載入翻譯檔案並即時切換語言",
                "parameters": {
                    "Default Language": "zh",
                    "Translation Path": "translations/",
                    "Auto Detect Translations": "true"
                }
            }
            
            plugin_string = json.dumps(plugin_config, ensure_ascii=False)
            
            # Find the last closing bracket
            last_bracket_index = content.rfind(']')
            if last_bracket_index != -1:
                before_bracket = content[:last_bracket_index]
                after_bracket = content[last_bracket_index:]
                
                # Check if we need a comma
                last_curly = before_bracket.rfind('}')
                prefix = ',' if last_curly != -1 else ''
                
                new_content = before_bracket + prefix + '\n' + plugin_string + '\n' + after_bracket
                
                with open(plugins_js_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print("plugins.js updated successfully.")
            else:
                print("Error: Could not parse plugins.js (could not find closing bracket).")
    else:
        print("Warning: js/plugins.js not found. Skipping registration.")

    # 3. Find and Install Translation File
    print("Searching for translation files...")

    if not os.path.exists(translations_dir):
        os.makedirs(translations_dir, exist_ok=True)

    files = os.listdir(target_dir)
    translation_found = False

    for file in files:
        if file.endswith('.json') and file not in ['package.json', 'package-lock.json']:
            file_path = os.path.join(target_dir, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    data = json.loads(content)
                
                # Smoke test
                if isinstance(data, dict) and data:
                    string_values = [k for k, v in data.items() if isinstance(v, str)]
                    if string_values:
                        print(f"Found potential translation file: {file}")
                        
                        dest_path = os.path.join(translations_dir, 'zh.json')
                        shutil.copy2(file_path, dest_path)
                        print(f"Installed {file} to translations/zh.json")
                        translation_found = True
                        break
            except Exception:
                pass

    if not translation_found:
        print("No suitable translation file found in root directory.")

    print("Installation complete!")

if __name__ == "__main__":
    install_plugin()
