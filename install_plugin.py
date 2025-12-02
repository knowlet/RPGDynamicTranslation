import sys
import os
import shutil
import json

PLUGIN_CONFIG = {
    "name": "DynamicTranslation",
    "status": True,
    "description": "動態翻譯系統 - 支援動態載入翻譯檔案並即時切換語言",
    "parameters": {
        "Default Language": "zh",
        "Translation Path": "translations/",
        "Auto Detect Translations": "true",
    },
}


def get_paths():
    arg_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    target_dir = os.path.abspath(arg_dir)
    if not os.path.isdir(target_dir):
        raise SystemExit(f"Invalid target directory: {target_dir}")

    # Check if is in RPG Maker project www directory
    www_dir = os.path.join(target_dir, "www")
    if not os.path.isdir(www_dir):
        raise SystemExit(f"Invalid target directory: {target_dir}")

    # Basic sanity: must contain js directory
    js_dir = os.path.join(www_dir, "js")
    if not os.path.isdir(js_dir):
        print(f"Warning: {js_dir} not found; continuing but some steps may be skipped.")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return target_dir, www_dir, script_dir


def copy_plugin_file(script_dir, target_dir):
    plugin_source = os.path.join(script_dir, "DynamicTranslation.js")
    plugin_dest_dir = os.path.join(target_dir, "js", "plugins")
    plugin_dest = os.path.join(plugin_dest_dir, "DynamicTranslation.js")

    if not os.path.exists(plugin_dest_dir):
        print(f"Error: plugins directory not found at {plugin_dest_dir}")
        print(
            "Make sure you are running this script in the root of an RPG Maker project."
        )
        sys.exit(1)

    print("Copying DynamicTranslation.js...")
    shutil.copy2(plugin_source, plugin_dest)
    print("Plugin copied successfully.")


def update_plugins_js(target_dir):
    plugins_js_path = os.path.join(target_dir, "js", "plugins.js")

    if not os.path.exists(plugins_js_path):
        print("Warning: js/plugins.js not found. Skipping registration.")
        return

    print("Updating plugins.js...")
    with open(plugins_js_path, "r", encoding="utf-8") as f:
        content = f.read()

    if '"name":"DynamicTranslation"' in content:
        print("DynamicTranslation is already in plugins.js. Skipping update.")
        return

    plugin_string = json.dumps(PLUGIN_CONFIG, ensure_ascii=False)

    # Find the last closing bracket
    last_bracket_index = content.rfind("]")
    if last_bracket_index == -1:
        print("Error: Could not parse plugins.js (could not find closing bracket).")
        return

    before_bracket = content[:last_bracket_index].rstrip()
    after_bracket = content[last_bracket_index:]

    # Check if we need a comma: if before_bracket not empty and last char != '['
    needs_comma = bool(before_bracket) and before_bracket[-1] != "["
    prefix = ", " if needs_comma else ""

    new_content = f"{before_bracket}\n{prefix}{plugin_string}\n{after_bracket}"

    with open(plugins_js_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("plugins.js updated successfully.")


def install_translation(target_dir):
    translations_dir = os.path.join(target_dir, "www", "translations")
    print("Searching for translation files...")

    if not os.path.exists(translations_dir):
        os.makedirs(translations_dir, exist_ok=True)

    files = os.listdir(target_dir)
    for file in files:
        if not file.endswith(".json") or file in ["package.json", "package-lock.json"]:
            continue

        file_path = os.path.join(target_dir, file)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        except OSError as e:
            print(f"Warning: failed to read {file_path}: {e}")
            continue

        # Smoke test: check if it's a dict with at least one string value
        if (
            isinstance(data, dict)
            and data
            and any(isinstance(v, str) for v in data.values())
        ):
            print(f"Found potential translation file: {file}")

            dest_path = os.path.join(translations_dir, "zh.json")
            shutil.copy2(file_path, dest_path)
            print(f"Installed {file} to translations/zh.json")
            return True

    print("No suitable translation file found in root directory.")
    return False


def main():
    target_dir, www_dir, script_dir = get_paths()
    print(f"Target directory: {target_dir}")

    copy_plugin_file(script_dir, www_dir)
    update_plugins_js(www_dir)
    install_translation(target_dir)

    print("Installation complete!")


if __name__ == "__main__":
    main()
