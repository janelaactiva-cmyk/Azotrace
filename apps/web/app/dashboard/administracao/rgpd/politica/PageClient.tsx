'use client';
import { confirmMessage } from '~/lib/app-messages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Save, Send, FileText, RefreshCw } from 'lucide-react';
import { useTheme } from '~/lib/theme-context';
import { supabase } from '~/lib/supabase';
import { useLocalUser } from '../../../_lib/use-local-user';
import { targetUserId } from '../../../_lib/online-state';
import { companyPrivacyUrl, type CompanyPrivacy, type PrivacyCompany } from '~/lib/company-privacy';
import styles from './company-privacy.module.css';

async function privacyRequest<T>(query='',body?:unknown):Promise<T>{
 const{data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw new Error('Inicia sessão para continuar.');
 const headers:Record<string,string>={Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'};
 const target=targetUserId();if(target)headers['x-azotrace-user-id']=target;
 const response=await fetch('/api/azotrace/company-privacy'+query,{method:body===undefined?'GET':'PUT',cache:'no-store',signal:AbortSignal.timeout(30000),headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(result?.error||'Não foi possível concluir o pedido.');
 return result as T;
}
const date=(value:string|null)=>value?new Intl.DateTimeFormat('pt-PT',{timeZone:'Atlantic/Azores',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
export default function PageClient(){
 const user=useLocalUser(),{theme}=useTheme();
 const [companies,setCompanies]=useState<PrivacyCompany[]>([]),[companyId,setCompanyId]=useState('');
 const [policy,setPolicy]=useState<CompanyPrivacy|null>(null),[content,setContent]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(false),[attempt,setAttempt]=useState(0),[listAttempt,setListAttempt]=useState(0);
 const pending=useRef(false),generation=useRef(0);
 const allowed=user.active&&(user.role==='superadmin'||user.role==='admin'||user.permissions.includes('rgpd.manage'));
 const dirty=!!policy&&content!==policy.draft_content;
 const company=companies.find(row=>row.id===companyId);
 useEffect(()=>{let active=true;setCompanies([]);setCompanyId('');setPolicy(null);setContent('');setError('');if(!allowed)return;
  setLoading(true);void privacyRequest<{companies:PrivacyCompany[]}>().then(result=>{if(active){setCompanies(result.companies);setCompanyId(result.companies.find(row=>row.id===user.companyId)?.id||result.companies[0]?.id||'');}}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[user.id,user.companyId,allowed,listAttempt]);
 const reload=useCallback(async()=>{if(!companyId||!allowed)return;const current=++generation.current;setLoading(true);setPolicy(null);setContent('');setNotice('');setError('');setPreview(false);
  try{const result=await privacyRequest<{policy:CompanyPrivacy}>('?company='+encodeURIComponent(companyId));if(current===generation.current){setPolicy(result.policy);setContent(result.policy.draft_content);}}
  catch(cause){if(current===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar.');}
  finally{if(current===generation.current)setLoading(false);}
 },[companyId,allowed]);
 useEffect(()=>{void reload();return()=>{generation.current++;};},[reload,attempt]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 async function canDiscard(){return !dirty||(await confirmMessage('Tens alterações por guardar. Queres descartá-las?'));}
 async function save(action:'save'|'publish'){
  if(pending.current||!policy||!companyId)return;
  if(action==='publish'&&!(await confirmMessage('Publicar a política de '+(user.role==='superadmin'?'Azotrace':company?.name)+'? O texto ficará acessível através da ligação pública desta empresa.')))return;
  const current=generation.current;
  pending.current=true;setBusy(true);setError('');setNotice('');
  try{const result=await privacyRequest<{policy:CompanyPrivacy}>('',{companyId,content,version:policy.version,action});if(current!==generation.current)return;setPolicy(result.policy);setContent(result.policy.draft_content);setNotice(action==='publish'?user.role==='superadmin'?'Política da Azotrace publicada.':'Política publicada para a tua empresa.':'Rascunho guardado. A versão pública mantém-se.');}
  catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível guardar.');}
  finally{pending.current=false;setBusy(false);}
 }
 if(!user.id)return <p role="status">A validar a sessão…</p>;
 if(!allowed)return <p role="alert">Sem permissão para gerir a política de privacidade.</p>;
 return <div className={styles.root} data-theme={theme}>
  <header className={styles.header}><div><h1>Política de Privacidade</h1><p>{user.role==='superadmin'?'Gere a política de privacidade da plataforma Azotrace.':'Gere a política de privacidade da tua empresa.'}</p></div><a className={styles.secondary} href="/privacy" target="_blank" rel="noopener noreferrer">Política da Azotrace <ExternalLink size={15} aria-hidden="true"/></a></header>

  {error?<div className={styles.error} role="alert">{error}{!companyId?<button type="button" disabled={busy||loading} className={styles.secondary} onClick={()=>setListAttempt(value=>value+1)}>Tentar novamente</button>:null}</div>:null}{notice?<p className={styles.success} role="status">{notice}</p>:null}
  {loading?<p role="status">A carregar a política…</p>:null}
  {!loading&&!companyId&&!error?<div className={styles.panel}>Não existe uma empresa disponível para gerir a política.</div>:null}
  {companyId?<div className={styles.layout}><aside className={styles.panel}><span className={styles.icon}><FileText size={23} aria-hidden="true"/></span><h2>{user.role==='superadmin'?'Azotrace':company?.name||'Empresa'}</h2><span className={styles.badge}>{policy?.published_at?'Com versão publicada':'Por publicar'}</span><dl><dt>Última gravação</dt><dd>{date(policy?.updated_at||null)}</dd><dt>Publicação atual</dt><dd>{date(policy?.published_at||null)}</dd></dl><p>Guarda um rascunho enquanto preparas o texto. Publica quando estiver pronto para consulta.</p>{policy?.published_at?<a className={styles.secondary} href={user.role==='superadmin'?'/privacy':companyPrivacyUrl(companyId)} target="_blank" rel="noopener noreferrer">Ver versão publicada <ExternalLink size={14} aria-hidden="true"/></a>:null}<button type="button" disabled={busy||loading} className={styles.secondary} onClick={async ()=>{if((await canDiscard()))setAttempt(value=>value+1);}}><RefreshCw size={14} aria-hidden="true"/> Recarregar</button></aside>
   <section className={styles.panel} aria-label="Editor da política da empresa"><div className={styles.editorHeader}><h2>{user.role==='superadmin'?'Documento da Azotrace':'Documento da empresa'}</h2><span className={styles.muted} aria-live="polite">{dirty?'Alterações por guardar':policy&&policy.published_content!==null&&policy.draft_content!==policy.published_content?'Rascunho diferente da publicação':policy?'Texto guardado':''}</span></div>
   {policy?<><div className={styles.tabs} role="group" aria-label="Modo do editor"><button type="button" disabled={busy} aria-pressed={!preview} onClick={()=>setPreview(false)}>Editar texto</button><button type="button" disabled={busy} aria-pressed={preview} onClick={()=>setPreview(true)}>Pré-visualizar</button></div>
    {preview?<article className={styles.preview} aria-label="Pré-visualização do rascunho">{content||'O rascunho ainda não tem texto.'}</article>:<label className={styles.editorLabel}>Texto da política<textarea value={content} disabled={busy} maxLength={100000} rows={20} onChange={event=>setContent(event.target.value)} placeholder={user.role==='superadmin'?'Introduz a política da plataforma Azotrace.':'Introduz a política de privacidade da tua empresa.'}/></label>}
    <p className={styles.muted}>{content.length.toLocaleString('pt-PT')} / 100 000 caracteres · Texto simples, com parágrafos e títulos.</p>
    <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy||loading} onClick={()=>void save('save')}><Save size={16} aria-hidden="true"/>{busy?'A guardar…':'Guardar rascunho'}</button><button type="button" className={styles.primary} disabled={busy||loading||!content.trim()} onClick={()=>void save('publish')}><Send size={16} aria-hidden="true"/>Publicar política</button></div>
   </>:!loading?<p>Recarrega para tentar consultar o documento.</p>:null}</section></div>:null}
 </div>;
}
