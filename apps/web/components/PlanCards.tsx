'use client';
import { type Catalog,type Plan,planFeatures } from '~/lib/plan-catalog';
import { usePlanCatalog } from '~/lib/use-plan-catalog';
import styles from './plan-cards.module.css';
const money=(value:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(value);
type Props={catalog:Catalog; onChoose?:(plan:Plan)=>void; selected?:string; disabled?:boolean; embedded?:boolean};
export function PlanCardsView({catalog,onChoose,selected,disabled,embedded}:Props){return <div className={styles.grid}>{catalog.plans.map(plan=><article key={plan.id} className={`${styles.card} ${plan.recommended?styles.recommended:''}`}>
 <div className={styles.badge} aria-hidden={!plan.recommended&&selected!==plan.id?true:undefined} style={!plan.recommended&&selected!==plan.id?{visibility:'hidden'}:undefined}>{plan.recommended?'Recomendado':selected===plan.id?'Plano atual':'\u00a0'}</div>
 <h3>{plan.id}</h3><p className={styles.description}>{plan.description}</p>
 <div className={styles.price}>{money(plan.annualCents/100)}<span> / ano + IVA</span></div>
 <p className={styles.monthly}>Equivalente a {money(plan.annualCents/1200)} / mês · pagamento anual</p>
 <ul>{planFeatures(plan).map((text,i)=><li key={i}>{text}</li>)}</ul>
 {onChoose?<button disabled={disabled||selected===plan.id} onClick={()=>onChoose(plan)}>{selected===plan.id?'Plano atual':`Escolher ${plan.id}`}</button>:disabled?<button disabled>Temporariamente indisponível</button>:<a href={`/checkout?plan=${plan.id.toLowerCase()}`} target={embedded?'_top':undefined}>Escolher {plan.id}</a>}
 </article>)}</div>;}
export default function PlanCards({embedded=false,initialCatalog}:{embedded?:boolean;initialCatalog?:Catalog}){const {catalog,error}=usePlanCatalog(initialCatalog);return <>{error?<p role="alert">{error}</p>:null}{catalog?<PlanCardsView catalog={catalog} disabled={!!error} embedded={embedded}/>:!error?<p>A carregar planos…</p>:null}</>;}

