import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import './demo.css'
import {Button} from './Button'

function Demo(){
 const [mobile,setMobile]=useState(matchMedia('(max-width:600px)').matches)
 return <main>
  <header className="demo-heading"><h1>実際のビューアで、依存関係をたどる</h1><p>サンプルの宣言を検索し、依存先を選び、レポートを開くまでの実操作です。画面・グラフ・主張の差し替えはありません。</p></header>
  <div className="demo-toolbar"><div className="demo-switch" role="group" aria-label="録画の画面サイズ"><Button aria-pressed={!mobile} onClick={()=>setMobile(false)}>デスクトップ</Button><Button aria-pressed={mobile} onClick={()=>setMobile(true)}>スマートフォン</Button></div><a href="./viewer/index.html">ビューアを操作する</a></div>
  <figure className={mobile?'demo-video compact':'demo-video'}><video key={String(mobile)} controls playsInline preload="metadata" poster={`./recordings/demo-poster-${mobile?390:1440}.png`} aria-label="Lean4まるみえの実画面の操作録画"><source src={`./recordings/lean4-marumie-demo-${mobile?390:1440}.mp4`} type="video/mp4"/>お使いのブラウザでは動画を再生できません。</video><figcaption>実画面の録画 · サンプルデータ「Examples.meet_comm」</figcaption></figure>
 </main>
}
createRoot(document.getElementById('root')!).render(<Demo/>);
