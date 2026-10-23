import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicCompanyPrivacy } from '~/lib/company-privacy-server';
import styles from '../../../dashboard/administracao/rgpd/politica/company-privacy.module.css';
export const metadata = {title:'Política de Privacidade da empresa | Azotrace'};
export const instant = false;
type Props = {params:Promise<{companyId:string}>};
async function Document({params}:Props){
 const {companyId}=await params;
 const policy=await publicCompanyPrivacy(companyId);
 if(!policy)notFound();
 return <main className={styles.publicPage}><div className={styles.root}><header><h1>Política de Privacidade</h1><h2>{policy.companyName}</h2><p className={styles.muted}>Publicada em {new Intl.DateTimeFormat('pt-PT',{dateStyle:'long',timeZone:'Atlantic/Azores'}).format(new Date(policy.publishedAt))}</p></header><article className={`${styles.panel} ${styles.publicContent}`}>{policy.content}</article></div></main>;
}
export default function Page(props:Props){return <Suspense fallback={<p>A carregar a política…</p>}><Document {...props}/></Suspense>;}
