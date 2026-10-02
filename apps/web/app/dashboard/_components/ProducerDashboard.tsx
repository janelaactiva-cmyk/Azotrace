'use client';

import Link from 'next/link';
import { useMemo } from 'react';


import {
  type LocalBatch,
  type LocalProductionRecord,
} from '../onboarding/_lib/local-store';
import { useProducerWorkspace } from '../_lib/use-producer-workspace';
import { BusinessWorkspaceSwitcher } from './BusinessWorkspaceSwitcher';
import styles from './producer-dashboard.module.css';

const onboardingSteps = [
  { step: 2, label: 'Identificar negócio' },
  { step: 3, label: 'Tipo de produto' },
  { step: 4, label: 'Unidades de produção' },
  { step: 5, label: 'Campos do formulário' },
  { step: 6, label: 'Etapas de produção' },
  { step: 7, label: 'Produto e primeiro lote' },
  { step: 8, label: 'Primeiro registo' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Ativo',
    finished: 'Finalizado',
    production: 'Em produção',
  };

  return labels[status] ?? status;
}

function sameDay(value: string, day: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function newestFirst<T>(rows: T[], dateOf: (row: T) => string) {
  return [...rows].sort(
    (a, b) => new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime(),
  );
}

export function ProducerDashboard() {
  const { store, loading } = useProducerWorkspace();

  const stats = useMemo(() => {
    const today = new Date();
    const state = store;

    if (!state) {
      return {
        products: 0,
        units: 0,
        activeBatches: 0,
        allBatches: 0,
        records: 0,
        todayRecords: 0,
        stages: 0,
        productTypes: 0,
        fields: 0,
      };
    }

    return {
      products: state.products.length,
      units: state.units.length,
      activeBatches: state.batches.filter((batch) => batch.status === 'active').length,
      allBatches: state.batches.length,
      records: state.records.length,
      todayRecords: state.records.filter((record) => sameDay(record.createdAt, today)).length,
      stages: state.stages.length,
      productTypes: state.productType ? 1 : 0,
      fields: state.fields.length,
    };
  }, [store]);

  const recentRecords = useMemo(
    () =>
      newestFirst(store?.records ?? [], (record) => record.createdAt).slice(0, 6),
    [store],
  );

  const recentBatches = useMemo(
    () => [...(store?.batches ?? [])].slice(0, 5),
    [store],
  );

  const progress = useMemo(() => {
    if (store?.completed) return 100;
    return Math.min(100, Math.round(((store?.onboardingStep ?? 0) / 8) * 100));
  }, [store]);

  const unitLabel = store?.productType?.unitLabel
    ? `${store.productType.unitLabel}s`
    : 'Unidades';

  const productName = (record: LocalProductionRecord) =>
    store?.products.find((product) => product.id === record.productId)?.name ?? 'Produto';

  const batchCode = (record: LocalProductionRecord) =>
    store?.batches.find((batch) => batch.id === record.batchId)?.code ?? 'Sem lote';

  const stageName = (record: LocalProductionRecord) =>
    store?.stages.find((stage) => stage.id === record.stageId)?.name ?? '';

  const batchProductName = (batch: LocalBatch) =>
    store?.products.find((product) => product.id === batch.productId)?.name ?? 'Produto';

  if (loading) {
    return (
      <div className={styles.page}>
        <BusinessWorkspaceSwitcher />
        <div className={styles.skeletonHero} />
        <div className={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className={styles.skeletonCard} key={index} />
          ))}
        </div>
        <div className={styles.skeletonLarge} />
      </div>
    );
  }

  if (!store) {
    return (
      <div className={styles.page}>
        <BusinessWorkspaceSwitcher />
        <section className={styles.welcomeEmpty}>
          <span className={styles.eyebrow}>Primeiro acesso</span>
          <h1>Bem-vindo ao Azotrace</h1>
          <p>
            Cria o primeiro negócio, define o que produzes, as unidades de produção, os campos de registo e o primeiro lote. Os dados ficam associados à tua conta e sincronizados com o Supabase.
          </p>
          <Link className={styles.primaryButton} href="/dashboard/onboarding?new=1">
            Criar primeiro negócio →
          </Link>
        </section>
      </div>
    );
  }

  if (!store.completed) {
    return (
      <div className={styles.page} style={{ ['--business-accent' as any]: store.business.accentColor }}>
        <BusinessWorkspaceSwitcher />
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>Configuração inicial</span>
            <h1>{store.business.name || 'O teu negócio'}</h1>
            <p>Conclui o onboarding antes de começares a trabalhar diariamente com a produção.</p>
          </div>
          <Link href="/dashboard/onboarding" className={styles.primaryButton}>
            Continuar onboarding →
          </Link>
        </header>

        <section className={styles.setupCard}>
          <div className={styles.setupHeader}>
            <div>
              <h2>Preparar o Azotrace para a tua produção</h2>
              <p>O Dashboard passa para o modo operacional quando terminares estes passos.</p>
            </div>
            <strong>{progress}%</strong>
          </div>

          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.checklist}>
            {onboardingSteps.map((item) => {
              const done = store.onboardingStep >= item.step;
              return (
                <div className={styles.checkItem} key={item.step}>
                  <span className={done ? styles.checkDone : styles.checkPending}>
                    {done ? '✓' : item.step - 1}
                  </span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.previewStats}>
          <div><strong>{stats.products}</strong><span>Produtos</span></div>
          <div><strong>{stats.units}</strong><span>{unitLabel}</span></div>
          <div><strong>{stats.allBatches}</strong><span>Lotes</span></div>
          <div><strong>{stats.records}</strong><span>Registos</span></div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ ['--business-accent' as any]: store.business.accentColor }}>
      <BusinessWorkspaceSwitcher />
      <header className={styles.topbar}>
        <div>
          <span className={styles.eyebrow}>Visão geral da produção</span>
          <h1>{store.business.name || 'Dashboard'}</h1>
          <p>Acompanha a produção, os lotes e os registos de rastreabilidade do negócio.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.primaryButton} href="/dashboard/producao/inserir-dados">
            + Inserir dados
          </Link>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>P</div>
          <div><span>Produtos ativos</span><strong>{stats.products}</strong></div>
          <small>{stats.productTypes} tipo(s) configurado(s)</small>
        </article>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>U</div>
          <div><span>{unitLabel}</span><strong>{stats.units}</strong></div>
          <small>Unidades de origem da produção</small>
        </article>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconOrange}`}>L</div>
          <div><span>Lotes ativos</span><strong>{stats.activeBatches}</strong></div>
          <small>{stats.allBatches} lote(s) no total</small>
        </article>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}>R</div>
          <div><span>Registos</span><strong>{stats.records}</strong></div>
          <small>{stats.todayRecords} criado(s) hoje</small>
        </article>
      </section>

      <section className={styles.quickSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Ações rápidas</h2>
            <p>As tarefas mais frequentes do produtor.</p>
          </div>
        </div>
        <div className={styles.quickGrid}>
          <Link href="/dashboard/producao/inserir-dados" className={styles.quickCard}>
            <span className={`${styles.quickIcon} ${styles.quickGreen}`}>+</span>
            <div><strong>Inserir dados</strong><small>Adicionar um novo registo de produção.</small></div>
            <span className={styles.arrow}>→</span>
          </Link>
          <Link href="/dashboard/lotes" className={styles.quickCard}>
            <span className={`${styles.quickIcon} ${styles.quickBlue}`}>L</span>
            <div><strong>Ver lotes</strong><small>Acompanhar lotes e respetiva origem.</small></div>
            <span className={styles.arrow}>→</span>
          </Link>
          <Link href="/dashboard/producao/unidades" className={styles.quickCard}>
            <span className={`${styles.quickIcon} ${styles.quickOrange}`}>U</span>
            <div><strong>Unidades de produção</strong><small>Estufas, colmeias, pipas ou outras unidades.</small></div>
            <span className={styles.arrow}>→</span>
          </Link>
          <Link href="/dashboard/qrcodes" className={styles.quickCard}>
            <span className={`${styles.quickIcon} ${styles.quickPurple}`}>QR</span>
            <div><strong>QR Codes</strong><small>Gerar e gerir etiquetas de rastreabilidade.</small></div>
            <span className={styles.arrow}>→</span>
          </Link>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Atividade recente</h2>
              <p>Últimos registos introduzidos na produção.</p>
            </div>
            <Link href="/dashboard/producao/registos">Ver todos</Link>
          </div>

          {recentRecords.length ? (
            <div className={styles.recordList}>
              {recentRecords.map((record) => (
                <div className={styles.recordRow} key={record.id}>
                  <div className={styles.recordDot} />
                  <div className={styles.recordMain}>
                    <strong>{productName(record)}</strong>
                    <span>
                      {batchCode(record)}
                      {stageName(record) ? ` · ${stageName(record)}` : ''}
                    </span>
                  </div>
                  <time>{formatDate(record.createdAt)}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.panelEmpty}>
              <strong>Ainda não existem registos.</strong>
              <span>Começa por introduzir o primeiro registo de produção.</span>
              <Link href="/dashboard/producao/inserir-dados">Inserir dados →</Link>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Lotes recentes</h2>
              <p>Estado dos últimos lotes criados.</p>
            </div>
            <Link href="/dashboard/lotes">Ver lotes</Link>
          </div>

          {recentBatches.length ? (
            <div className={styles.batchList}>
              {recentBatches.map((batch) => (
                <div className={styles.batchRow} key={batch.id}>
                  <div>
                    <strong>{batch.code}</strong>
                    <span>{batchProductName(batch)} · início {batch.startDate || '—'}</span>
                  </div>
                  <span className={`${styles.status} ${styles[`status_${batch.status}`] || ''}`}>
                    {statusLabel(batch.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.panelEmpty}>
              <strong>Ainda não existem lotes.</strong>
              <span>Cria o primeiro lote através do onboarding.</span>
              <Link href="/dashboard/onboarding">Abrir configuração →</Link>
            </div>
          )}
        </section>
      </div>

      <section className={styles.healthPanel}>
        <div>
          <span className={styles.healthBadge}>Configuração concluída</span>
          <h2>O teu Azotrace está pronto para trabalhar</h2>
          <p>
            Tens {stats.products} produto(s), {stats.units} unidade(s), {stats.stages} etapa(s) e {stats.fields} campo(s) configurados.
          </p>
        </div>
        <Link href="/dashboard/onboarding" className={styles.secondaryButton}>
          Rever configuração
        </Link>
      </section>

      <div className={styles.previewStats}>
        <div><strong>Local</strong><span>Modo de teste</span></div>
        <div><strong>Browser</strong><span>Armazenamento</span></div>
        <div><strong>Ativo</strong><span>Supabase</span></div>
        <div><strong>✓</strong><span>Pronto a testar</span></div>
      </div>
    </div>
  );
}
