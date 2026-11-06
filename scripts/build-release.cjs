const fs = require("node:fs/promises");
const path = require("node:path");
const { Script } = require("node:vm");
const { minify } = require("terser");

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
    const input = await fs.readFile(path.join(root, "index.html"), "utf8");
    const devMode = /const DEV_MODE = \(\(\) => \{[\s\S]*?\n\}\)\(\);/;
    if (!devMode.test(input)) throw new Error("Production DEV_MODE override no longer matches");
    const html = input.replace(devMode, "const DEV_MODE = false;");
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
