'use client';
import { useEffect,useState } from 'react';
import { supabase } from '~/lib/supabase';
import { CatalogSchema,CatalogDataSchema,defaultCatalogData,type Catalog,type Plan } from '~/lib/plan-catalog';
import { PlanCardsView } from '~/components/PlanCards';
import { useLocalUser } from '../../_lib/use-local-user';
export default function PlanCatalogEditor(){
 const user=useLocalUser(),[catalog,setCatalog]=useState<Catalog>({...defaultCatalogData,version:1}),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const [publishedCatalogLoaded,setPublishedCatalogLoaded]=useState(false);
 async function headers(){const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Inicia sessão novamente.');return {'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`};}
 async function load(discardDraft=false){setBusy(true);try{const response=await fetch('/api/azotrace/plan-catalog',{headers:await headers(),cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error);const next=CatalogSchema.parse(result);setCatalog(previous=>dirty&&!discardDraft?{...next,plans:previous.plans}:next);if(discardDraft||!dirty)setDirty(false);setPublishedCatalogLoaded(true);setError('');}catch(cause){setPublishedCatalogLoaded(false);setError(cause instanceof Error?cause.message:'Não foi possível carregar os planos.');}finally{setBusy(false);}}
 useEffect(()=>{if(user.role==='superadmin')void load();},[user.id,user.role]);
 function update(id:Plan['id'],field:keyof Plan,value:unknown){setCatalog(previous=>previous?{...previous,plans:previous.plans.map(plan=>plan.id===id?{...plan,[field]:value}:field==='recommended'&&value===true?{...plan,recommended:false}:plan)}:previous);setDirty(true);setMessage('');}
 async function save(){if(!publishedCatalogLoaded||busy)return;const checked=CatalogDataSchema.safeParse({plans:catalog.plans});if(!checked.success){setError(checked.error.issues[0]?.message||'Verifica os dados dos planos.');return;}setBusy(true);setError('');try{
 const response=await fetch('/api/azotrace/plan-catalog',{method:'PATCH',headers:await headers(),body:JSON.stringify({version:catalog.version,data:checked.data})});const result=await response.json();if(!response.ok)throw new Error(result.error);setCatalog(CatalogSchema.parse(result));setDirty(false);setMessage('Alterações publicadas. Os cartões ligados ao preçário atualizam-se automaticamente em até 30 segundos.');
 }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível guardar.');}finally{setBusy(false);}}
 if(user.role!=='superadmin')return <p>Só o Super Admin pode editar o preçário.</p>;
 return <main style={{maxWidth:1350,margin:'auto',padding:24}}><a href="/dashboard/subscricoes">← Pagamentos e subscrições</a><h1>Planos e preçário</h1><p>Edita os cartões da plataforma e do site. Os preços são anuais, antes de IVA.</p>
 {!publishedCatalogLoaded?<p role="status">Podes preparar alterações a partir dos valores de referência. Para publicar, é necessário carregar o catálogo configurado. As alterações ainda não publicadas perdem-se ao sair desta página.</p>:null}
 {error?<div role="alert"><p style={{color:'#b91c1c'}}>{error}</p><button disabled={busy} onClick={()=>void load()}>{busy?'A tentar novamente…':'Tentar novamente'}</button></div>:null}{message?<p role="status">{message}</p>:null}
 {catalog?<><fieldset disabled={busy} style={{border:0,padding:0,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>{catalog.plans.map(plan=><section key={plan.id} style={{background:'#fff',color:'#172033',padding:22,border:'1px solid #dce4ed',borderRadius:14}}><h2>{plan.id}</h2>
 <label style={{display:'block'}}>Preço anual (€)<input style={{display:'block',width:'100%',padding:10}} type="number" min="1" step="0.01" value={plan.annualCents/100} onChange={e=>update(plan.id,'annualCents',Math.round(Number(e.target.value)*100))}/></label>
 <label style={{display:'block',marginTop:12}}>Descrição<textarea style={{width:'100%',padding:10}} value={plan.description} onChange={e=>update(plan.id,'description',e.target.value)}/></label>
 {([['businesses','Negócios'],['users','Utilizadores'],['databaseMb','Dados de produção (MB)'],['storageGb','Ficheiros (GB)'],['supportDays','Primeira resposta (dias úteis)']] as const).map(([field,label])=><label key={field} style={{display:'block',marginTop:12}}>{label}<input type="number" min="1" step={field==='storageGb'?'0.1':'1'} style={{width:'100%',padding:10}} value={plan[field]} onChange={e=>update(plan.id,field,Number(e.target.value))}/></label>)}
 <label style={{display:'block',marginTop:12}}>Prioridade dos tickets<select style={{display:'block',width:'100%',padding:10}} value={plan.supportPriority} onChange={e=>update(plan.id,'supportPriority',e.target.value)}>{['normal','elevada','máxima'].map(value=><option key={value}>{value}</option>)}</select></label>
 <label style={{display:'block',marginTop:12}}>Relatórios<input style={{width:'100%',padding:10}} value={plan.reports} onChange={e=>update(plan.id,'reports',e.target.value)}/></label>
 <label style={{display:'block',marginTop:12}}>Funcionalidades (uma por linha)<textarea rows={5} style={{width:'100%',padding:10}} value={plan.features.join('\n')} onChange={e=>update(plan.id,'features',e.target.value.split('\n'))}/></label>
 <label style={{display:'block',marginTop:14}}><input type="checkbox" checked={plan.recommended} onChange={e=>update(plan.id,'recommended',e.target.checked)}/> Plano recomendado</label></section>)}</fieldset>
 <div style={{display:'flex',gap:12,margin:'24px 0'}}><button disabled={busy||!dirty||!publishedCatalogLoaded} onClick={()=>void save()} style={{padding:'12px 20px',background:'#234d87',color:'#fff',border:0,borderRadius:8}}>{busy?'A publicar…':'Publicar alterações'}</button><button disabled={busy} onClick={()=>{if(!dirty||window.confirm('Descartar as alterações ainda não publicadas?'))void load(true);}}>Atualizar do servidor</button></div>
 <h2>Pré-visualização dos cartões</h2><PlanCardsView catalog={catalog} disabled/>
 <p>Os limites e prazos apresentados são condições comerciais. Este editor não configura bloqueios de utilização nem atribui prioridades aos tickets.</p>
 <h2>No www.azotrace.com</h2><p>Insere o bloco incorporável uma vez na página dos planos. Depois, as alterações são feitas apenas aqui, preservando o restante conteúdo do site.</p>
 <code style={{display:'block',whiteSpace:'pre-wrap',padding:16,background:'#eef3f8',color:'#172033'}}>{`<div data-azotrace-plans></div>\n<script src="${typeof window!=='undefined'?window.location.origin:''}/plans-widget.js" defer></script>`}</code>
 </>:!error?<p>A carregar planos…</p>:null}</main>;
}
