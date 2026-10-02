
'use client';

import Link from 'next/link';
import { TraceabilityShell, EmptyWorkspace } from '../_components/TraceabilityShell';
import styles from '../_components/traceability.module.css';
import { useProducerWorkspace } from '../_lib/use-producer-workspace';
import { formatDate, productName, batchCode, stageName } from '../_lib/producer-utils';

export default function ProducaoOverviewPage() {
  const { store, loading } = useProducerWorkspace();
  if (loading) return <TraceabilityShell eyebrow="Produção" title="A carregar…"><div className={styles.cardPad}>A preparar a produção.</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Produção" title="Produção"><EmptyWorkspace /></TraceabilityShell>;

  const active = store.batches.filter((b) => b.status === 'active');
  const recent = [...store.records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  return (
    <TraceabilityShell eyebrow="Produção" title="Visão geral da produção" description="Operações diárias do negócio ativo, da recolha de dados ao controlo de qualidade."
      actions={<Link href="/dashboard/producao/inserir-dados" className={styles.primary}>+ Inserir dados</Link>}>
      <section className={styles.grid4}>
        <div className={styles.stat}><span>Registos</span><strong>{store.records.length}</strong><small>Histórico de rastreabilidade</small></div>
        <div className={styles.stat}><span>Lotes ativos</span><strong>{active.length}</strong><small>{store.batches.length} lotes no total</small></div>
        <div className={styles.stat}><span>Etapas</span><strong>{store.stages.length}</strong><small>Fluxo configurado</small></div>
        <div className={styles.stat}><span>Controlos de qualidade</span><strong>{store.qualityRecords.length}</strong><small>{store.qualityRecords.filter(q=>q.status==='rejected').length} rejeitado(s)</small></div>
      </section>
      <div className={styles.sectionTitle}><div><h2>Operações</h2><p>Acede diretamente às tarefas mais frequentes.</p></div></div>
      <section className={styles.grid3}>
        {[
          ['Inserir dados','Registar produto, lote, etapa e dados dinâmicos.','/dashboard/producao/inserir-dados'],
          ['Registos de produção','Pesquisar e exportar o histórico de produção.','/dashboard/producao/registos'],
          ['Etapas de produção','Configurar a sequência produtiva.','/dashboard/producao/etapas'],
          ['Controlo de qualidade','Registar parâmetros, aprovações e rejeições.','/dashboard/producao/qualidade'],
          ['Importar dados','Importar registos por CSV.','/dashboard/producao/importar'],
          ['Unidades de produção',`${store.productType?.unitLabel ?? 'Unidade'}s que dão origem aos lotes.`,'/dashboard/producao/unidades'],
        ].map(([title,desc,href])=><Link key={href} href={href} className={styles.card} style={{padding:18,textDecoration:'none',color:'inherit'}}><strong style={{fontSize:13,color:'#18303d'}}>{title}</strong><p style={{fontSize:12,color:'#778691',lineHeight:1.5}}>{desc}</p><span className={styles.link}>Abrir →</span></Link>)}
      </section>
      <div className={styles.sectionTitle}><div><h2>Últimos registos</h2><p>Atividade recente deste negócio.</p></div><Link className={styles.link} href="/dashboard/producao/registos">Ver todos</Link></div>
      <section className={styles.card}>
        {recent.length ? recent.map(rec=><div className={styles.listRow} key={rec.id}><span className={styles.colorDot}/><div className={styles.listMain}><strong>{productName(store,rec.productId)} · {batchCode(store,rec.batchId)}</strong><span>{stageName(store,rec.stageId)} · {rec.productionUnitIds.length} unidade(s)</span></div><span className={styles.muted}>{formatDate(rec.createdAt,true)}</span></div>) : <div className={styles.cardPad}>Ainda não existem registos.</div>}
      </section>
    </TraceabilityShell>
  );
}
