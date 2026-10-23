'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';

import { useEffect,useState,type FormEvent } from 'react';
import type { PlatformSettings } from '~/lib/platform-settings';
import { settingsRequest } from './settings-request';
import styles from './settings.module.css';
export default function PlatformForm(){
 const [data,setData]=useState<PlatformSettings|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setError('');setData(null);void settingsRequest<PlatformSettings>().then(value=>{if(active)setData(value);}).catch(cause=>{if(active)setError(uiMessagePt(cause.message));});return()=>{active=false;};},[attempt]);
 async function save(event:FormEvent){event.preventDefault();if(!data||busy)return;setBusy(true);setError('');setNotice('');try{const saved=await settingsRequest<PlatformSettings>('PUT',data);setData(saved);setNotice('Dados guardados no Supabase.');}catch(cause){setError(uiMessagePt(cause instanceof Error?cause.message:'Não foi possível guardar.'));}finally{setBusy(false);}}
 const control={padding:11,border:'1px solid #94a3b8',borderRadius:8,background:'transparent',color:'inherit',font:'inherit'};
 return <div className={styles.formPage}><p>Dados institucionais da plataforma. O email de contacto é independente do email da tua conta.</p>
 {error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
 <button type="button" disabled={busy} onClick={()=>{setNotice('');setAttempt(value=>value+1);}}>Recarregar dados</button>
 {data?<form onSubmit={save} className={styles.form}>
 <label style={{display:'grid',gap:8}}>Nome da plataforma<input style={control} required maxLength={100} value={data.site_name} disabled={busy} onChange={event=>setData({...data,site_name:event.target.value})}/></label>
 <label style={{display:'grid',gap:8}}>Descrição<textarea style={control} rows={3} maxLength={500} value={data.description} disabled={busy} onChange={event=>setData({...data,description:event.target.value})}/></label>
 <label style={{display:'grid',gap:8}}>Email institucional de contacto<input style={control} type="email" maxLength={254} value={data.contact_email} disabled={busy} onChange={event=>setData({...data,contact_email:event.target.value})}/></label>
 <p>Estes dados são guardados nesta configuração. Os textos e contactos já publicados na landing mantêm a sua edição própria.</p>
 {data.updated_at?<small>Última gravação: {new Date(data.updated_at).toLocaleString('pt-PT',{timeZone:'Atlantic/Azores'})}</small>:null}
 <button disabled={busy} type="submit" className={styles.primary}>{busy?'A guardar…':'Guardar dados da plataforma'}</button>
 </form>:!error?<p role="status">A carregar dados…</p>:null}</div>;
}
