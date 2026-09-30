import fs from 'node:fs/promises'
import path from 'node:path'

const dist=path.resolve('dist')
const outDir=path.resolve('standalone')
let html=await fs.readFile(path.join(dist,'index.html'),'utf8')

async function inlineFile(url){
  const clean=url.split('?')[0]
  const rel=clean.replace(/^https?:\/\/[^/]+/,'').replace(/^\/-sop-planner\/next\//,'').replace(/^\.\//,'').replace(/^\//,'')
  return fs.readFile(path.join(dist,rel),'utf8')
}

const cssMatches=[...html.matchAll(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]
for(const m of cssMatches){
  const css=await inlineFile(m[1])
  html=html.replace(m[0],()=>'<style>'+css+'</style>')
}

const jsMatches=[...html.matchAll(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)]
for(const m of jsMatches){
  const js=(await inlineFile(m[1])).replace(/<\/script/gi,'<\\/script')
  html=html.replace(m[0],()=>'<script type="module">'+js+'</script>')
}

html=html.replace(/<link\s+rel="manifest"[^>]*>/g,'')
html=html.replace(/<link\s+rel="modulepreload"[^>]*>/g,'')

await fs.mkdir(outDir,{recursive:true})
const out=path.join(outDir,'SOP_Planner_Modular_Standalone.html')
await fs.writeFile(out,html,'utf8')
console.log(out)
