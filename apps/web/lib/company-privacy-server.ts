import 'server-only';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { PLATFORM_PRIVACY_ID } from './company-privacy';
export async function publicPlatformPrivacy() {
 const result=await getSupabaseAdminClient().from('azotrace_platform_privacy').select('published_content,published_at').eq('company_id',PLATFORM_PRIVACY_ID).maybeSingle();
 if(result.error){if(['42P01','PGRST205'].includes(result.error.code))return null;throw new Error('Não foi possível consultar a política da Azotrace.');}
 if(!result.data?.published_content||!result.data.published_at)return null;
 return {content:String(result.data.published_content),publishedAt:String(result.data.published_at)};
}
export async function publicCompanyPrivacy(companyId: string) {
 const admin = getSupabaseAdminClient();
 const company = await admin.from('azotrace_companies').select('id,name,active').eq('id', companyId).maybeSingle();
 if (company.error) throw new Error('Não foi possível consultar a empresa.');
 if (!company.data?.active) return null;
 const policy = await admin.from('azotrace_company_privacy').select('published_content,published_at').eq('company_id', companyId).maybeSingle();
 if (policy.error) throw new Error('Não foi possível consultar a política.');
 if (!policy.data?.published_content || !policy.data.published_at) return null;
 return { companyName: String(company.data.name), content: String(policy.data.published_content), publishedAt: String(policy.data.published_at) };
}
