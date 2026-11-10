const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { Script } = require("node:vm");
const { minify } = require("terser");
const { build: buildAssetIndex } = require("./build-asset-index.cjs");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const options = {
    module: false,
    toplevel: false,
    compress: { passes: 1 },
    mangle: { toplevel: false, properties: false },
    format: { inline_script: true, comments: "some" },
    sourceMap: false
};

async function compress(code, filename) {
    const result = await minify(code, options);
    new Script(result.code, { filename });
    return result.code;
}

async function build() {
    await buildAssetIndex();
    const input = await fs.readFile(path.join(root, "index.html"), "utf8");
    const devMode = /const DEV_MODE = \(\(\) => \{[\s\S]*?\n\}\)\(\);/;
    if (!devMode.test(input)) throw new Error("Production DEV_MODE override no longer matches");
    const version = input.match(/const GAME_VERSION = "([^"]+)"/)[1];
    let commit = process.env.CF_PAGES_COMMIT_SHA || '';
    if (!commit) { try { commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root,encoding:'utf8'}).trim(); } catch {} }
    const branch = process.env.CF_PAGES_BRANCH || '';
    const channel = branch ? (branch === 'main' ? 'production' : 'preview') : 'development';
    const release = {app:'pinball-realms',version,id:randomUUID(),commit,channel,builtAt:new Date().toISOString()};
    const html = input.replace(devMode, "const DEV_MODE = false;").replace(/const GAME_RELEASE = [^;]+;/, 'const GAME_RELEASE = '+JSON.stringify(release)+';');
    if (!html.includes(release.id)) throw new Error('Missing release identity');
    const scripts = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi;
    let page = "", offset = 0;
    for (const match of html.matchAll(scripts)) {
        const [block, open, body, close] = match;
        page += html.slice(offset, match.index) + open;
        page += body.trim() && !/\btype\s*=/i.test(open) ? await compress(body, "index.html") : body;
        page += close;
        offset = match.index + block.length;
    }
    page += html.slice(offset);
    const cacheBust = text => text.replace(/((?:src|href)=["'])(asset\/[^"'?#]+)(["'])/g, (_,a,b,c)=>a+b+'?v='+release.id+c);
    let stamped='', position=0;
    for (const match of page.matchAll(scripts)) {
        stamped += cacheBust(page.slice(position,match.index)) + cacheBust(match[1]) + match[2] + match[3];
        position = match.index + match[0].length;
    }
    page = stamped + cacheBust(page.slice(position));
    for (const match of page.matchAll(scripts)) {
        if (match[2].trim() && !/\btype\s*=/i.test(match[1])) new Script(match[2],{filename:'final index.html'});
    }

    if (path.relative(root, output) !== 'dist') throw new Error('Unsafe output path');
    await fs.rm(output, { recursive: true, force: true });
    const assetRoot = path.join(root, "asset");
    await fs.cp(assetRoot, path.join(output, "asset"), {
        recursive: true,
        filter: async filename => {
            if (/(^|[\\/])nav-buttons([\\/]|$)/i.test(filename)) return false;
            if (/^(preview\.png|nav-src\.png|codex-clipboard-.*)$/i.test(path.basename(filename))) return false;
            const stat = await fs.lstat(filename);
            return stat.isDirectory() || (stat.isFile() &&
                /\.(css|gif|jpe?g|js|json|mp3|ogg|png|svg|txt|wav|webp|woff2?)$/i.test(filename));
        }
    });
    for (const file of await fs.readdir(path.join(output, "asset"), { recursive: true, withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".js")) continue;
        const filename = path.join(file.parentPath, file.name);
        const code = await fs.readFile(filename, "utf8");
        await fs.writeFile(filename, await compress(code, filename));
    }
    await fs.writeFile(path.join(output, "index.html"), page);
    await fs.writeFile(path.join(output, "version.json"), JSON.stringify(release,null,2));
    for (const [, reference] of page.matchAll(/\b(?:src|href)=["'](asset\/[^"'<>]+)["']/g)) {
        if (/[{}$]/.test(reference)) continue;
        await fs.access(path.join(output, reference.split(/[?#]/)[0]));
    }
    console.log(`Release built in dist. HTML ${Buffer.byteLength(input)} → ${Buffer.byteLength(page)} bytes.`);
}

build().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
