import React from 'react'
import {createRoot} from 'react-dom/client'
import {Stage, Window, Phone, Row, Text, Button, States, type Act} from './kit'
import './demo.css'
import CloseUp from './reference/close-up'

// Adapted from stageshow's close-up: one persistent window, measured cursor
// targets, a held payoff and once playback. The dependency graph replaces settings.
type Scene = {selected:boolean; traced:boolean; report:boolean}
const initial:Scene={selected:false,traced:false,report:false}
const poster:Scene={selected:true,traced:true,report:true}
async function script(a:Act<Scene>){
  await a.wait(900)
  a.mark('select')
  await a.click('theorem')
  await a.set({selected:true})
  await a.wait(1500)
  a.mark('trace')
  await a.click('dependency')
  await a.set({traced:true})
  await a.move('rest')
  await a.wait(1800)
  a.mark('report')
  await a.click('report')
  await a.set({report:true})
  await a.move('rest')
  await a.wait(2600)
}
function DemoFrame({compact,children}:{compact:boolean;children:React.ReactNode}) {
  return compact ? <Phone width={334} frame="soft" className="demo-phone">{children}</Phone> : <Window title="Lean4まるみえ" className="demo-window">{children}</Window>
}
function Demo(){return <Stage width={1040} height={600} compact={{below:600,width:358,height:500}} initial={initial} poster={poster} script={script} play="once" cursor={{at:{wide:{x:830,y:440},compact:{x:300,y:450}},ripple:true}} greys="warm" accent="#4f46e5" fidelity="realistic" className="marumie-demo">
{(s,rect,layout)=><>
  <DemoFrame compact={layout==='compact'}>
    <div className="mock-toolbar"><Text className="mock-title">宣言と依存関係</Text><Button data-target="report" data-cursor="pointer" variant="primary">レポート</Button></div>
    <div className="mock-workspace">
      {layout==='wide'&&<aside className="mock-list"><Text className="mock-label">宣言を探す</Text>
        {['meet_comm','meet_assoc','pair_inj','cast_add','em_or','meet_idem','join_absorb','meet_absorb','double'].map((name,i)=><Row key={name} className="mock-row" selected={i===2&&s.selected} title={<Text className="mock-id">{name}</Text>} data-target={i===2?'theorem':undefined} data-cursor="pointer" />)}
      </aside>}
      <div className="mock-graph">
        <div className="mock-graph-heading"><Text className="mock-label">依存先</Text><Text className="mock-hint">宣言が使うもの</Text></div>
        <svg className="mock-edges" viewBox="0 0 500 360" preserveAspectRatio="none" aria-hidden="true"><path d="M250 250C250 170 120 165 120 90M250 250C250 170 380 165 380 90" className={s.traced?'traced':''}/></svg>
        <div className="mock-node node-left" data-target="dependency" data-cursor="pointer" data-traced={s.traced}><Text>Pair.mk.injEq</Text></div>
        <div className="mock-node node-right"><Text>Eq</Text></div>
        <div className="mock-node node-center" data-selected={s.selected} data-target={layout==='compact'?'theorem':undefined} data-cursor="pointer"><Text>pair_inj</Text></div>
        <div className="mock-claim"><Text className="mock-label">主張</Text><Text className="mock-formula">Pair a b = Pair a′ b′ → a = a′ ∧ b = b′</Text></div>
        <div className="mock-caption"><States value={s.traced?'trace':s.selected?'selected':'initial'} states={{initial:<Text>宣言を選んで、構造を見る</Text>,selected:<Text>この定理は、何を使っている？</Text>,trace:<Text>依存先を選ぶと、経路が見える</Text>}}/></div>
      </div>
    </div>
  </DemoFrame>
  <div className="mock-report" data-show={s.report}>
    <Text className="report-heading">証明の構造をレポートに</Text>
    <div className="mock-markdown"><span># Examples.pair_inj</span><span>## 主張</span><span>a = a′ ∧ b = b′</span><span>## 公理</span><span>公理非依存</span></div>
    <Text className="report-foot">Markdownで保存できる</Text>
  </div>
  <span data-target="rest" className="mock-rest" />
</>}
</Stage>}
const root=createRoot(document.getElementById('root')!)
let generation=0
function render(){root.render(new URLSearchParams(location.search).has('gold') ? <CloseUp/> : <Demo key={generation++}/>)}
render()
document.getElementById('replay')!.onclick=render
