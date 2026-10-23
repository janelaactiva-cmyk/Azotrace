import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getSupabaseAdminClient } from './supabase-admin';
import { CatalogSchema } from './plan-catalog';
export async function getPlanCatalog(){
 const {data,error}=await getSupabaseAdminClient().from('azotrace_plan_catalog').select('data,version').eq('id','azotrace').single();
 if(error||!data)throw new Error('O preçário não está disponível. Verifica a configuração dos planos no Supabase.');
 return CatalogSchema.parse({...data.data,version:data.version});
}

// Só os dados públicos têm cache. O checkout lê os preços atuais.
export async function getPublicPlanCatalog() {
 'use cache';
 cacheLife({ stale: 15, revalidate: 15, expire: 60 });
 cacheTag('azotrace-public-plans');
 return getPlanCatalog();
}
