'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { safeAuthNext, withAuthTimeout } from '~/lib/auth-navigation';
import { loadOnlineContext, resetOnlineSession } from '~/app/dashboard/_lib/online-billing';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  const [leaving,setLeaving] = useState(false);
  useEffect(()=>{
    let cancelled = false;
    async function complete() {
      setError('');
      const parameters = new URLSearchParams(window.location.search);
      const failure = parameters.get('error') || new URLSearchParams((window.location.hash || '').slice(1)).get('error');
      if (failure) throw new Error(failure==='access_denied' ? 'A entrada com o Google foi cancelada.' : 'O Google não concluiu a autenticação. Volta a tentar iniciar sessão.');
      // detectSessionInUrl=true in the shared browser client completes PKCE
      // from the same localStorage that holds its verifier. Do not exchange twice.
      const {data,error:sessionError} = await supabase.auth.getSession();
      if (sessionError || !data.session) throw new Error('Não foi possível concluir a sessão Google. Volta a entrar no mesmo navegador em que iniciaste o processo.');
      const identity = await supabase.auth.getUser();
      if (identity.error || !identity.data.user) throw new Error('A sessão Google não é válida. Volta a iniciar sessão.');
      await loadOnlineContext();
      if (!cancelled) router.replace(safeAuthNext(parameters.get('next')));
    }
    void withAuthTimeout(complete(),'Não foi possível concluir a validação a tempo. Tenta novamente.',30000)
      .catch(cause=>{if(!cancelled){cancelled=true;setError(uiMessagePt(cause instanceof Error?cause.message:'Não foi possível validar a conta.'));}});
    return()=>{cancelled=true;};
  },[router,attempt]);
  async function leave() {
    setLeaving(true);
    try {
      const result = await supabase.auth.signOut({scope:'local'});
      if(result.error)throw result.error;
      resetOnlineSession();window.location.replace('/landing');
    }catch{setError('Não foi possível terminar a sessão. Tenta novamente.');setLeaving(false);}
  }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f3f4f6',padding:24}}><section style={{maxWidth:520,padding:32,background:'white',borderRadius:12,color:'#111827'}}><h1>Entrar com o Google</h1>{error?<><p role="alert">{error}</p><p>A autenticação Google não substitui a ativação da conta e a confirmação do pagamento.</p><button type="button" onClick={()=>setAttempt(value=>value+1)} disabled={leaving}>Tentar validar novamente</button><p><a href="/checkout/success">Verificar pagamento e configurar a conta</a></p><button type="button" onClick={()=>void leave()} disabled={leaving}>Encerrar sessão e voltar à landing</button></>:<p role="status">A validar a sessão Google e o acesso à conta…</p>}</section></main>;
}
