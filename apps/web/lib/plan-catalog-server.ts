import 'server-only';
import { getSupabaseAdminClient } from './supabase-admin';
import { CatalogSchema } from './plan-catalog';
export async function getPlanCatalog(){
 const {data,error}=await getSupabaseAdminClient().from('azotrace_plan_catalog').select('data,version').eq('id','azotrace').single();
 if(error||!data)throw new Error('O preçário não está disponível. Verifica a configuração dos planos no Supabase.');
 return CatalogSchema.parse({...data.data,version:data.version});
}
