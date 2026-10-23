'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const Chatbot = dynamic(() => import('~/app/landing/components/Chatbot'), {
  loading: () => <p role="status" style={{position:'fixed',bottom:160,right:24,zIndex:9999,padding:16,borderRadius:12,background:'#fff',color:'#000'}}>A abrir o assistente…</p>,
});
export default function ChatbotLauncher({ mode }: { mode: 'help' | 'tickets' }) {
  const [activated, setActivated] = useState(false);
  if (activated) return <Chatbot mode={mode} initialOpen />;
  return <button type="button" aria-label="Abrir assistente Azotrace" aria-expanded={false}
    onClick={() => setActivated(true)} style={{position:'fixed',bottom:90,right:24,zIndex:9999,width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg, #234D87 0%, #1a3a6b 100%)',color:'#fff',border:0,fontSize:28,cursor:'pointer',boxShadow:'0 8px 32px rgba(35,77,135,.35)',display:'grid',placeItems:'center'}}>
    <img src="/assets/images/azoia-head-azotrace.webp" alt="" aria-hidden="true" width={38} height={38} style={{display:'block'}} /><span aria-hidden="true" style={{position:'absolute',top:-4,right:-4,width:16,height:16,background:'#22c55e',borderRadius:'50%',border:'3px solid white'}} />
  </button>;
}
