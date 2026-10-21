import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const themes=JSON.parse(readFileSync(new URL('../../../design/themes/themes.json',import.meta.url),'utf8'));
const checked=spawnSync('rtk',['proxy','node','node_modules/typescript/bin/tsc','-b'],{stdio:'inherit'});
if(checked.status!==0)process.exit(checked.status||1);
for(const theme of themes){
 const result=spawnSync('rtk',['proxy','node','node_modules/vite/bin/vite.js','build','--outDir',`releases/${theme.id}`],{stdio:'inherit',env:{...process.env,VITE_DEFAULT_THEME:theme.id,VITE_DESIGN_STUDIO:'false',VITE_DATA_MODE:'api'}});
 if(result.status!==0)process.exit(result.status||1);
 console.log(`Frontend release ${theme.id} ready; requires /api backend.`);
}
