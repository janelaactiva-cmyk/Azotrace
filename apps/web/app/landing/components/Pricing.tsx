'use client';
import { useEffect } from 'react';
import PlanCards from '~/components/PlanCards';
import type { Catalog } from '~/lib/plan-catalog';

export default function Pricing({initialCatalog}:{initialCatalog?:Catalog}){
 useEffect(()=>{
  let frame=0,disposed=false,interrupted=false;
  const position=()=>{
   if(disposed||interrupted||window.location.hash!=='#pricing')return;
   window.cancelAnimationFrame(frame);
   frame=window.requestAnimationFrame(()=>{
    if(disposed||interrupted)return;
    const target=document.getElementById('pricing');
    if(target)window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-80),behavior:'instant'});
   });
  };
  const stop=()=>{interrupted=true;window.cancelAnimationFrame(frame);};
  const hash=()=>{interrupted=false;position();};
  position();
  window.addEventListener('load',position);
  window.addEventListener('hashchange',hash);
  window.addEventListener('wheel',stop,{passive:true});
  window.addEventListener('pointerdown',stop,{passive:true});
  window.addEventListener('keydown',stop);
  void document.fonts?.ready.then(position);
  return()=>{disposed=true;window.cancelAnimationFrame(frame);window.removeEventListener('load',position);window.removeEventListener('hashchange',hash);window.removeEventListener('wheel',stop);window.removeEventListener('pointerdown',stop);window.removeEventListener('keydown',stop);};
 },[]);
 return <section id="pricing" style={{padding:'70px 20px',background:'#f7f9fc',scrollMarginTop:80}}><div style={{maxWidth:1200,margin:'auto'}}><h2 style={{textAlign:'center',fontSize:34,color:'#234d87'}}>Escolhe o teu plano Azotrace</h2><p style={{textAlign:'center',marginBottom:32,color:'#586577'}}>Organiza a produção, acompanha a equipa e partilha a origem dos teus produtos.</p><PlanCards initialCatalog={initialCatalog}/></div></section>;
}
