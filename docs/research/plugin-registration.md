# Safe plugin registration

Checked 2026-11-04 against PR #5 head `5cd013fd3bc636bdc6e2d13fcf8cdd1f9bc6e906`.

## Reproduction and decision

The existing 31 installer tests pass. Two authored valid JavaScript fixtures fail:
`var $plugins = [];\n// documentation [optional]\n` is corrupted because the
installer inserts before the last `]` in the entire file. A leading comment
containing `{"name": "DynamicTranslation"}` prevents registration even though
the actual plugin array is empty. Nested parameter objects can likewise match
the whole-file registration regex.

Use the existing Python standard library rather than add a JavaScript parser.
Recognize only an optional leading BOM/comments, followed by a bare JSON array
or `var`/`let`/`const $plugins =` and a JSON array. Decode that array and use the
returned end offset for insertion. Check names only on top-level plugin entries.
Require the array to end the assignment (only comments/whitespace before a
semicolon or EOF), so array-starting expressions such as `[].concat(...)`
cannot be mistaken for a supported JSON value.
Preserve the prefix/suffix and existing registrations. Unsupported or malformed
arrays are left unchanged, with a diagnostic; arbitrary JavaScript expressions,
comments within JSON arrays and JavaScript trailing commas are not supported.
The CLI exits nonzero on parse failure instead of claiming installation completed.
The plugin file has already been copied at that point; no rollback or fully
transactional installation is claimed. The existing missing-plugins.js warning
policy remains unchanged.

## Upstream evidence

Targeted connected GitHub search: `raw_decode` in `python/cpython`. Read
`JSONDecoder.raw_decode` in
[Lib/json/decoder.py](https://github.com/python/cpython/blob/3d6d2a63a23ee4d340ed8df6de0bd70ef175c4cf/Lib/json/decoder.py):
it returns the decoded object and the absolute document-end index, including
when other text follows. It raises JSONDecodeError when no document starts at
the supplied offset. This is precisely the array-boundary primitive needed;
calling `json.loads` on the entire JavaScript file would reject the assignment
and comments. A custom last-bracket scan remains incorrect for strings/comments.

[CPython LICENSE](https://github.com/python/cpython/blob/3d6d2a63a23ee4d340ed8df6de0bd70ef175c4cf/LICENSE)
identifies the PSF License Version 2. The change directly uses the standard-library
API; no upstream implementation is copied or vendored. The repository currently
declares ISC in package.json and has no root license file, so this note does not
assert additional distribution rights for unrelated project files.

## Validation

Run the complete Python installer suite, regression negative controls against
the pre-fix implementation, Python syntax compilation, Node syntax checks, and
an actual installer subprocess followed by Node evaluation of the authored
plugin list. Existing Jest coverage is separate from a real RPG Maker runtime;
no game, paid translation API, or real user content is accessed.
