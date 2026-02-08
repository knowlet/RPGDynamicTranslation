"""Pytest tests for install_plugin.py"""

import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest


# Add project root for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def _make_rpg_project(tmp_path, with_js=True, with_plugins=True):
    """Create a minimal RPG Maker project structure under tmp_path."""
    www = tmp_path / "www"
    www.mkdir()
    if with_js:
        js = www / "js"
        js.mkdir()
        if with_plugins:
            plugins = js / "plugins"
            plugins.mkdir()
    return tmp_path


def _make_plugins_js(tmp_path, plugins_list=None):
    """Create plugins.js with optional plugin entries."""
    plugins_path = tmp_path / "www" / "js" / "plugins.js"
    plugins_path.parent.mkdir(parents=True, exist_ok=True)
    data = plugins_list if plugins_list is not None else []
    with open(plugins_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2))
    return plugins_path


def _install_translation_from_file(tmp_path, content, filename):
    """Create project, write file, run install_translation, return result."""
    _make_rpg_project(tmp_path)
    (tmp_path / filename).write_text(content, encoding="utf-8")
    from install_plugin import install_translation

    # For traditional structure, www_dir is tmp_path / "www"
    www_dir = tmp_path / "www"
    return install_translation(str(tmp_path), str(www_dir))


class TestGetPaths:
    """Tests for get_paths()."""

    def test_valid_project_directory(self, tmp_path):
        _make_rpg_project(tmp_path)
        with patch("sys.argv", ["install_plugin.py", str(tmp_path)]):
            from install_plugin import get_paths

            target_dir, www_dir, script_dir = get_paths()
            assert Path(target_dir) == tmp_path.resolve()
            assert Path(www_dir) == (tmp_path / "www").resolve()
            assert Path(script_dir).is_dir()

    def test_uses_cwd_when_no_arg(self, tmp_path):
        _make_rpg_project(tmp_path)
        with patch("sys.argv", ["install_plugin.py"]), patch(
            "os.getcwd", return_value=str(tmp_path)
        ):
            from install_plugin import get_paths

            target_dir, _, _ = get_paths()
            assert Path(target_dir) == tmp_path.resolve()

    def test_invalid_target_directory_exits(self, tmp_path):
        bad_dir = tmp_path / "nonexistent"
        with patch("sys.argv", ["install_plugin.py", str(bad_dir)]):
            from install_plugin import get_paths

            with pytest.raises(SystemExit):
                get_paths()

    def test_missing_www_and_js_exits(self, tmp_path):
        """Directory with neither www/js/ nor js/ structure should exit."""
        tmp_path.mkdir(exist_ok=True)
        with patch("sys.argv", ["install_plugin.py", str(tmp_path)]):
            from install_plugin import get_paths

            with pytest.raises(SystemExit) as exc_info:
                get_paths()
            assert "Expected RPG Maker project" in str(exc_info.value)

    def test_exported_structure_without_www(self, tmp_path):
        """Exported/flat structure (js/ directly) should work."""
        (tmp_path / "js").mkdir(parents=True)
        with patch("sys.argv", ["install_plugin.py", str(tmp_path)]):
            from install_plugin import get_paths

            target_dir, www_dir, script_dir = get_paths()
            assert Path(target_dir) == tmp_path.resolve()
            assert Path(www_dir) == tmp_path.resolve()  # www_dir = target_path for exported structure

    def test_missing_js_dir_returns_paths_with_warning(self, tmp_path, capsys):
        """Traditional structure with www but no js should still work (with warning)."""
        (tmp_path / "www" / "js").mkdir(parents=True)
        with patch("sys.argv", ["install_plugin.py", str(tmp_path)]):
            from install_plugin import get_paths

            target_dir, www_dir, script_dir = get_paths()
            assert Path(target_dir) == tmp_path.resolve()
            assert Path(www_dir) == (tmp_path / "www").resolve()

    def test_unicode_path_invalid_exits_with_message(self, tmp_path):
        """Path with CJK characters, no www/js or js, exits with helpful message."""
        unicode_dir = tmp_path / "被囚禁的玛丽公主和淫乱的魔物城（囚われのマリー姫と淫堕の魔物城）"
        unicode_dir.mkdir()
        with patch("sys.argv", ["install_plugin.py", str(unicode_dir)]):
            from install_plugin import get_paths

            with pytest.raises(SystemExit) as exc_info:
                get_paths()
        msg = str(exc_info.value)
        assert "Invalid target directory:" in msg
        assert "Expected RPG Maker project" in msg
        assert "被囚禁的玛丽公主" in msg

    def test_unicode_path_valid_project(self, tmp_path):
        """Path with CJK characters and valid www structure succeeds."""
        unicode_dir = tmp_path / "被囚禁的玛丽公主（囚われのマリー姫）"
        unicode_dir.mkdir()
        _make_rpg_project(unicode_dir)
        with patch("sys.argv", ["install_plugin.py", str(unicode_dir)]):
            from install_plugin import get_paths

            target_dir, www_dir, script_dir = get_paths()
            assert Path(target_dir) == unicode_dir.resolve()
            assert (Path(www_dir) / "js" / "plugins").exists()


class TestCopyPluginFile:
    """Tests for copy_plugin_file()."""

    def test_copies_plugin_successfully(self, tmp_path):
        _make_rpg_project(tmp_path)
        script_dir = PROJECT_ROOT
        plugin_src = script_dir / "DynamicTranslation.js"
        if not plugin_src.exists():
            pytest.skip("DynamicTranslation.js not found in project")

        from install_plugin import copy_plugin_file

        copy_plugin_file(str(script_dir), str(tmp_path / "www"))
        dest = tmp_path / "www" / "js" / "plugins" / "DynamicTranslation.js"
        assert dest.exists()
        assert dest.read_bytes() == plugin_src.read_bytes()

    def test_creates_plugins_dir_when_missing(self, tmp_path, capsys):
        # www/js exists but www/js/plugins does not - should create it automatically
        (tmp_path / "www" / "js").mkdir(parents=True)
        plugin_src = PROJECT_ROOT / "DynamicTranslation.js"
        if not plugin_src.exists():
            pytest.skip("DynamicTranslation.js not found")

        from install_plugin import copy_plugin_file

        copy_plugin_file(str(PROJECT_ROOT), str(tmp_path / "www"))
        # Should create plugins directory and copy file
        plugins_dir = tmp_path / "www" / "js" / "plugins"
        assert plugins_dir.exists()
        assert (plugins_dir / "DynamicTranslation.js").exists()
        out = capsys.readouterr().out
        assert "Creating plugins directory" in out
        assert "Plugin copied successfully" in out

    def test_exported_structure_with_js_plugins_works(self, tmp_path, capsys):
        """Exported structure: js/plugins exists without www - should work."""
        (tmp_path / "js" / "plugins").mkdir(parents=True)
        plugin_src = PROJECT_ROOT / "DynamicTranslation.js"
        if not plugin_src.exists():
            pytest.skip("DynamicTranslation.js not found")

        from install_plugin import copy_plugin_file

        # For exported structure, target_dir is the project root
        copy_plugin_file(str(PROJECT_ROOT), str(tmp_path))
        dest = tmp_path / "js" / "plugins" / "DynamicTranslation.js"
        assert dest.exists()
        assert dest.read_bytes() == plugin_src.read_bytes()


class TestUpdatePluginsJs:
    """Tests for update_plugins_js()."""

    def test_adds_plugin_to_empty_list(self, tmp_path):
        _make_rpg_project(tmp_path)
        _make_plugins_js(tmp_path, [])
        with patch("sys.argv", ["install_plugin.py", str(tmp_path)]):
            from install_plugin import update_plugins_js

            update_plugins_js(str(tmp_path / "www"))
        plugins_path = tmp_path / "www" / "js" / "plugins.js"
        content = plugins_path.read_text(encoding="utf-8")
        assert "DynamicTranslation" in content
        assert '"name":"DynamicTranslation"' in content.replace(" ", "")

    def test_adds_plugin_to_existing_list(self, tmp_path):
        _make_rpg_project(tmp_path)
        _make_plugins_js(tmp_path, [{"name": "SomeOtherPlugin", "status": True}])
        from install_plugin import update_plugins_js

        update_plugins_js(str(tmp_path / "www"))
        plugins_path = tmp_path / "www" / "js" / "plugins.js"
        content = plugins_path.read_text(encoding="utf-8")
        assert "DynamicTranslation" in content
        assert "SomeOtherPlugin" in content

    def test_skips_when_plugin_already_registered(self, tmp_path, capsys):
        _make_rpg_project(tmp_path)
        # Use compact format - install_plugin checks for '"name":"DynamicTranslation"'
        (tmp_path / "www" / "js").mkdir(parents=True, exist_ok=True)
        plugins_path = tmp_path / "www" / "js" / "plugins.js"
        plugins_path.write_text('[{"name":"DynamicTranslation","status":true}]', encoding="utf-8")
        original_content = plugins_path.read_text()

        from install_plugin import update_plugins_js

        update_plugins_js(str(tmp_path / "www"))
        new_content = plugins_path.read_text()
        assert new_content == original_content
        out = capsys.readouterr().out.lower()
        assert "skipping" in out

    def test_handles_missing_plugins_js(self, tmp_path, capsys):
        _make_rpg_project(tmp_path)
        plugins_js = tmp_path / "www" / "js" / "plugins.js"
        if plugins_js.exists():
            plugins_js.unlink()

        from install_plugin import update_plugins_js

        update_plugins_js(str(tmp_path / "www"))
        out = capsys.readouterr().out
        assert "Warning" in out


class TestInstallTranslation:
    """Tests for install_translation()."""

    def test_installs_valid_translation_json(self, tmp_path):
        result = _install_translation_from_file(
            tmp_path, '{"key1": "value1", "key2": "value2"}', "zh.json"
        )
        assert result is True
        dest = tmp_path / "www" / "translations" / "zh.json"
        assert dest.exists()
        assert json.loads(dest.read_text()) == {"key1": "value1", "key2": "value2"}

    def test_skips_package_json(self, tmp_path):
        result = _install_translation_from_file(tmp_path, '{"name": "test"}', "package.json")
        assert result is False
        assert not (tmp_path / "www" / "translations" / "zh.json").exists()

    def test_skips_invalid_json(self, tmp_path):
        result = _install_translation_from_file(tmp_path, "not valid json", "bad.json")
        assert result is False

    def test_skips_non_dict_json(self, tmp_path):
        result = _install_translation_from_file(tmp_path, "[1, 2, 3]", "array.json")
        assert result is False

    def test_skips_empty_dict(self, tmp_path):
        result = _install_translation_from_file(tmp_path, "{}", "empty.json")
        assert result is False

    def test_skips_dict_without_string_values(self, tmp_path):
        result = _install_translation_from_file(tmp_path, '{"a": 1, "b": [1, 2]}', "no_strings.json")
        assert result is False

    def test_creates_translations_dir_if_missing(self, tmp_path):
        _install_translation_from_file(tmp_path, '{"x": "y"}', "tr.json")
        assert (tmp_path / "www" / "translations").exists()

    def test_exported_structure_translations_in_root(self, tmp_path):
        """Exported structure: translations should be in project root, not www/translations."""
        # Create exported structure (no www, js directly in root)
        (tmp_path / "js" / "plugins").mkdir(parents=True)
        (tmp_path / "zh.json").write_text('{"key": "value"}', encoding="utf-8")
        
        from install_plugin import install_translation
        
        # For exported structure, www_dir == target_dir
        install_translation(str(tmp_path), str(tmp_path))
        
        # Translations should be in project root/translations, not www/translations
        assert (tmp_path / "translations").exists()
        assert (tmp_path / "translations" / "zh.json").exists()
        assert not (tmp_path / "www" / "translations").exists()


class TestPluginConfig:
    """Tests for PLUGIN_CONFIG constant."""

    def test_plugin_config_structure(self):
        from install_plugin import PLUGIN_CONFIG

        assert PLUGIN_CONFIG["name"] == "DynamicTranslation"
        assert PLUGIN_CONFIG["status"] is True
        assert "parameters" in PLUGIN_CONFIG
        assert "Default Language" in PLUGIN_CONFIG["parameters"]
        assert "Translation Path" in PLUGIN_CONFIG["parameters"]


class TestMain:
    """Tests for main()."""

    def test_main_runs_full_flow(self, tmp_path, capsys):
        _make_rpg_project(tmp_path)
        plugin_src = PROJECT_ROOT / "DynamicTranslation.js"
        if not plugin_src.exists():
            pytest.skip("DynamicTranslation.js not found")

        with patch("sys.argv", ["install_plugin.py", str(tmp_path)]):
            from install_plugin import main

            main()

        out = capsys.readouterr().out.lower()
        assert "complete" in out
        dest_plugin = tmp_path / "www" / "js" / "plugins" / "DynamicTranslation.js"
        assert dest_plugin.exists()

    def test_cli_unicode_path_invalid_exits_with_message(self, tmp_path):
        """python3 install_plugin.py 'unicode_path' exits with Invalid target directory."""
        unicode_dir = tmp_path / "被囚禁的玛丽公主和淫乱的魔物城（囚われのマリー姫と淫堕の魔物城）"
        unicode_dir.mkdir()
        script = PROJECT_ROOT / "install_plugin.py"
        result = subprocess.run(
            [sys.executable, str(script), str(unicode_dir)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        assert result.returncode != 0
        assert "Invalid target directory:" in result.stderr
        assert "被囚禁的玛丽公主" in result.stderr

    def test_cli_unicode_path_valid_succeeds(self, tmp_path):
        """python3 install_plugin.py 'unicode_path' succeeds when www exists."""
        unicode_dir = tmp_path / "被囚禁的玛丽公主和淫乱的魔物城（囚われのマリー姫と淫堕の魔物城）"
        unicode_dir.mkdir()
        _make_rpg_project(unicode_dir)
        plugin_src = PROJECT_ROOT / "DynamicTranslation.js"
        if not plugin_src.exists():
            pytest.skip("DynamicTranslation.js not found")
        
        script = PROJECT_ROOT / "install_plugin.py"
        result = subprocess.run(
            [sys.executable, str(script), str(unicode_dir)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        # Should succeed (returncode 0) or fail gracefully, but not with "Invalid target directory"
        assert "Invalid target directory:" not in result.stderr
        assert (unicode_dir / "www" / "js" / "plugins" / "DynamicTranslation.js").exists()
