const { spawnSync } = require('node:child_process');

describe('Jest development dependency security regressions', () => {
    test('brace expansion normalizes a zero step in a bounded child process', () => {
        const script = [
            "const assert = require('node:assert/strict');",
            "const expand = require(process.argv[1]);",
            "assert.deepEqual(expand('{1..2..0}'), ['1', '2']);"
        ].join('\n');
        const result = spawnSync(
            process.execPath,
            ['--max-old-space-size=64', '-e', script, require.resolve('brace-expansion')],
            {
                encoding: 'utf8',
                timeout: 1500,
                maxBuffer: 64 * 1024
            }
        );

        // A reverted dependency must fail here instead of hanging the Jest worker.
        expect(result.error).toBeUndefined();
        expect(result.signal).toBeNull();
        expect(result.status).toBe(0);
    });

    test('YAML counts empty merge sources against the configured budget', () => {
        const yaml = require('js-yaml');
        const source = [
            'arr: &arr [{}, {}]',
            'targets:',
            '  - <<: *arr',
            '  - <<: *arr',
            ''
        ].join('\n');

        expect(() => yaml.safeLoad(source, { maxTotalMergeKeys: 3 }))
            .toThrow(/maxTotalMergeKeys/);
        expect(yaml.safeLoad(source, { maxTotalMergeKeys: 4 }).targets)
            .toEqual([{}, {}]);
    });
});
