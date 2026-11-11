const {test}=require('node:test');
const assert=require('node:assert/strict');
const {layoutGraph}=require('../Graph/Web/js/flow.js');
test('layers preserve all declarations and separate dependencies from references',()=>{
 const dv={center:'c',labels:{},posAll:{c:{level:0,cone:'center'},a:{level:1,cone:'dep'},b:{level:2,cone:'dep'},r:{level:1,cone:'ref'}}};
 for(const width of [320,700,1200]){
 const m=layoutGraph(dv,width);assert.deepEqual(Object.keys(m.nodes).sort(),['a','b','c','r']);
 assert.ok(m.nodes.b.y<m.nodes.a.y);assert.ok(m.nodes.a.y<m.nodes.c.y);assert.ok(m.nodes.r.y>m.nodes.c.y);
 const nodes=Object.values(m.nodes);
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
 const a=nodes[i],b=nodes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'nodes overlap');
 }
 for(const n of nodes){assert.ok(n.x>=0&&n.x+n.w<=m.width);assert.ok(n.y>=0&&n.y+n.h<=m.height);}
 }
});
test('long declaration names reserve enough height and empty reports stay valid',()=>{
 const name='A.'+'x'.repeat(180);const m=layoutGraph({center:name,labels:{},posAll:{[name]:{level:0}}},320);
 assert.ok(m.nodes[name].h>200);assert.ok(Number.isFinite(layoutGraph({posAll:{}},320).width));
});
