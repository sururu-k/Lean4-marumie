const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const publicDir=path.join(root,'demo/public');
fs.mkdirSync(path.join(publicDir,'recordings'),{recursive:true});
fs.cpSync(path.join(root,'Graph/Web'),path.join(publicDir,'viewer'),{recursive:true});
for(const width of [1440,390])for(const file of [`lean4-marumie-demo-${width}.mp4`,`demo-poster-${width}.png`]){
 fs.copyFileSync(path.join(root,'artifacts',file),path.join(publicDir,'recordings',file));
}
