'use client';
import {createClient} from '@supabase/supabase-js';
let instance:ReturnType<typeof createClient>|undefined;
export function logisticsClient(){return instance||=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'azotrace-logistics-token'}})}
