import {subscriptionCalendarDay} from '~/lib/subscription-dates';
export type SupportPriority='high'|'medium'|'low';
export type SupportPlan='Pro'|'Essential'|'Base';
export const supportPriorityLabels:Record<SupportPriority,string>={high:'Muito urgente',medium:'Urgente',low:'Não urgente'};
export const supportPriorityOrder:SupportPriority[]=['high','medium','low'];
export const SUPPORT_KEYWORDS={
 high:['muito urgente','crítico','crítica','falha grave','sistema parado','produção parada','perda de dados','dados apagados','conta bloqueada','sem acesso','não consigo entrar','não consigo aceder','plataforma indisponível'],
 medium:['urgente','urgência','erro no pagamento','não consigo pagar','falha no pagamento','erro ao publicar','não consigo publicar','qr code não funciona','erro no qr code','fatura incorreta'],
} as const;
const normal=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').replace(/[^a-z0-9]+/g,' ').trim();
export function supportPlan(value:unknown):SupportPlan|null{
 if(typeof value!=='string')return null;const text=' '+normal(value)+' ';
 if(text.includes(' pro '))return 'Pro';if(text.includes(' essential ')||text.includes(' essencial '))return 'Essential';if(text.includes(' base '))return 'Base';return null;
}
export function activeSupportPlan(subscription:{plan_name:unknown;status:unknown;expires_at:unknown}|undefined,now=Date.now()):SupportPlan|null{
 if(!subscription||subscription.status!=='active'||typeof subscription.expires_at!=='string')return null;
 const today=subscriptionCalendarDay(now),expiry=subscriptionCalendarDay(subscription.expires_at);
 return Number.isFinite(today)&&Number.isFinite(expiry)&&expiry>=today?supportPlan(subscription.plan_name):null;
}
export function classifySupport(plan:SupportPlan|null,texts:readonly string[]){
 const base:SupportPriority=plan==='Pro'?'high':plan==='Essential'?'medium':'low';let keyword:string|null=null,wordPriority:SupportPriority='low';
 for(const severity of ['high','medium'] as const){for(const phrase of SUPPORT_KEYWORDS[severity]){const needle=' '+normal(phrase)+' ';if(texts.some(value=>{const normalized=normal(value).replace(/\b(nao (e )?urgente|sem urgencia|sem pressa)\b/g,' ');return (' '+normalized+' ').includes(needle);})){keyword=phrase;wordPriority=severity;break;}}if(keyword)break;}
 const priority:SupportPriority=base==='high'||wordPriority==='high'?'high':base==='medium'||wordPriority==='medium'?'medium':'low';
 return {priority,priority_plan:plan,priority_keyword:keyword,priority_reason:[plan?'Licença '+plan:'Sem licença ativa verificada',keyword?'Palavra-chave: “'+keyword+'”':'Sem palavras-chave de urgência'].join(' · ')};
}
