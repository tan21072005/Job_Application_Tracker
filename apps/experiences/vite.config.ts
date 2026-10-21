import {defineConfig} from 'vite';
import {fileURLToPath, URL} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({server:{fs:{allow:[fileURLToPath(new URL('../../',import.meta.url))]}},build:{rollupOptions:{input:Object.fromEntries(['index','dossier','rhythm','atlas','workbench','indexer'].map(id=>[id,fileURLToPath(new URL(id==='index'?'./index.html':`./${id}/index.html`,import.meta.url))]))}},resolve:{alias:{'@jobtrack/core':fileURLToPath(new URL('../../packages/jobtrack-core/src/index.ts',import.meta.url))}},root});
