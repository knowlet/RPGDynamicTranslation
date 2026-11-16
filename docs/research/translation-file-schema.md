# Validate translation files before caching

Base: 83ceac969392e7ea1948652d0b2dd6d06233ddeb.

The documented format is a key-value JSON translation dictionary. JSON parsing
alone also accepts arrays, primitives and dictionaries whose values are not
strings. The loader previously published those values as successful translations.
The translation/rendering path expects strings (including substring operations),
so a malformed file can return non-text data or throw during game UI rendering.
JSON null was even assigned to the cache before Object.keys threw, causing a
failed reload to destroy a previously usable dictionary.

Validate a non-null, non-array object with string values before replacing the
cache. Invalid data follows the existing callback(false) path and leaves the last
usable dictionary intact. Empty dictionaries, empty translated strings, Unicode,
and own keys such as hasOwnProperty remain valid. This does not change language
selection ordering, dictionary lookup rules, or options handlers in open PRs #7,
#8 and #9.

Regression: ten invalid shapes failed the new checks on the unchanged base;
two valid controls passed. After the fix all twelve pass, checking both callback
results and preservation of the previous dictionary/working translation.
The tests use the actual plugin loader with synthetic XMLHttpRequest responses,
not game files or external network traffic.
