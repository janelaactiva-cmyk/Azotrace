import { Suspense } from 'react';
import Link from 'next/link';
import PrivacyPolicyContent, {privacyLastUpdated} from '~/components/PrivacyPolicyContent';
import { publicPlatformPrivacy } from '~/lib/company-privacy-server';
import styles from '../dashboard/administracao/rgpd/politica/company-privacy.module.css';
export const metadata={title:'Política de Privacidade | Azotrace',description:'Política de Privacidade da Azotrace - RGPD'};
async function Document(){
 const policy=await publicPlatformPrivacy();
 return <main className={styles.publicPage}><div className={styles.root}><header><h1>Política de Privacidade</h1><p className={styles.muted}>Azotrace · Última atualização: {policy?new Intl.DateTimeFormat('pt-PT',{dateStyle:'long',timeZone:'Atlantic/Azores'}).format(new Date(policy.publishedAt)):privacyLastUpdated}</p></header><article className={styles.panel}>{policy?<div className={styles.publicContent}>{policy.content}</div>:<div className={styles.legacy}><PrivacyPolicyContent/></div>}</article><Link href="/landing">← Voltar ao início</Link></div></main>;
}
export default function Page(){return <Suspense fallback={<p>A carregar a política da Azotrace…</p>}><Document/></Suspense>;}
