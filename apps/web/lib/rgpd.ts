export const rgpdKinds=['consents','requests','retention','processors','activities'] as const;
export type RgpdKind=typeof rgpdKinds[number];
export type RgpdSection=RgpdKind|'exports'|'history';
export type RgpdData=Record<string,string|number|boolean>;
export type RgpdRecord={id:string;kind:RgpdKind|'exports';data:RgpdData;version:number;created_at:string;updated_at:string};
export type RgpdScope={key:string;name:string;companyId:string|null;platform:boolean};
export type RgpdAudit={id:number;kind:string;record_id:string;title:string;action:string;version:number;actor_name:string;created_at:string};
export type RgpdField={name:string;label:string;type?:'text'|'email'|'textarea'|'date'|'number'|'select'|'checkbox';required?:boolean;options?:readonly(readonly[string,string])[];max?:number;hint?:string};
export type RgpdDefinition={title:string;description:string;create:string;titleField:string;fields:RgpdField[]};
const active=[['active','Ativo'],['archived','Arquivado']] as const;
export const legalBases=[['consent','Consentimento'],['contract','Execução de contrato'],['legal','Obrigação jurídica'],['vital','Interesses vitais'],['public','Interesse público'],['legitimate','Interesses legítimos']] as const;
export const rgpdDefinitions:Record<RgpdKind,RgpdDefinition>={
 consents:{title:'Consentimentos',description:'Regista a decisão do titular, a finalidade e a prova correspondente.',create:'Registar consentimento',titleField:'purpose',fields:[
  {name:'email',label:'Email do titular',type:'email',required:true},{name:'subject_name',label:'Nome do titular'},
  {name:'purpose',label:'Finalidade',required:true,max:200},{name:'policy_version',label:'Versão da informação apresentada',required:true,max:100},
  {name:'captured_on',label:'Data da decisão',type:'date',required:true},{name:'status',label:'Decisão',type:'select',required:true,options:[['granted','Aceite'],['rejected','Recusado'],['withdrawn','Retirado']]},
  {name:'source',label:'Canal de recolha',required:true,max:200},{name:'evidence',label:'Prova ou referência da decisão',type:'textarea',required:true,max:5000,hint:'Indica como e onde a decisão foi registada.'},
  {name:'notes',label:'Observações',type:'textarea',max:3000}]},
 requests:{title:'Pedidos dos titulares',description:'Acompanha a identidade, o prazo inicial, a resposta e eventuais prorrogações.',create:'Novo pedido',titleField:'subject',fields:[
  {name:'email',label:'Email do titular',type:'email',required:true},{name:'subject_name',label:'Nome do titular'},
  {name:'subject',label:'Assunto',required:true,max:200},{name:'request_type',label:'Direito exercido',type:'select',required:true,options:[['access','Acesso'],['rectification','Retificação'],['portability','Portabilidade'],['restriction','Limitação'],['objection','Oposição'],['information','Informação'],['erasure','Apagamento — apenas registo do pedido']]},
  {name:'received_on',label:'Data de receção',type:'date',required:true},{name:'description',label:'Descrição do pedido',type:'textarea',required:true,max:5000},
  {name:'identity_verified',label:'Identidade do titular confirmada',type:'checkbox'},{name:'identity_method',label:'Como foi confirmada a identidade',max:500},
  {name:'status',label:'Estado',type:'select',required:true,options:[['received','Recebido'],['verifying','A confirmar identidade'],['in_progress','Em curso'],['completed','Concluído'],['declined','Recusado com fundamento']]},
  {name:'answer',label:'Resposta ou fundamentação',type:'textarea',max:6000},
  {name:'extended_until',label:'Prazo prorrogado até',type:'date'},{name:'extension_reason',label:'Motivo da prorrogação',type:'textarea',max:2000},{name:'notified_on',label:'Data em que a prorrogação foi comunicada',type:'date'}]},
 retention:{title:'Retenção de dados',description:'Documenta os períodos e critérios de conservação. Esta área não executa apagamentos.',create:'Nova regra de retenção',titleField:'category',fields:[
  {name:'category',label:'Categoria de dados',required:true,max:200},{name:'purpose',label:'Finalidade',type:'textarea',required:true,max:2000},
  {name:'period_days',label:'Período de conservação em dias',type:'number',required:true},{name:'starts_from',label:'A partir de que evento se conta o prazo',required:true,max:500},
  {name:'justification',label:'Fundamentação do prazo',type:'textarea',required:true,max:4000},{name:'owner',label:'Responsável pela revisão',required:true,max:200},
  {name:'review_on',label:'Próxima revisão',type:'date',required:true},{name:'status',label:'Estado',type:'select',required:true,options:active}]},
 processors:{title:'Subcontratantes',description:'Mantém os serviços, dados partilhados e referências contratuais da tua organização.',create:'Registar subcontratante',titleField:'name',fields:[
  {name:'name',label:'Denominação da entidade',required:true,max:200},{name:'service',label:'Serviço prestado',required:true,max:300},
  {name:'purpose',label:'Finalidade',type:'textarea',required:true,max:2000},{name:'data_categories',label:'Categorias de dados',type:'textarea',required:true,max:3000},
  {name:'country',label:'País ou localização do tratamento',required:true,max:200},{name:'contact',label:'Contacto ou referência',max:300},
  {name:'agreement_status',label:'Acordo de tratamento de dados',type:'select',required:true,options:[['pending','Por formalizar'],['signed','Formalizado']]},
  {name:'agreement_ref',label:'Referência do acordo',max:500},{name:'agreement_on',label:'Data do acordo',type:'date'},
  {name:'transfer_basis',label:'Transferências internacionais',type:'select',required:true,options:[['none','Não aplicável'],['adequacy','Decisão de adequação'],['scc','Cláusulas contratuais-tipo'],['other','Outra garantia documentada']]},
  {name:'transfer_details',label:'Destinos e garantias',type:'textarea',max:4000},{name:'review_on',label:'Próxima revisão',type:'date',required:true},{name:'status',label:'Estado',type:'select',required:true,options:[['active','Ativo'],['inactive','Inativo']]}]},
 activities:{title:'Registo de atividades de tratamento',description:'Descreve as finalidades, os intervenientes, os dados tratados e as medidas aplicadas.',create:'Nova atividade de tratamento',titleField:'title',fields:[
  {name:'title',label:'Atividade de tratamento',required:true,max:200},{name:'controller_role',label:'Papel da organização',type:'select',required:true,options:[['controller','Responsável pelo tratamento'],['processor','Subcontratante']]},
  {name:'controller_contact',label:'Responsável, contacto e, se aplicável, EPD',type:'textarea',required:true,max:2000},{name:'clients',label:'Responsáveis por conta de quem se trata (se aplicável)',type:'textarea',max:2000},
  {name:'purpose',label:'Finalidades do tratamento',type:'textarea',required:true,max:4000},{name:'legal_basis',label:'Fundamento de licitude',type:'select',required:true,options:legalBases},
  {name:'subjects',label:'Categorias de titulares',type:'textarea',required:true,max:3000},{name:'data_categories',label:'Categorias de dados pessoais',type:'textarea',required:true,max:3000},
  {name:'recipients',label:'Destinatários e subcontratantes',type:'textarea',required:true,max:3000},{name:'transfers',label:'Transferências internacionais e garantias',type:'textarea',required:true,max:4000},
  {name:'retention_criteria',label:'Prazos ou critérios de conservação',type:'textarea',required:true,max:4000},{name:'security_measures',label:'Medidas técnicas e organizativas',type:'textarea',required:true,max:5000},
  {name:'review_on',label:'Próxima revisão',type:'date',required:true},{name:'status',label:'Estado',type:'select',required:true,options:active}]}
};
export function rgpdKind(value:unknown):value is RgpdKind{return typeof value==='string'&&(rgpdKinds as readonly string[]).includes(value);}
export function validRgpdDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function rgpdToday(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Azores',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const f=(key:string)=>p.find(v=>v.type===key)?.value;return `${f('year')}-${f('month')}-${f('day')}`;}
export function addRgpdMonths(value:string,months:number){if(!validRgpdDate(value))throw new Error('Data inválida.');const [year,month,day]=value.split('-').map(Number);const target=new Date(Date.UTC(year!,month!-1+months,1));const end=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day!,end));return target.toISOString().slice(0,10);}
export function rgpdYearBounds(year:number){const start=(y:number)=>{const date=Date.UTC(y,0,1);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Azores',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const f=(name:string)=>Number(parts.find(v=>v.type===name)?.value);const offset=Date.UTC(f('year'),f('month')-1,f('day'),f('hour'),f('minute'),f('second'))-date;return new Date(date-offset).toISOString();};return [start(year),start(year+1)] as const;}
export function validateRgpdData(kind:RgpdKind,input:unknown):RgpdData{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Dados inválidos.');const raw=input as Record<string,unknown>,data:RgpdData={};
 const fields=rgpdDefinitions[kind].fields;const allowed=new Set([...fields.map(f=>f.name),...(kind==='requests'?['due_on']:[])]);if(Object.keys(raw).some(key=>!allowed.has(key)))throw new Error('O registo contém campos não permitidos.');
 for(const field of fields){const value=raw[field.name];if(field.type==='checkbox'){if(value!==undefined&&typeof value!=='boolean')throw new Error(field.label+': valor inválido.');data[field.name]=value===true;continue;}
  if(field.type==='number'){const number=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;if(!Number.isInteger(number)||number<1||number>36500)throw new Error(field.label+': indica um número entre 1 e 36 500.');data[field.name]=number;continue;}
  if(value!==undefined&&typeof value!=='string')throw new Error(field.label+': valor inválido.');let text=typeof value==='string'?value.trim():'';if(field.required&&!text)throw new Error('Preenche: '+field.label+'.');if(text.length>(field.max||(field.type==='email'?254:500)))throw new Error(field.label+': texto demasiado longo.');
  if(field.type==='email'){text=text.toLowerCase();if(text&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))throw new Error('Email inválido.');}
  if(field.type==='date'&&text&&!validRgpdDate(text))throw new Error(field.label+': data inválida.');
  if(field.type==='select'&&text&&!field.options?.some(([v])=>v===text))throw new Error(field.label+': opção inválida.');data[field.name]=text;
 }
 if(kind==='requests'){data.due_on=addRgpdMonths(String(data.received_on),1);if(data.identity_verified&&!String(data.identity_method).trim())throw new Error('Indica como foi confirmada a identidade.');if(data.status==='completed'&&(!data.identity_verified||!data.answer))throw new Error('Confirma a identidade e regista a resposta antes de concluir.');if(data.status==='declined'&&!data.answer)throw new Error('Regista a fundamentação da recusa.');if(data.extended_until){if(!data.extension_reason||!data.notified_on)throw new Error('Regista o motivo e a comunicação da prorrogação.');if(String(data.notified_on)<String(data.received_on)||String(data.notified_on)>String(data.due_on))throw new Error('A comunicação deve ocorrer dentro do prazo inicial.');if(String(data.extended_until)<=String(data.due_on)||String(data.extended_until)>addRgpdMonths(String(data.due_on),2))throw new Error('A prorrogação deve acrescentar até dois meses ao prazo inicial.');}}
 if(kind==='processors'&&data.agreement_status==='signed'&&(!data.agreement_ref||!data.agreement_on))throw new Error('Indica a referência e a data do acordo.');
 if(kind==='processors'&&data.transfer_basis!=='none'&&!data.transfer_details)throw new Error('Documenta os destinos e as garantias das transferências.');
 if(kind==='activities'&&data.controller_role==='processor'&&!data.clients)throw new Error('Identifica os responsáveis por conta de quem é efetuado o tratamento.');
 return data;
}
export function rgpdLabel(kind:RgpdKind,name:string,value:unknown){const field=rgpdDefinitions[kind].fields.find(f=>f.name===name);if(typeof value==='boolean')return value?'Sim':'Não';return field?.options?.find(([v])=>v===value)?.[1]||String(value??'');}
