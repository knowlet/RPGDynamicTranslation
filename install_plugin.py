import sys
import os
import shutil
import json
from pathlib import Path

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
    # Use pathlib.Path for better unicode path handling
    if len(sys.argv) > 1:
        arg_dir = sys.argv[1]
        # Ensure proper unicode handling - pathlib handles this better than os.path
        target_path = Path(arg_dir).resolve()
    else:
        target_path = Path.cwd().resolve()
    
    if not target_path.is_dir():
        raise SystemExit(f"Invalid target directory: {target_path}")

    # Check for RPG Maker project structure
    # Support both traditional (project/www/js/) and exported/flat (project/js/) structures
    www_path = target_path / "www"
    js_path_in_www = www_path / "js"
    js_path_direct = target_path / "js"
    plugins_path_in_www = js_path_in_www / "plugins"
    plugins_path_direct = js_path_direct / "plugins"
    
    if www_path.is_dir() and js_path_in_www.is_dir():
        # Traditional structure: project/www/js/
        www_dir = www_path
        js_path = js_path_in_www
    elif js_path_direct.is_dir():
        # Exported/flat structure: project/js/ (no www subdirectory)
        # Even without www, if js/plugins exists, we can install
        # Treat the project root as the "www" equivalent
        www_dir = target_path
        js_path = js_path_direct
        if plugins_path_direct.is_dir():
            print("Note: Detected exported/flat RPG Maker project structure (no www subdirectory)")
        else:
            print("Note: Detected exported/flat RPG Maker project structure (no www subdirectory)")
            print(f"Warning: plugins directory not found at {plugins_path_direct}")
    else:
        # Neither structure found
        raise SystemExit(
            f"Invalid target directory: {target_path}\n"
            "Expected RPG Maker project with either:\n"
            "  - Traditional structure: project/www/js/\n"
            "  - Exported structure: project/js/ (with or without plugins subdirectory)"
        )

    script_path = Path(__file__).resolve().parent
    
    # Return as strings for backward compatibility with rest of code
    return str(target_path), str(www_dir), str(script_path)


def copy_plugin_file(script_dir, target_dir):
    plugin_source = os.path.join(script_dir, "DynamicTranslation.js")
    plugin_dest_dir = os.path.join(target_dir, "js", "plugins")
    plugin_dest = os.path.join(plugin_dest_dir, "DynamicTranslation.js")

    # Create plugins directory if it doesn't exist
    if not os.path.exists(plugin_dest_dir):
        print(f"Creating plugins directory at {plugin_dest_dir}...")
        os.makedirs(plugin_dest_dir, exist_ok=True)

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


def install_translation(target_dir, www_dir):
    # translations folder should be relative to where HTML file is located
    # For traditional structure: www/translations/ (HTML is in www/)
    # For exported structure: translations/ (HTML is in project root, www_dir == target_dir)
    translations_dir = os.path.join(www_dir, "translations")
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
    install_translation(target_dir, www_dir)

    print("Installation complete!")


if __name__ == "__main__":
    main()
