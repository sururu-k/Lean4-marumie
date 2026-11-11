/* A second presentation of the same derived graph: readable, keyboard-accessible
   layers. It never recomputes dependencies, axioms, or path membership. */
(function (LDR) {
  'use strict';
  function layoutGraph(dv, viewport = 800) {
    const columns = viewport < 520 ? 1 : viewport < 820 ? 2 : 3;
    const width = viewport < 520 ? 248 : 216, gap = 32, rowGap = 56;
    const groups = new Map();
    for (const [name, p] of Object.entries(dv.posAll || {})) {
      const level = name === dv.center ? 0 : (p.cone === 'dep' ? -1 : 1) * (p.level || 1);
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level).push({ name, ...p });
    }
    const rows = [];
    for (const level of [...groups.keys()].sort((a,b) => a-b)) {
      const items = groups.get(level).sort((a,b)=>(a.x||0)-(b.x||0)||a.name.localeCompare(b.name));
      // Dependencies read toward the center, references read away from it.
      const chunks=[];
      for(let i=0;i<items.length;i+=columns)chunks.push(items.slice(i,i+columns));
      if(level<0)chunks.reverse();
      for(const chunk of chunks)rows.push({level, items:chunk});
    }
    const canvasWidth = Math.max(304, Math.max(0,...rows.map(r=>r.items.length))*(width+gap)-gap+64);
    const nodes = {};
    let y=48;
    for(const row of rows) {
      const rowWidth=row.items.length*(width+gap)-gap;
      let x=(canvasWidth-rowWidth)/2;
      const height=Math.max(...row.items.map(p=> {
        const label=(dv.labels?.[p.name]||p.name).split('.').pop();
        return (p.name===dv.center?88:104)+Math.max(0,Math.ceil(label.length/Math.floor((width-24)/8.4))-1)*22;
      }));
      for(const item of row.items){nodes[item.name]={...item,x,y,w:width,h:height};x+=width+gap;}
      row.y=y;row.height=height;y+=height+rowGap;
    }
    return {nodes,rows,width:canvasWidth,height:Math.max(280,y-16)};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={layoutGraph};return;}
  const S=LDR.store;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=new Intl.NumberFormat('ja-JP');
  const kind={theorem:'定理',def:'定義',axiom:'公理',inductive:'帰納型',constructor:'構成子',recursor:'再帰子',opaque:'opaque'};
  let host,stage,mode='layers',zoom=1,pan={x:0,y:0},auto=true,lastModel='',lastPaint='',drag=null;
  let model={nodes:{},rows:[],width:304,height:280};
  const api={active:true,layoutGraph};
  function fit(all=false){
    const w=host.clientWidth,h=host.clientHeight;
    zoom=Math.max(all?.3:.85,Math.min(1,(w-32)/model.width,(h-100)/model.height));
    pan={x:Math.max(16,(w-model.width*zoom)/2),y:48+Math.max(0,(h-100-model.height*zoom)/2)};
  }
  function transform(){stage.style.width=model.width+'px';stage.style.height=model.height+'px';stage.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;document.getElementById('graphZoom').textContent=`${Math.round(zoom*100)}%`;}
  function render(){
    if(!host)return;
    const st=S.state,dv=S.derived;
    const names=Object.keys(dv.posAll||{});
    const key=JSON.stringify([names.map(n=>[n,dv.posAll[n].level,dv.posAll[n].cone,dv.posAll[n].x]),dv.center,Math.floor(host.clientWidth/80)]);
    if(key!==lastModel){model=layoutGraph(dv,host.clientWidth);lastModel=key;auto=true;}
    if(auto)fit();
    const paint=JSON.stringify([lastModel,st.selected,st.traceTarget,st.pathFrom,st.edgeMode,st.refFilter,st.hideFrame,st.groupBy,st.density,st.hovered,names.map(n=>[n,st.nodes[n]?.usesSorry,dv.more?.[n],S.isClusterOpen(n)]),dv.edges,dv.pathSet?[...dv.pathSet]:[],dv.highlight?[...dv.highlight]:[]]);
    if(paint!==lastPaint){
      const focused=document.activeElement?.dataset?.flowNode;
      lastPaint=paint;
      const edges=(dv.edges||[]).map(e=>{
        const a=model.nodes[e.u],b=model.nodes[e.v];if(!a||!b)return '';
        const up=b.y<a.y,ay=up?a.y:a.y+a.h,by=up?b.y+b.h:b.y;
        let ax=a.x+a.w/2,bx=b.x+b.w/2,mid=(ay+by)/2;
        let pathData=`M${ax},${ay} C${ax},${mid} ${bx},${mid} ${bx},${by}`;
        if(Math.abs(a.y-b.y)>Math.max(a.h,b.h)+80){
          const lane=Math.max(a.x+a.w,b.x+b.w)+24+Math.abs(a.level-b.level)*12;
          pathData=`M${a.x+a.w},${a.y+a.h/2} C${lane},${a.y+a.h/2} ${lane},${b.y+b.h/2} ${b.x+b.w},${b.y+b.h/2}`;
        }
        const path=dv.pathSet,hot=path?.has(e.u)&&path?.has(e.v);
        const dim=dv.highlight&&!(dv.highlight.has(e.u)&&dv.highlight.has(e.v));
        const color=e.cone==='dep'?(e.kind==='type'?'#4f46e5':'#7c3aed'):(e.kind==='type'?'#0f766e':'#c2410c');
        return `<path class="flow-edge${hot?' is-path':''}${dim?' is-dim':''}" d="${pathData}" style="--edge-color:${color}" ${e.kind==='value'?'stroke-dasharray="6 5"':''} marker-end="url(#flow-arrow-${e.cone}-${e.kind})"><title>${esc(e.u)} → ${esc(e.v)}${e.via?.length?' / 経由 '+esc(e.via.join(', ')):''}</title></path>`;
      }).join('');
      const markers=['dep-type','dep-value','ref-type','ref-value'].map((id,i)=>`<marker id="flow-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 9 5 1 9" fill="none" stroke="${['#4f46e5','#7c3aed','#0f766e','#c2410c'][i]}" stroke-width="1.5"/></marker>`).join('');
      const nodes=Object.entries(model.nodes).map(([name,p])=>{
        const nd=st.nodes[name],center=name===dv.center,selected=name===st.selected;
        const label=(dv.labels?.[name]||name).split('.').pop();
        const prefix=name.split('.').slice(0,-1).join('.')||'Lean core';
        const more=dv.more?.[name]||0,facets=dv.facetCount?.[name]||0;
        const status=nd?.usesSorry?'sorry':(nd?.axioms?.length?`公理 ${fmt.format(nd.axioms.length)}`:'');
        return `<div class="flow-node${center?' is-center':''}${selected?' is-selected':''}${dv.pathSet?.has(name)&&!center?' on-path':''}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;min-height:${p.h}px" data-name="${esc(name)}">
          <button class="flow-node-main" data-flow-node="${esc(name)}" aria-pressed="${selected}" title="${esc(name)} — 選択して詳細を表示。ダブルクリックで中心にする">
            <span class="flow-node-meta"><span>${center?'中心の宣言':kind[nd?.kind]||'宣言'}</span>${status?`<span class="flow-status${nd?.usesSorry?' is-sorry':''}">${status}</span>`:''}</span>
            <span class="flow-node-label" translate="no">${esc(label)}</span><span class="flow-namespace" translate="no">${esc(prefix)}</span>
          </button>
          <div class="flow-node-actions">${!center?`<button data-nav="${esc(name)}" title="${esc(name)}をグラフの中心にする">中心にする</button>`:''}${more||st.expanded.has(name)?`<button data-flow-expand="${esc(name)}">${st.expanded.has(name)?'畳む':`＋${fmt.format(more)}件`}</button>`:''}${facets?`<button data-cluster="${esc(name)}" title="派生宣言の開閉">派生 ${fmt.format(facets)}</button>`:''}</div>
        </div>`;
      }).join('');
      stage.innerHTML=names.length?`<svg class="flow-lines" width="${model.width}" height="${model.height}" aria-hidden="true"><defs>${markers}</defs>${edges}</svg>${nodes}`:'';
      document.getElementById('graphEmpty').hidden=names.length>0;
      document.getElementById('graphSummary').textContent=names.length?`${fmt.format(names.length)}宣言 / ${fmt.format(dv.edges?.length||0)}接続`:'レポートを読み込むと表示します';
      const dep=names.filter(n=>model.nodes[n].cone==='dep').length,ref=names.filter(n=>model.nodes[n].cone==='ref').length;
      document.getElementById('graphRelations').textContent=`依存先 ${fmt.format(dep)}　参照元 ${fmt.format(ref)}`;
      if(focused){const el=[...stage.querySelectorAll('[data-flow-node]')].find(e=>e.dataset.flowNode===focused);el?.focus({preventScroll:true});}
    }
    transform();
  }
  function setMode(value){
    mode=value;api.active=mode==='layers';document.getElementById('canvasHost').dataset.layout=mode;
    host.hidden=!api.active;
    document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===mode)));
    localStorage.setItem('ldr-graph-layout',mode);S.actions.resetView();render();
  }
  function mount(){
    host=document.getElementById('flowViewport');stage=document.getElementById('flowStage');
    document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.layout)));
    stage.addEventListener('click',e=>{
      const expand=e.target.closest('[data-flow-expand]');if(expand){S.actions.toggleExpand(expand.dataset.flowExpand);return;}
      const node=e.target.closest('[data-flow-node]');if(node){S.actions.select(node.dataset.flowNode);if(innerWidth<700&&document.getElementById('sideR').classList.contains('hidden'))document.getElementById('btnSideR').click();}
    });
    stage.addEventListener('dblclick',e=>{const node=e.target.closest('[data-flow-node]');if(node)S.actions.navigate(node.dataset.flowNode);});
    host.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&e.shiftKey){const n=e.target.closest('[data-flow-node]');if(n){e.preventDefault();S.actions.navigate(n.dataset.flowNode);}}
      if(e.key==='Escape'){S.actions.clearPath();S.actions.setTrace(null);}
    });
    host.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||e.button!==0)return;
      drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};host.setPointerCapture(e.pointerId);host.classList.add('is-panning');
    });
    host.addEventListener('pointermove',e=>{if(!drag)return;auto=false;pan={x:drag.px+e.clientX-drag.x,y:drag.py+e.clientY-drag.y};transform();});
    const end=()=>{drag=null;host.classList.remove('is-panning');};host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);
    host.addEventListener('wheel',e=>{
      if(!api.active||(!e.ctrlKey&&!e.metaKey))return;e.preventDefault();api.zoomBy(e.deltaY<0?1.1:1/1.1);
    },{passive:false});
    S.subscribe(render);new ResizeObserver(()=>{auto=true;render();}).observe(host);
    setMode(localStorage.getItem('ldr-graph-layout')==='radial'?'radial':'layers');
  }
  Object.assign(api,{mount,render,reset(){auto=false;fit(true);transform();},zoomBy(f){auto=false;const old=zoom;zoom=Math.max(.3,Math.min(2.5,zoom*f));pan.x=host.clientWidth/2-(host.clientWidth/2-pan.x)*zoom/old;pan.y=host.clientHeight/2-(host.clientHeight/2-pan.y)*zoom/old;transform();}});
  LDR.flow=api;
})(typeof window==='undefined'?{}:(window.LDR=window.LDR||{}));
