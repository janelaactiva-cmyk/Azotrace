import { z } from 'zod';
export const PLAN_IDS = ['Base', 'Essential', 'Pro'] as const;
export const PlanSchema = z.object({
 id:z.enum(PLAN_IDS), annualCents:z.number().int().min(100).max(10000000),
 description:z.string().trim().min(1).max(200), recommended:z.boolean(),
 businesses:z.number().int().min(1).max(10000), users:z.number().int().min(1).max(100000),
 databaseMb:z.number().int().min(1).max(1000000), storageGb:z.number().min(0.1).max(100000),
 supportDays:z.number().int().min(1).max(30), supportPriority:z.enum(['normal','elevada','máxima']),
 reports:z.string().trim().min(1).max(160), features:z.array(z.string().trim().min(1).max(160)).max(20),
}).strict();
export const CatalogDataSchema=z.object({plans:z.array(PlanSchema).length(3)}).strict().superRefine((data,ctx)=>{
 if(!PLAN_IDS.every((id,i)=>data.plans[i]?.id===id))ctx.addIssue({code:'custom',message:'Mantém os planos Base, Essential e Pro nesta ordem.'});
 if(data.plans.filter(p=>p.recommended).length>1)ctx.addIssue({code:'custom',message:'Escolhe apenas um plano recomendado.'});
 if(!data.plans.every((p,i)=>i===0||p.annualCents>data.plans[i-1]!.annualCents))ctx.addIssue({code:'custom',message:'O preço deve aumentar de Base para Essential e Pro.'});
});
export const CatalogSchema=z.object({plans:z.array(PlanSchema).length(3),version:z.number().int().min(1)}).strict().superRefine((data,ctx)=>{
 const checked=CatalogDataSchema.safeParse({plans:data.plans});if(!checked.success)for(const issue of checked.error.issues)ctx.addIssue({code:'custom',message:issue.message,path:issue.path});
});
export type Plan=z.infer<typeof PlanSchema>;
export type CatalogData=z.infer<typeof CatalogDataSchema>;
export type Catalog=z.infer<typeof CatalogSchema>;
export function planFeatures(plan:Plan){return [
 `${plan.businesses} negócio${plan.businesses===1?'':'s'} por empresa`,
 `Até ${plan.users} utilizadores`,`${plan.databaseMb>=1024?`${(plan.databaseMb/1024).toLocaleString('pt-PT')} GB`:`${plan.databaseMb} MB`} para dados de produção`,
 `${plan.storageGb.toLocaleString('pt-PT')} GB para imagens e documentos`,
 ...plan.features,plan.reports,`Tickets com prioridade ${plan.supportPriority}`,
 `Primeira resposta até ${plan.supportDays} ${plan.supportDays===1?'dia útil':'dias úteis'}`,
];}
export const defaultCatalogData:CatalogData={plans:PLAN_IDS.map((id,i)=>({
 id,annualCents:[23988,37188,85188][i]!,description:['Para pequenos produtores que querem organizar a produção.','Para equipas em crescimento com vários negócios.','Para empresas que procuram uma visão global da produção.'][i]!,recommended:i===1,
 businesses:[1,3,10][i]!,users:[2,5,15][i]!,databaseMb:[100,500,2048][i]!,storageGb:[1,5,20][i]!,
 supportDays:[3,2,1][i]!,supportPriority:(['normal','elevada','máxima'] as const)[i]!,
 reports:['Relatórios básicos','Comparação de etapas e lotes','Análise global dos negócios'][i]!,
 features:['Registo das etapas e histórico dos lotes','Página pública com QR code e gráficos','Três templates para a página pública'],
}))};
