// 產生本地解包素材索引：loader 逐檔試探前先查這一份，缺檔就不發請求。
// 只收錄會被試探的三個根目錄，補進素材後重跑本腳本（或 build-release）才生效。
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ROOTS = ["asset/character", "asset/battle", "assets"];
const OUTPUT = "asset/asset-index.js";

async function collect(dir, acc) {
    let entries;
    try { entries = await fs.readdir(path.join(root, dir), { withFileTypes: true }); }
    catch { return acc; }
    for (const entry of entries) {
        const relative = `${dir}/${entry.name}`;
        if (entry.isDirectory()) await collect(relative, acc);
        else if (entry.isFile()) acc.push(relative);
    }
    return acc;
}

async function render() {
    const files = [];
    for (const dir of ROOTS) await collect(dir, files);
    files.sort();
    const body = files.map(file => `        ${JSON.stringify(file)}`).join(",\n");
    const code = `// 本地解包素材索引：由 scripts/build-asset-index.cjs 產生，不要在編輯器裡手改。
// loader 發請求前先查這份清單，查不到的候補直接跳過、走圖站或文字回退。
// 補進素材後要重跑 node scripts/build-asset-index.cjs（build-release 也會自動重跑）才吃得到。
window.ASSET_INDEX = Object.freeze({
    // 只有這些前綴歸索引管；索引外的路徑（CDN 網址、其他目錄）一律照常發請求。
    prefixes: ${JSON.stringify(ROOTS.map(dir => `${dir}/`))},
    files: Object.freeze([
${body}
    ])
});
`;
    return { code, files };
}

async function build() {
    const { code, files } = await render();
    await fs.writeFile(path.join(root, OUTPUT), code, "utf8");
    return { files, bytes: Buffer.byteLength(code) };
}

if (require.main === module) build().then(({ files, bytes }) => {
    console.log(`Asset index: ${files.length} files, ${bytes} bytes → ${OUTPUT}`);
}).catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { build, render, ROOTS, OUTPUT };
