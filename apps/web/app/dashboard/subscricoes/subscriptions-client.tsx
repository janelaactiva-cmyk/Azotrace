'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useTheme } from '~/lib/theme-context';
import { LOCAL_PLANS, type LocalPlan, annualExpiry, localDate } from '../_lib/local-subscriptions';
import { LOCAL_SESSION_EVENT } from '../_lib/local-users';
import { loadOnlineBilling, downgradeOnlinePlan, associateOnlineSubscription, checkoutOnlineUpgrade, onlineRpc, ONLINE_BILLING_EVENT, type OnlineBilling, type OnlineSubscription } from '../_lib/online-billing';
import { billingStatus } from '../_lib/billing-display';
import { subscriptionDateLabel } from '~/lib/subscription-dates';
import { customerHistory, customerSubscriptions, proportionalPlanChange, subscriptionDaysLabel, subscriptionTiming, type HistoryKind } from '../_lib/billing-details';
import { CustomerHistory, SubscriptionValidity } from './billing-panels';
import { usePlanCatalog } from '~/lib/use-plan-catalog';
import { PlanCardsView } from '~/components/PlanCards';
import { defaultCatalogData } from '~/lib/plan-catalog';
import { useLocalUser } from '../_lib/use-local-user';
import { linkedCompanySubscription } from '~/lib/company-directory';
const money = (n: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
const date = subscriptionDateLabel;
const labels: Record<string,string> = { active: 'Ativa', inactive: 'Inativa', canceled: 'Cancelada', expired: 'Expirada', scheduled: 'Agendada', unknown: 'Por verificar' };
const button: CSSProperties = { padding: '10px 14px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer' };
export default function SubscriptionsPage() {
 const {catalog,error:catalogError}=usePlanCatalog();
 const user=useLocalUser();
 const displayedCatalog=catalog??{...defaultCatalogData,version:1};
 const billedPrice=(p:LocalPlan)=>Math.round((catalog?.plans.find(plan=>plan.id===p)?.annualCents||0)*1.16)/100;
 const { theme } = useTheme(); const generation = useRef(0);
 const [data, setData] = useState<OnlineBilling | null>(null), [error,setError] = useState(''), [notice,setNotice] = useState('');
 const detailsRef = useRef<HTMLElement | null>(null);
 const companyLink=useRef({companyId:'',subscriptionId:'',applied:false});
 const [companyFilter,setCompanyFilter]=useState('');
 const [viewRequest,setViewRequest] = useState<{id:string} | null>(null);
 const [selectedId,setSelectedId] = useState(''), [search,setSearch] = useState(''), [busy,setBusy] = useState(false);
 const [historyFilter,setHistoryFilter] = useState<HistoryKind|'all'>('all'), [statusFilter,setStatusFilter] = useState('all');
 const [renewalFilter,setRenewalFilter] = useState<number|null>(null);
 const [pending,setPending] = useState<LocalPlan|null>(null), [association,setAssociation] = useState(''), [editor,setEditor] = useState<'create'|'edit'|null>(null);
 const dark=theme==='dark'; const muted=dark?'#9ca3af':'#6b7280';
 const card: CSSProperties = { padding:22,border:`1px solid ${dark?'#374151':'#e5e7eb'}`,borderRadius:12,background:dark?'#1f2937':'white' };
 const control: CSSProperties = { padding:10,border:'1px solid #9ca3af',borderRadius:8,background:dark?'#1f2937':'white',color:'inherit' };
 async function refresh(clear=false) {
  const g=++generation.current;if(clear){setData(null);setPending(null);setEditor(null);}
  try { const next=await loadOnlineBilling(); if(g!==generation.current)return;setData(next);setError('');
   const link=companyLink.current;
   if(link.companyId&&!link.applied){
    link.applied=true;
    const target=linkedCompanySubscription(next.subscriptions,link.companyId,link.subscriptionId);
    setSelectedId(target?.id||'');
    if(target)setViewRequest({id:target.id});
    else setNotice('Não existe uma subscrição associada a esta empresa. As compras por associar são geridas separadamente.');
   }else setSelectedId(id=>next.subscriptions.some(s=>s.id===id&&(!link.companyId||s.companyId===link.companyId))?id:next.subscriptions.find(s=>!link.companyId||s.companyId===link.companyId)?.id||''); }
  catch(e){if(g===generation.current){setData(null);setError(uiMessagePt(e instanceof Error?e.message:'Não foi possível carregar as subscrições.'));}}
 }
 useEffect(()=>{
  const requestedCompany=new URLSearchParams(window.location.search);
  companyLink.current={companyId:requestedCompany.get('empresa')||'',subscriptionId:requestedCompany.get('subscricao')||'',applied:false};
  setCompanyFilter(companyLink.current.companyId);
  void refresh(); const reload=()=>void refresh(), session=()=>void refresh(true);
  window.addEventListener(ONLINE_BILLING_EVENT,reload);window.addEventListener(LOCAL_SESSION_EVENT,session);
  const timer=window.setInterval(reload,15000); const focus=()=>void refresh();window.addEventListener('focus',focus);
  const payment=new URLSearchParams(window.location.search).get('pagamento');
  if(payment==='recebido')setNotice('Regressou do Stripe. O plano será atualizado quando o pagamento for confirmado.');
  if(payment==='cancelado')setNotice('Saiu do pagamento. O plano mantém-se até à confirmação de um pagamento.');
  return()=>{generation.current++;window.clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener(ONLINE_BILLING_EVENT,reload);window.removeEventListener(LOCAL_SESSION_EVENT,session);};
 },[]);
 const selected=data?.subscriptions.find(s=>s.id===selectedId), sa=user.role==='superadmin';
 useEffect(()=>{setPending(null);setAssociation('');setEditor(null);setHistoryFilter('all');},[selected?.id,selected?.version]);
 useEffect(()=>{
  if(!viewRequest||viewRequest.id!==selected?.id||!detailsRef.current)return;
  detailsRef.current.scrollIntoView({behavior:'smooth',block:'start'});
  detailsRef.current.focus({preventScroll:true});
 },[viewRequest,selected?.id]);
 function viewSubscription(id:string) {
  if(!data?.subscriptions.some(subscription=>subscription.id===id))return;
  setSelectedId(id);
  setViewRequest({id});
 }
 const company=(id:string)=>data?.companies.find(c=>c.id===id)?.name||(id?'Empresa indisponível':'Por associar');
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  const timer=window.setInterval(tick,30000);
  window.addEventListener('focus',tick);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',tick);};
 },[]);
 const clientSubscriptions=selected&&data?customerSubscriptions(selected,data.subscriptions):[];
 const history=selected&&data?customerHistory(selected,data.subscriptions):[];
 const clientSubscriptionIds=new Set(clientSubscriptions.map(row=>row.id));
 const clientOrders=data?.orders.filter(order=>clientSubscriptionIds.has(order.subscriptionId))||[];
 const estimate=selected&&pending&&catalog?proportionalPlanChange(selected,pending,catalog.plans,now):null;
 const endingWithin=(row:OnlineSubscription,days:number)=>billingStatus(row,now)==='active'&&(subscriptionTiming(row,now)?.remainingDays??Infinity)<=days;
 const rows=data?.subscriptions.filter(s=>(!companyFilter||s.companyId===companyFilter)&&(statusFilter==='all'||billingStatus(s,now)===statusFilter)&&(renewalFilter===null||endingWithin(s,renewalFilter))&&`${company(s.companyId)} ${s.billingName} ${s.billingEmail} ${s.nif} ${s.planName}`.toLowerCase().includes(search.toLowerCase()))||[];
 const active=selected&&billingStatus(selected,now)==='active'&&selected.plan&&selected.companyId;
 async function act(fn:()=>Promise<unknown>, message:string) {
  setBusy(true);setError('');try{await fn();setNotice(message);await refresh();setPending(null);}catch(e){setError(uiMessagePt(e instanceof Error?e.message:'Não foi possível guardar.'));}finally{setBusy(false);}
 }
 async function change() {
  if(!catalog||catalogError||!selected?.plan||!pending||pending===selected.plan||busy)return;
  if(billedPrice(pending)<billedPrice(selected.plan))await act(()=>downgradeOnlinePlan(selected,pending),'Downgrade aplicado imediatamente, sem reembolso. A validade foi mantida.');
  else {setBusy(true);setError('');try{window.location.assign(await checkoutOnlineUpgrade(selected,pending,catalog.version));}catch(e){setError(uiMessagePt(e instanceof Error?e.message:'Não foi possível abrir o Stripe.'));setBusy(false);}}
 }
 return <div style={{maxWidth:1300,margin:'0 auto',display:'grid',gap:20,color:dark?'#f9fafb':'#111827'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><h1 style={{margin:'0 0 6px',fontSize:25}}>{sa?'Pagamentos e subscrições — clientes':'A minha subscrição'}</h1><p style={{color:muted}}>Compras e subscrições registadas na base de dados.</p></div><div><button style={control} disabled={busy} onClick={()=>void refresh()}>Atualizar</button>{sa?<a href="/dashboard/subscricoes/planos" style={{...button,display:'inline-block',marginLeft:10,textDecoration:'none'}}>Gerir planos e preços</a>:null}{sa?<button style={{...button,marginLeft:10}} disabled={busy} onClick={()=>setEditor('create')}>+ Registar subscrição</button>:null}</div></header>
  {!sa?<section aria-labelledby="payment-plans-title" style={{display:'grid',gap:16}}>
   <h2 id="payment-plans-title" style={{margin:0}}>Planos de pagamento</h2>
   {!catalog?<p role={catalogError?'alert':'status'} style={{margin:0,color:muted}}>{catalogError?'Preçário publicado indisponível. Os valores abaixo são de referência; as compras estão temporariamente indisponíveis.':'A carregar o preçário atualizado. As compras estarão disponíveis após a confirmação dos preços.'}</p>:catalogError?<p role="alert">{catalogError}</p>:null}
   <PlanCardsView catalog={displayedCatalog} selected={selected?.plan||undefined} disabled={!catalog||busy||!!catalogError||!!error||!data||!!selected&&(!active||!selected.plan)} onChoose={selected?plan=>setPending(plan.id===selected.plan?null:plan.id):undefined}/>
  </section>:null}
  {error?<div role="alert" style={{...card,borderColor:'#ef4444'}}>{error}</div>:null}
  {companyFilter?<div style={card}><p>A mostrar pagamentos e subscrições de <strong>{company(companyFilter)}</strong>.</p><div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}><a style={control} href={'/dashboard/super-admin/empresas?empresa='+encodeURIComponent(companyFilter)}>Voltar à ficha da empresa</a><button type="button" style={control} onClick={()=>{companyLink.current={companyId:'',subscriptionId:'',applied:true};setCompanyFilter('');setNotice('');const url=new URL(window.location.href);url.searchParams.delete('empresa');url.searchParams.delete('subscricao');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}}>Mostrar todas as empresas</button></div></div>:null}
  {notice?<div role="status" style={{...card,borderColor:'#10b981'}}>{notice}</div>:null}
  {data?<section aria-label="Resumo das subscrições" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
   <div style={card}><span style={{color:muted}}>Subscrições ativas</span><strong style={{display:'block',fontSize:28,marginTop:8}}>{data.subscriptions.filter(row=>billingStatus(row,now)==='active').length}</strong></div>
   {[15,10,5].map(days=><button key={days} type="button" aria-controls="subscription-list" aria-pressed={renewalFilter===days} onClick={()=>{setRenewalFilter(current=>current===days?null:days);setStatusFilter('all');}} style={{...card,color:'inherit',font:'inherit',textAlign:'left',cursor:'pointer',...(renewalFilter===days?{borderColor:'#2563eb'}:{})}}><span style={{color:muted}}>Terminam em até {days} dias</span><strong style={{display:'block',fontSize:28,marginTop:8}}>{data.subscriptions.filter(row=>endingWithin(row,days)).length}</strong><small style={{display:'block',marginTop:8,color:muted}}>Ver clientes</small></button>)}
   <div style={card}><span style={{color:muted}}>Expiradas</span><strong style={{display:'block',fontSize:28,marginTop:8}}>{data.subscriptions.filter(row=>billingStatus(row,now)==='expired').length}</strong></div>
   <div style={card}><span style={{color:muted}}>Por associar</span><strong style={{display:'block',fontSize:28,marginTop:8}}>{data.subscriptions.filter(row=>!row.companyId).length}</strong><small style={{display:'block',marginTop:8,color:muted}}>Compras sem empresa cliente atribuída.</small></div>
  </section>:null}
  {!data&&!error?<p>A carregar subscrições…</p>:null}
  {editor&&sa&&data?<BillingEditor key={editor==='edit'?selected?.id:'new'} existing={editor==='edit'?selected:undefined} data={data} card={card} control={control} onCancel={()=>setEditor(null)} onSaved={async()=>{setEditor(null);setNotice('Dados guardados na base de dados. Este registo manual não cobra pagamentos.');await refresh();}}/>:null}
  {data&&!data.subscriptions.length?<section style={card}><h2>Ainda não existe uma subscrição {sa?'registada':'associada à sua empresa'}.</h2><p style={{color:muted}}>{sa?'As compras antigas sem empresa atribuída aparecem aqui para associação.':'Se já efetuou uma compra, peça ao Super Admin para verificar a associação à sua empresa.'}</p></section>:null}
  {data?.subscriptions.length?<section id="subscription-list" style={card}><h2>{sa?'Clientes e subscrições':'Resumo da subscrição'}</h2>{renewalFilter!==null?<p role="status">Subscrições que terminam em até {renewalFilter} dias. <button type="button" style={control} onClick={()=>setRenewalFilter(null)}>Mostrar todas</button></p>:null}{sa?<label>Pesquisar cliente <input style={control} placeholder="Empresa, email, NIF ou plano" value={search} onChange={e=>setSearch(e.target.value)}/></label>:null}<label style={{marginLeft:sa?16:0}}>Estado <select aria-label="Filtrar subscrições por estado" style={control} value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">Todos os estados</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><div style={{overflowX:'auto',marginTop:16}}><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}><thead><tr>{['Empresa','Faturação','Plano','Estado','Validade','Dias restantes',''].map((s,i)=><th key={i} style={{padding:12}}>{s}</th>)}</tr></thead><tbody>{rows.map(s=><tr key={s.id} style={{background:s.id===selectedId?(dark?'#374151':'#eff6ff'):undefined}}><td style={{padding:12}}>{company(s.companyId)}</td><td style={{padding:12}}>{s.billingName||'—'}<div style={{color:muted,fontSize:12}}>{s.billingEmail||'—'}</div></td><td style={{padding:12}}>{s.planName||'Plano por identificar'}</td><td style={{padding:12}}>{labels[billingStatus(s,now)]||s.status||'—'}</td><td style={{padding:12}}>{date(s.expiresAt)}</td><td style={{padding:12,fontWeight:600}}>{subscriptionDaysLabel(s,now)}</td><td><button type="button" style={control} aria-controls="subscription-details" aria-label={`Ver subscrição de ${company(s.companyId)}`} onClick={()=>viewSubscription(s.id)}>Ver</button></td></tr>)}{!rows.length?<tr><td colSpan={7} style={{padding:16}}>Nenhuma subscrição corresponde aos filtros.</td></tr>:null}</tbody></table></div></section>:null}
  {selected?<>
   <section ref={detailsRef} id="subscription-details" tabIndex={-1} aria-label={`Detalhes da subscrição de ${company(selected.companyId)}`} style={{...card,scrollMarginTop:24}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><h2>{company(selected.companyId)}</h2>{sa&&selected.companyId?<button style={control} disabled={busy} onClick={()=>setEditor('edit')}>Editar dados e validade</button>:null}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}><div><h3>Faturação</h3><p>{selected.billingName||'—'}<br/>{selected.billingEmail||'—'}</p><p>NIF: {selected.nif||'—'}<br/>Morada: {selected.address||'—'}</p></div><div><h3>Subscrição</h3><p>Plano: <strong>{selected.planName||'Por identificar'}</strong></p><p>Início: {date(selected.startedAt)}<br/>Validade: {date(selected.expiresAt)}</p><p>Origem: {selected.stripeSessionId?'Compra Stripe':'Registo sem sessão Stripe'}</p></div></div>
   <SubscriptionValidity subscription={selected} now={now}/>
   {sa&&!selected.companyId?<div><p>Confirme a empresa titular desta compra antes de a associar.</p><select aria-label="Empresa titular" style={control} value={association} onChange={e=>setAssociation(e.target.value)}><option value="">Selecionar empresa</option>{data?.companies.filter(c=>data.eligibleCompanyIds.includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button style={{...button,marginLeft:10}} disabled={!association||busy} onClick={()=>void act(()=>associateOnlineSubscription(selected,association),'Compra associada à empresa, sem alterar plano, chave ou validade.')}>Associar compra</button></div>:null}
   {!selected.plan?<p style={{color:muted}}>O nome do plano antigo foi preservado. O Super Admin pode identificá-lo em “Editar dados e validade” antes de ativar alterações de plano.</p>:null}</section>
   <section style={card}><h2>Upgrade e downgrade</h2><p style={{color:muted}}>O upgrade abre o Stripe para pagar o ajuste proporcional. O downgrade aplica-se imediatamente, sem reembolso. A validade mantém-se.</p>
   {sa?<label style={{display:'grid',gap:8,maxWidth:360}}>Alterar o plano deste cliente<select style={control} value={pending||selected.plan||''} disabled={!active||!catalog||!!catalogError||busy} onChange={event=>setPending(event.target.value===selected.plan?null:event.target.value as LocalPlan)}>{!selected.plan?<option value="">Plano por identificar</option>:null}{LOCAL_PLANS.map(plan=><option key={plan} value={plan}>{plan}{plan===selected.plan?' (atual)':''}</option>)}</select></label>:null}
   {!active?<p>É necessária uma subscrição ativa, associada a uma empresa, com plano e datas identificados.</p>:null}
   {pending&&selected.plan?<div role="group" aria-label="Confirmar alteração de plano" style={{marginTop:20}}><p>Confirmar {selected.plan} → {pending}?</p>{estimate?<div style={{display:'grid',gap:8,marginBottom:16}}><p>{estimate.remainingDays} dias restantes de {estimate.totalDays} dias. A data de validade mantém-se em {date(selected.expiresAt)}.</p><div>Valor proporcional do plano atual: <strong>{money(estimate.currentCreditCents/100)}</strong></div><div>Valor proporcional do novo plano: <strong>{money(estimate.targetCostCents/100)}</strong></div><div>{estimate.downgrade?'Valor a pagar no downgrade':'Estimativa a pagar no upgrade'}: <strong>{money(estimate.payableCents/100)}</strong></div><small>Valores estimados com IVA. No upgrade, o Stripe apresenta o total confirmado pelo servidor antes do pagamento.</small></div>:null}<p>{billedPrice(pending)>billedPrice(selected.plan)?'O valor final é calculado no servidor e apresentado no Stripe antes de pagar. O plano só muda após a confirmação do pagamento.':'O plano muda imediatamente. Não será efetuado reembolso nem criado crédito financeiro.'}</p><button style={button} disabled={busy||!catalog||!!catalogError} onClick={()=>void change()}>{busy?'A processar…':billedPrice(pending)>billedPrice(selected.plan)?'Continuar para pagamento':'Confirmar downgrade'}</button><button style={{...control,marginLeft:10}} disabled={busy} onClick={()=>setPending(null)}>Cancelar alteração</button></div>:null}
   </section>
   <section style={card}><h2>Pagamentos e pedidos de upgrade</h2><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}><thead><tr>{['Data','Plano','Valor','Estado'].map(label=><th key={label} style={{padding:10}}>{label}</th>)}</tr></thead><tbody>{[...clientOrders].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map(order=><tr key={order.id}><td style={{padding:10}}>{date(order.createdAt)}</td><td style={{padding:10}}>{order.targetPlan}</td><td style={{padding:10}}>{money(order.amountCents/100)}</td><td style={{padding:10}}>{order.status==='applied'?'Pago e aplicado':order.status==='conflict'?'Pago — requer revisão do Super Admin':order.status==='expired'?'Expirado / não concluído':'A aguardar pagamento ou confirmação'}</td></tr>)}{!clientOrders.length?<tr><td colSpan={4} style={{padding:10,color:muted}}>Sem pedidos de upgrade registados para este cliente.</td></tr>:null}</tbody></table></div></section>
   <section style={card}><p style={{color:muted}}>{selected.companyId?'Alterações registadas em todas as subscrições desta empresa.':'Histórico desta compra ainda não associada a uma empresa.'}</p><CustomerHistory entries={history} filter={historyFilter} onFilter={setHistoryFilter}/></section>
  </>:null}
 </div>;
}
function BillingEditor({existing,data,card,control,onCancel,onSaved}:{existing?:OnlineSubscription;data:OnlineBilling;card:CSSProperties;control:CSSProperties;onCancel:()=>void;onSaved:()=>Promise<void>}) {
 const today=localDate();
 const [form,setForm]=useState({companyId:existing?.companyId||data.eligibleCompanyIds[0]||'',plan:existing?.plan||existing?.planName||'Base',status:existing?.status||'inactive',startedAt:existing?.startedAt?.slice(0,10)||today,expiresAt:existing?.expiresAt?.slice(0,10)||annualExpiry(today),billingName:existing?.billingName||'',billingEmail:existing?.billingEmail||'',nif:existing?.nif||'',address:existing?.address||''});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!existing){const c=data.billingContacts.find(c=>c.companyId===form.companyId);setForm(f=>({...f,billingName:c?.name||'',billingEmail:c?.email||''}));}},[form.companyId]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{
  // Não arredonda datas históricas se apenas se alterarem os contactos.
  const fields={...form,startedAt:existing?.startedAt?.slice(0,10)===form.startedAt?existing.startedAt:form.startedAt,expiresAt:existing?.expiresAt?.slice(0,10)===form.expiresAt?existing.expiresAt:form.expiresAt};
  await onlineRpc('az_billing_admin',{input:{action:existing?'update':'create',id:existing?.id,version:existing?.version,fields}});await onSaved();
 }catch(e){setError(uiMessagePt(e instanceof Error?e.message:'Não foi possível guardar.'));}finally{setBusy(false);}}
 const field=(key:keyof typeof form,value:string)=>setForm(f=>({...f,[key]:value}));
 return <form style={card} onSubmit={submit}><h2>{existing?'Editar dados e validade':'Registo manual de subscrição'}</h2><p>Esta operação não cobra pagamentos. As alterações ficam identificadas no histórico.</p>{error?<p role="alert">{error}</p>:null}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
 <label>Empresa titular<br/><select style={control} required disabled={!!existing} value={form.companyId} onChange={e=>field('companyId',e.target.value)}><option value="">Selecionar empresa</option>{data.companies.filter(c=>data.eligibleCompanyIds.includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>{existing&&!existing.plan?'Identificar plano antigo':'Plano'}<br/><select style={control} disabled={!!existing?.plan} value={form.plan} onChange={e=>field('plan',e.target.value)}>{existing&&!existing.plan?<option value={existing.planName||''}>{existing.planName||'Por identificar'}</option>:null}{LOCAL_PLANS.map(p=><option key={p}>{p}</option>)}</select></label>
 <label>Estado<br/><select style={control} value={form.status} onChange={e=>field('status',e.target.value)}>{['active','inactive','canceled'].map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
 {(['startedAt','expiresAt','billingName','billingEmail','nif','address'] as const).map(k=><label key={k}>{({startedAt:'Data de início',expiresAt:'Data de validade',billingName:'Nome de faturação',billingEmail:'Email de faturação',nif:'NIF',address:'Morada'})[k]}<br/><input style={control} type={k.endsWith('At')?'date':k==='billingEmail'?'email':'text'} required={k.endsWith('At')} value={form[k]} onChange={e=>field(k,e.target.value)}/></label>)}</div><div style={{marginTop:20}}><button style={button} disabled={busy}>{busy?'A guardar…':'Guardar'}</button><button type="button" style={{...control,marginLeft:10}} disabled={busy} onClick={onCancel}>Cancelar</button></div></form>;
}
