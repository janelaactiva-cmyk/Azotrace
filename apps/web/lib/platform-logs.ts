export const logModules={accounts:'Contas e empresas',billing:'Pagamentos',support:'Suporte',system:'Sistema'} as const;
export const logLevels={info:'Informação',warning:'Aviso',error:'Erro'} as const;
export type LogModule=keyof typeof logModules;
export type LogLevel=keyof typeof logLevels;
export type PlatformLog={id:string;created_at:string;level:LogLevel;module:LogModule;action:string;summary:string;resource:string|null;resource_id:string|null;company_id:string|null;actor_id:string|null;request_id:string|null;status_code:number|null;duration_ms:number|null;details:Record<string,unknown>};
export type LogSummary={total:number;errors:number;warnings:number;requests:number;average_ms:number|null;latest_at:string|null;daily:{day:string;info:number;warning:number;error:number}[]};
export type LogsSnapshot={events:PlatformLog[];summary:LogSummary;hasMore:boolean;from:string;until:string;generatedAt:string;queryMs:number};
export function parseLogQuery(url:URL,now=new Date()){
 const days=Number(url.searchParams.get('days')||7),offset=Number(url.searchParams.get('offset')||0),level=url.searchParams.get('level')||'all',module=url.searchParams.get('module')||'all',q=(url.searchParams.get('q')||'').trim();
 const until=new Date(url.searchParams.get('until')||now.toISOString());
 if(![1,7,30].includes(days)||!Number.isSafeInteger(offset)||offset<0||offset>1000000||q.length>100||!['all',...Object.keys(logLevels)].includes(level)||!['all',...Object.keys(logModules)].includes(module)||!Number.isFinite(until.getTime())||until.getTime()>now.getTime()+60000||until.getUTCFullYear()<2000)throw new Error('Filtros inválidos.');
 return{days,offset,level,module,q,until:until.toISOString(),from:new Date(until.getTime()-days*86400000).toISOString()};
}
export function logDuration(value:number|null){return value===null?'—':value>=1000?`${(value/1000).toLocaleString('pt-PT',{maximumFractionDigits:2})} s`:`${Math.round(value).toLocaleString('pt-PT')} ms`;}
