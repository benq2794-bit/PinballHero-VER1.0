const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist','tmp','dev-artifacts','design-reference','previews'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|cjs)$/.test(p))new vm.Script(fs.readFileSync(p,'utf8'),{filename:p});}}
walk(path.join(root,'asset'));walk(path.join(root,'scripts'));walk(path.join(root,'tests'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/src=|type=/.test(m[1]))new vm.Script(m[2],{filename:'index.html'});}
for(const script of ['tests/run-all.cjs','scripts/build-release.cjs'])execFileSync(process.execPath,[script],{cwd:root,stdio:'inherit',windowsHide:true});
