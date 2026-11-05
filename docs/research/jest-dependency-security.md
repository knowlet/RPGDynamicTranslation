# Jest development dependency security refresh

Verified 2026-11-05 against main `83ceac969392e7ea1948652d0b2dd6d06233ddeb`.

## Scope and root cause

The committed npm lockfile retained vulnerable transitive versions in the Jest
development toolchain. The only direct npm dependency remains
`jest: ^29.7.0`, under `devDependencies`. The RPG Maker plugin has no npm runtime
dependencies. This refresh changes 24 development package records within their
existing dependency ranges, without changing package.json, Jest 29.7.0, game code,
the Python installer, workflows, or deployment settings.

The fix was generated using `npm audit fix --package-lock-only --ignore-scripts`
with npm 11.9.0 and the public npm registry. No force, overrides, new direct
dependency, Jest major change, or audit suppression was used.

Principal affected packages:

| Package | Previous | Refreshed | Advisory evidence |
| --- | --- | --- | --- |
| @babel/core | 7.28.5 | 7.29.13 | [source-map file read](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) |
| baseline-browser-mapping | 2.8.32 | 2.11.35 | [process termination](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) |
| brace-expansion | 1.1.12 | 1.1.21 | [zero-step hang](https://github.com/advisories/GHSA-f886-m6hf-6m8v), plus the later bounds fixes reported by npm audit |
| browserslist | 4.28.0 | 4.29.5 | [unbounded cache](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [untrusted stats](https://github.com/advisories/GHSA-73wf-gq98-2v4g) |
| js-yaml | 3.14.2 | 3.15.2 | [empty merge-source budget bypass](https://github.com/advisories/GHSA-2883-xcg3-v3hh), plus the preceding merge/omap bounds fixes |

Babel companion packages and browser databases were refreshed as required by the
same resolution. All existing package paths remain present, all changed records
are marked development-only, and the root manifest entry is identical.

## Audit evidence and remaining finding

Using the same npm 11.9.0 audit command and current advisory data:

- Before: 49 reported affected package entries: 34 low, 2 moderate, 13 high.
  There are 16 distinct advisory URLs across six root packages.
- After: 6 low affected package entries, zero moderate, high, or critical.
  The only distinct remaining advisory is
  [deepmerge GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
- `npm audit --omit=dev --json`: zero reported findings.

The counts include npm's propagated dependency effects. They are not counts of
independently exploitable project vulnerabilities. Audit output can vary with
npm versions and advisory updates; the earlier CI summary of 11 findings is a
different snapshot.

Deepmerge 4.3.1 remains below jest-config. The reviewed advisory lists no patched
version, and the registry version list ends at 4.3.1. npm proposes a breaking
Jest downgrade to 25.1.0 as a possible resolution. That downgrade is not included.
Untrusted Jest configurations should not be merged or run with privileged
credentials. No claim of a completely clean development toolchain is made.

## Regression and verification

`tests/dependency-security.test.js` adds two small contracts to the existing
Jest command:

1. Run brace expansion of `{1..2..0}` in a separate Node process with a 64 MiB
   old-space cap and a 1.5-second timeout. Require successful normalization to
   `['1', '2']`. A reverted dependency cannot hang the Jest worker itself.
2. Require js-yaml to count four empty merge-source mappings against an explicit
   budget of three. A budget of four must still accept the ordinary document.
   This uses four merge operations rather than a large denial-of-service input.

Independent assistant-cloud checks:

- Node 24.22.1 / npm 11.9.0: locked `npm ci --ignore-scripts` succeeded;
  `npm test -- --runInBand` passed 70/70 tests.
- Negative control: reinstalling the unchanged main lockfile and running the
  identical final test files gave 68 passed / 2 failed. The brace child aborted
  under its heap cap, and old js-yaml ignored the configured merge budget.
- Python 3.12.14 / pytest 9.2.0: all 27 existing main installer tests passed.
- JavaScript syntax checks, Python syntax compilation, npm dependency-tree
  validation, and whitespace diagnostics passed.
- The 15 original source files, including the baseline lockfile, were verified
  against their exact-main Git blob SHAs before testing. Only the refreshed
  lockfile and the new regression/documentation files are proposed.
- The project configures no separate build or lint script. Hosted Node 18/20
  compatibility is established separately by the PR's exact-head CI, not by
  the local Node 24 run.

The refreshed lockfile Git blob is
`c26b4a493f41838dde20cb74e44062946d32e738`.
Its SHA-256 is
`5c36b3be35326030b53dabb38cd9c2d20185d31619425d04cdac41d90780350e`.

Reproduce after a locked installation:

```sh
npm ci --ignore-scripts
npm test -- --runInBand
npm audit --package-lock-only --json
npm audit --omit=dev --json
python -m pytest -q
```

The full development audit still exits nonzero because of deepmerge. Production
audit exits zero. The regression checks demonstrate two dependency-level
contracts; they do not establish an attack path through RPG Maker or exercise a
real game, paid translation provider, user game files, or credentials. Existing
installer PR #5 is independent and is not modified by this refresh.
