import sys
import os
import shutil
import json
import re
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

# ECMA-262 LineTerminator is LF, CR, U+2028 LINE SEPARATOR, and U+2029
# PARAGRAPH SEPARATOR. JSON leaves the last two unescaped, but in JavaScript
# source they end // comments and physical lines, and they are illegal inside
# string literals before ES2019.
_JS_NOT_LINE_TERMINATOR = "[^\n\r\u2028\u2029]"
_JS_LINE_TERMINATOR = "(?:\r\n|[\n\r\u2028\u2029])"
# ECMA-262 WhiteSpace (TAB, VT, FF, ZWNBSP and every Zs space) plus
# LineTerminator. Python's \s is wider: it also accepts U+001C-U+001F and
# U+0085, which JavaScript rejects between tokens.
_JS_SPACE = (
    "[\t\v\f \u00a0\ufeff\u1680\u2000-\u200a\u202f\u205f\u3000"
    "\n\r\u2028\u2029]"
)
_JS_TRIVIA = (
    "(?:"
    + _JS_SPACE + "+"
    "|//" + _JS_NOT_LINE_TERMINATOR + "*(?:" + _JS_LINE_TERMINATOR + "|$)"
    r"|/\*.*?\*/"
    ")*"
)


def _reject_non_json_constant(name):
    """Refuse NaN/Infinity, which Python's decoder accepts but JSON forbids."""
    raise ValueError(f"{name} is not a JSON value")


def _embed_json_in_javascript(value):
    """Serialize value as JSON that can be embedded in JavaScript source.

    json.dumps does not escape U+2028 or U+2029. Escape both wherever a
    JavaScript string literal is emitted so they cannot act as line terminators.
    """
    text = json.dumps(value, ensure_ascii=False)
    return text.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


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
    with open(plugins_js_path, "r", encoding="utf-8", newline="") as f:
        content = f.read()

    # RPG Maker emits a JSON array after an assignment and optional comments.
    # Parse that array, not brackets or name-like text in comments/parameters.
    # // comments end at every JavaScript line terminator, including U+2028/U+2029.
    prefix_match = re.match(
        r'\A\ufeff?' + _JS_TRIVIA +
        r'((?:var|let|const)' + _JS_SPACE + r'+\$plugins' + _JS_SPACE + r'*=' + _JS_SPACE + r'*)?',
        content,
        re.DOTALL,
    )
    array_start = prefix_match.end()
    assigned = prefix_match.group(1) is not None
    try:
        if content[array_start:array_start + 1] != "[":
            raise ValueError("expected a JSON plugin array")
        plugins, array_end = json.JSONDecoder(
            parse_constant=_reject_non_json_constant
        ).raw_decode(content, array_start)
        if not all(isinstance(plugin, dict) for plugin in plugins):
            raise ValueError("plugin entries must be objects")
        # After an explicit "$plugins =" assignment the array must end that
        # statement. A bare array must be the only statement: otherwise a
        # discarded leading array (e.g. "[]; var $plugins = [];") would be
        # taken for the plugin list while the real assignment stays empty.
        suffix = content[array_end:]
        rest = suffix[re.match(_JS_TRIVIA, suffix, re.DOTALL).end():]
        if rest and not rest.startswith(";"):
            raise ValueError("expected the JSON array to end the assignment")
        if not assigned and rest:
            rest = rest[1:]
            if rest[re.match(_JS_TRIVIA, rest, re.DOTALL).end():]:
                raise ValueError("expected the bare JSON plugin array to be the only statement")
    except (ValueError, RecursionError) as error:
        print(f"Error: Could not parse plugins.js ({error}). File left unchanged.")
        return False

    if any(plugin.get("name") == "DynamicTranslation" for plugin in plugins):
        print("DynamicTranslation is already in plugins.js. Skipping update.")
        return

    plugin_string = _embed_json_in_javascript(PLUGIN_CONFIG)

    # Keep the file's own line ending and the whitespace that preceded the
    # closing bracket, so a CRLF file stays byte-for-byte CRLF.
    newline = "\r\n" if "\r\n" in content else "\r" if "\r" in content else "\n"
    inner = content[:array_end - 1]
    before_bracket = inner.rstrip(" \t\r\n")
    closing_space = inner[len(before_bracket):] or newline
    after_bracket = content[array_end - 1:]
    separator = "," if plugins else ""

    new_content = (
        f"{before_bracket}{separator}{newline}{plugin_string}"
        f"{closing_space}{after_bracket}"
    )

    with open(plugins_js_path, "w", encoding="utf-8", newline="") as f:
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
    if update_plugins_js(www_dir) is False:
        raise SystemExit(
            "Registration failed; plugins.js was not changed. "
            "Use RPG Maker's Plugin Manager for manual registration."
        )
    install_translation(target_dir, www_dir)

    print("Installation complete!")


if __name__ == "__main__":
    main()
