/** Demonstration only. All keys, approvals and blocks live in one browser.
 * This module is not a distributed network or a production consensus protocol.
 */
export type ParticipantId = 'producer' | 'carrier' | 'retailer';
export type Perspective = ParticipantId | 'superadmin' | 'customer';
export type ValidatorId = 'farm-node' | 'logistics-node' | 'store-node';
export type EventType = 'planting' | 'measurement' | 'treatment' | 'harvest' | 'packing' | 'offer' | 'accept' | 'reject';
export type BlockchainTab = 'journey' | 'ledger' | 'network' | 'qr';
export const participants: Record<ParticipantId, { name: string; role: string }> = {
  producer: { name: 'Quinta da Serra', role: 'Produtor' },
  carrier: { name: 'Transportes Atlânticos', role: 'Transportador' },
  retailer: { name: 'Mercado da Ilha', role: 'Supermercado' },
};
export const validators: Record<ValidatorId, string> = { 'farm-node': 'Nó da produção', 'logistics-node': 'Nó da logística', 'store-node': 'Nó do retalho' };
export const eventLabels: Record<EventType, string> = { planting: 'Plantação registada', measurement: 'Medição ambiental', treatment: 'Fumigação registada', harvest: 'Colheita registada', packing: 'Embalamento concluído', offer: 'Entrega proposta', accept: 'Receção confirmada', reject: 'Receção recusada' };
export const demoLot = { id: 'AN-SM-2026-042', product: 'Ananás dos Açores', origin: 'São Miguel, Açores', unit: 'Estufa 04', plantedAt: '2025-04-01T09:00:00Z', harvestedAt: '2026-10-03T08:30:00Z', weightKg: 240, boxes: 16 } as const;
export interface LedgerEvent {
  id: string; lotId: string; type: EventType; at: string; actor: ParticipantId;
  recipient?: ParticipantId; reference?: string; data: Record<string, string | number>;
}
export interface DemoBlock {
  height: number; previousHash: string; hash: string; event: LedgerEvent;
  actorSignature: string; endorsements: { validator: ValidatorId; signature: string }[];
}
export type DemoRegistry = { actors: Record<ParticipantId, CryptoKeyPair>; validators: Record<ValidatorId, CryptoKeyPair> };
export type LotState = { stage: 'new' | 'growing' | 'harvested' | 'packed' | 'transport' | 'received'; custodian: ParticipantId; pending: null | { id: string; from: ParticipantId; to: ParticipantId }; lastAt: string };
export const stageLabels: Record<LotState['stage'], string> = { new: 'Por plantar', growing: 'Em cultivo', harvested: 'Colhido', packed: 'Pronto para expedir', transport: 'Em transporte', received: 'Recebido no supermercado' };
export interface Verification { valid: boolean; checked: number; failedHeight?: number; message: string }
const ZERO = '0'.repeat(64);
const encode = (text: string) => new TextEncoder().encode(text);

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const record = value as Record<string, unknown>;
  return '{' + Object.keys(record).filter(key => record[key] !== undefined).sort().map(key => JSON.stringify(key) + ':' + canonical(record[key])).join(',') + '}';
}
export async function sha256(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
const base64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0));
async function sign(key: CryptoKey, text: string) { return base64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encode(text))); }
async function verify(key: CryptoKey, signature: string, text: string) {
  try { return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, decode(signature), encode(text)); } catch { return false; }
}
export async function createDemoRegistry(): Promise<DemoRegistry> {
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador não disponibiliza a verificação criptográfica. Abre a demonstração num navegador atualizado.');
  const keys = await Promise.all(Array.from({ length: 6 }, () => crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])));
  return { actors: { producer: keys[0]!, carrier: keys[1]!, retailer: keys[2]! }, validators: { 'farm-node': keys[3]!, 'logistics-node': keys[4]!, 'store-node': keys[5]! } };
}

export function applyEvent(state: LotState, event: LedgerEvent): LotState {
  if (event.lotId !== demoLot.id || !Object.hasOwn(participants, event.actor)) throw new Error('Interveniente ou lote inválido.');
  const date = Date.parse(event.at);
  if (!Number.isFinite(date) || date < Date.parse(state.lastAt)) throw new Error('A data do evento não pode ser anterior ao último registo.');
  const next: LotState = { ...state, lastAt: event.at };
  if (event.type === 'planting') {
    if (state.stage !== 'new' || event.actor !== 'producer') throw new Error('A plantação só pode ser registada uma vez pelo produtor.');
    return { ...next, stage: 'growing' };
  }
  if (event.type === 'measurement' || event.type === 'treatment') {
    if (state.stage !== 'growing' || event.actor !== 'producer') throw new Error('Este evento pertence ao produtor durante o cultivo.');
    return next;
  }
  if (event.type === 'harvest') {
    if (state.stage !== 'growing' || event.actor !== 'producer') throw new Error('A colheita precisa de um lote em cultivo e da confirmação do produtor.');
    return { ...next, stage: 'harvested' };
  }
  if (event.type === 'packing') {
    if (state.stage !== 'harvested' || event.actor !== 'producer') throw new Error('O embalamento só pode ser confirmado após a colheita.');
    return { ...next, stage: 'packed' };
  }
  if (event.type === 'offer') {
    if (state.pending || event.actor !== state.custodian) throw new Error('Só quem tem a custódia pode propor uma entrega, sem outra entrega pendente.');
    const recipient = state.stage === 'packed' ? 'carrier' : state.stage === 'transport' ? 'retailer' : null;
    if (!recipient || event.recipient !== recipient) throw new Error('O destinatário não corresponde à próxima passagem do lote.');
    if (event.data['Peso entregue (kg)'] !== demoLot.weightKg || event.data.Caixas !== demoLot.boxes) throw new Error('A demonstração transfere o lote inteiro: 240 kg em 16 caixas. Uma divisão do lote precisa de registos próprios.');
    return { ...next, pending: { id: event.id, from: event.actor, to: recipient } };
  }
  if (event.type === 'accept' || event.type === 'reject') {
    if (!state.pending || event.actor !== state.pending.to || event.reference !== state.pending.id) throw new Error('Só o destinatário pode confirmar ou recusar a entrega pendente.');
    if (event.type === 'reject') return { ...next, pending: null };
    if (event.data['Peso recebido (kg)'] !== demoLot.weightKg) throw new Error('A quantidade recebida não corresponde à entrega. Regista uma recusa ou uma divergência antes de confirmar.');
    return { ...next, pending: null, custodian: event.actor, stage: event.actor === 'carrier' ? 'transport' : 'received' };
  }
  throw new Error('O tipo de evento não é reconhecido.');
}
export function currentLotState(chain: readonly DemoBlock[]): LotState {
  let state: LotState = { stage: 'new', custodian: 'producer', pending: null, lastAt: '1970-01-01T00:00:00Z' };
  for (const block of chain) state = applyEvent(state, block.event);
  return state;
}
export async function submitDemoEvent(chain: readonly DemoBlock[], registry: DemoRegistry, event: LedgerEvent, online: ValidatorId[]): Promise<DemoBlock[]> {
  if (chain.some(block => block.event.id === event.id)) throw new Error('Este evento já foi registado.');
  const approvers = [...new Set(online)].filter(id => Object.hasOwn(registry.validators, id));
  if (approvers.length < 2) throw new Error('Aprovações insuficientes: são necessários pelo menos 2 dos 3 nós simulados. Nenhum evento foi gravado.');
  applyEvent(currentLotState(chain), event);
  const height = chain.length + 1, previousHash = chain.at(-1)?.hash || ZERO;
  const hash = await sha256(canonical({ height, previousHash, event }));
  const actorSignature = await sign(registry.actors[event.actor].privateKey, hash);
  const endorsements = await Promise.all(approvers.map(async validator => ({ validator, signature: await sign(registry.validators[validator].privateKey, hash) })));
  return [...chain, { height, previousHash, event: structuredClone(event), hash, actorSignature, endorsements }];
}
export async function verifyDemoChain(chain: readonly DemoBlock[], registry: DemoRegistry): Promise<Verification> {
  let previousHash = ZERO;
  const eventIds = new Set<string>();
  let state = currentLotState([]);
  for (const [index, block] of chain.entries()) {
    const fail = (message: string): Verification => ({ valid: false, checked: index, failedHeight: index + 1, message });
    if (block.height !== index + 1 || block.previousHash !== previousHash) return fail('A ligação ao bloco anterior não corresponde.');
    const hash = await sha256(canonical({ height: block.height, previousHash: block.previousHash, event: block.event }));
    if (hash !== block.hash) return fail('O conteúdo foi alterado e já não corresponde ao hash registado.');
    if (eventIds.has(block.event.id)) return fail('O mesmo evento aparece mais de uma vez.');
    eventIds.add(block.event.id);
    if (!registry.actors[block.event.actor] || !await verify(registry.actors[block.event.actor].publicKey, block.actorSignature, hash)) return fail('A assinatura do interveniente não é válida.');
    const endorsed = new Set<ValidatorId>();
    for (const item of block.endorsements) if (Object.hasOwn(registry.validators, item.validator) && await verify(registry.validators[item.validator].publicKey, item.signature, hash)) endorsed.add(item.validator);
    if (endorsed.size < 2) return fail('Faltam duas aprovações distintas e válidas.');
    try { state = applyEvent(state, block.event); } catch (cause) { return fail(cause instanceof Error ? cause.message : 'Sequência de eventos inválida.'); }
    previousHash = hash;
  }
  return { valid: true, checked: chain.length, message: `${chain.length} blocos verificados: conteúdo, ligações, assinaturas e regras do lote.` };
}
export async function createDemoChain(registry: DemoRegistry) {
  const inputs: { type: EventType; at: string; data: LedgerEvent['data'] }[] = [
    { type: 'planting', at: demoLot.plantedAt, data: { Estufa: demoLot.unit, Plantas: 180 } },
    { type: 'measurement', at: '2026-03-10T10:00:00Z', data: { 'Temperatura (°C)': 22.1, 'Humidade (%)': 78 } },
    { type: 'treatment', at: '2026-03-18T09:00:00Z', data: { 'Fumigações nesta intervenção': 1, Observações: 'Registo demonstrativo da indução floral.' } },
    { type: 'harvest', at: demoLot.harvestedAt, data: { 'Peso (kg)': 240, Frutos: 160 } },
    { type: 'packing', at: '2026-10-04T11:00:00Z', data: { Caixas: 16, 'Peso por caixa (kg)': 15 } },
  ];
  let chain: DemoBlock[] = [];
  for (const [index, input] of inputs.entries()) chain = await submitDemoEvent(chain, registry, { ...input, id: 'demo-event-' + (index + 1), lotId: demoLot.id, actor: 'producer' }, Object.keys(validators) as ValidatorId[]);
  return chain;
}
export function makeTransferEvent(state: LotState, actor: ParticipantId, accept = true): LedgerEvent {
  const date = state.pending ? state.pending.to === 'carrier' ? '2026-10-05T09:00:00Z' : '2026-10-06T10:15:00Z'
    : state.stage === 'packed' ? '2026-10-05T08:00:00Z' : '2026-10-06T10:00:00Z';
  const at = new Date(Math.max(Date.parse(date), Date.parse(state.lastAt))).toISOString();
  const base = { id: crypto.randomUUID(), lotId: demoLot.id, actor, at };
  if (state.pending) return { ...base, type: accept ? 'accept' : 'reject', reference: state.pending.id, data: accept ? { 'Peso recebido (kg)': 240, Confirmação: 'Lote e quantidade conferidos pelo destinatário.' } : { Motivo: 'Receção recusada na demonstração; a custódia mantém-se com o remetente.' } };
  return { ...base, type: 'offer', recipient: state.stage === 'packed' ? 'carrier' : 'retailer', data: { Guia: 'GT-DEMO-042', 'Peso entregue (kg)': 240, Caixas: 16 } };
}
export function publicQrData() {
  return { product: demoLot.product, producer: participants.producer.name, origin: demoLot.origin, lot: demoLot.id, harvestedAt: demoLot.harvestedAt, description: 'Ananás produzido em estufa em São Miguel. Informação demonstrativa selecionada para publicação.' };
}
