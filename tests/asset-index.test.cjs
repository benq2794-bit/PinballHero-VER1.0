// 索引要跟磁碟一致：補了素材卻忘了重跑產生腳本，loader 會一直跳過那張新圖。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { render, OUTPUT, ROOTS } = require('../scripts/build-asset-index.cjs');

(async () => {
    const { code } = await render();
    const committed = fs.readFileSync(path.join(root, OUTPUT), 'utf8');
    assert.equal(committed, code, 'asset/asset-index.js 過期，請重跑 node scripts/build-asset-index.cjs');

    const box = { window: {} };
    vm.runInNewContext(committed, box);
    const { prefixes, files } = box.window.ASSET_INDEX;
    // vm 那側的 Array 是另一個 realm，deepStrictEqual 會比原型鏈，改用序列化比內容
    assert.equal(JSON.stringify(prefixes), JSON.stringify(ROOTS.map(dir => `${dir}/`)), '前綴要跟著被探測的根目錄');
    assert.ok(files.length > 0 && new Set(files).size === files.length, '清單不能有空或重複');
    for (const file of files) assert.ok(fs.existsSync(path.join(root, file)), `索引報了不存在的檔案：${file}`);
    assert.ok(!files.includes('asset/character/alk/pixelart/animated/idle.gif'), '沒有本地點陣圖的角色不能被索引放行');
    assert.ok(files.includes('asset/battle/bg/polita-field-crystal-v2.png'), '場布 png 後備要在清單上');
})().catch(error => { console.error(error); process.exitCode = 1; });
