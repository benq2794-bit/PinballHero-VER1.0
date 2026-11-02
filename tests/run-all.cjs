const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const tests = fs.readdirSync(__dirname).filter(file => file.endsWith('.test.cjs')).sort();
let failed = 0;
for (const file of tests) {
    const result = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8', windowsHide: true });
    const passed = result.status === 0;
    console.log(`${passed ? 'PASS' : 'FAIL'} ${file}`);
    if (!passed) { failed++; console.error(result.error || result.stderr || result.stdout); }
}
console.log(`${tests.length - failed}/${tests.length} test files passed.`);
process.exitCode = failed ? 1 : 0;
