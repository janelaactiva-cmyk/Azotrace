type JsonObject = Record<string, unknown>;
function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
// JSONB changes object key order. Undefined object properties are omitted on the
// wire; array order, null, false and zero still have distinct meanings.
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => sameJson(value, b[index]));
  if (!isObject(a) || !isObject(b)) return false;
  const aKeys = Object.keys(a).filter(key => a[key] !== undefined);
  const bKeys = Object.keys(b).filter(key => b[key] !== undefined);
  return aKeys.length === bKeys.length && aKeys.every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}
export class WorkspaceConflict extends Error {
  constructor() { super('Estes dados foram alterados por outro utilizador. Atualiza a página antes de guardar.'); this.name = 'WorkspaceConflict'; }
}
const collectionIds: Record<string, string> = {
  records: 'id', qualityRecords: 'id', imports: 'id', batches: 'id', products: 'id',
  units: 'id', stages: 'id', fields: 'key', qrCodes: 'id', publications: 'batchId',
};
function indexed(values: unknown[], idKey: string) {
  const result = new Map<string, JsonObject>();
  for (const value of values) {
    if (!isObject(value)) throw new Error('Registo de produção inválido.');
    const id = value[idKey];
    if ((typeof id !== 'string' && typeof id !== 'number') || id === '') throw new Error('Registo sem identificador.');
    const key = typeof id + ':' + String(id);
    if (result.has(key)) throw new Error('Existem identificadores de registo repetidos.');
    result.set(key, value);
  }
  return result;
}
function assign(target: JsonObject, key: string, value: unknown) {
  if (value === undefined) delete target[key];
  else Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}
function mergeValue(current: unknown, base: unknown, next: unknown, strict: boolean, idKey?: string): unknown {
  if (sameJson(base, next)) return current;
  if (sameJson(current, next)) return current;
  if (sameJson(current, base)) return next;
  if (idKey && Array.isArray(base) && Array.isArray(next) && Array.isArray(current)) {
    const before = indexed(base, idKey), after = indexed(next, idKey), remote = indexed(current, idKey);
    const merged = new Map(remote);
    for (const [id, previous] of before) {
      if (!after.has(id)) {
        if (strict && remote.has(id) && !sameJson(remote.get(id), previous)) throw new WorkspaceConflict();
        merged.delete(id);
      } else if (!sameJson(previous, after.get(id))) {
        if (strict && !remote.has(id)) throw new WorkspaceConflict();
        merged.set(id, mergeValue(remote.get(id), previous, after.get(id), strict) as JsonObject);
      }
    }
    for (const [id, value] of after) {
      if (before.has(id)) continue;
      if (strict && remote.has(id) && !sameJson(remote.get(id), value)) throw new WorkspaceConflict();
      merged.set(id, value);
    }
    const retainedBase = [...before.keys()].filter(id => after.has(id) && merged.has(id));
    const localOrder = [...after.keys()].filter(id => before.has(id) && merged.has(id));
    const remoteOrder = [...remote.keys()].filter(id => before.has(id) && after.has(id) && merged.has(id));
    const reordered = !sameJson(retainedBase, localOrder);
    if (strict && reordered && !sameJson(retainedBase.filter(id => remote.has(id)), remoteOrder) && !sameJson(localOrder.filter(id => remote.has(id)), remoteOrder)) throw new WorkspaceConflict();
    const order = reordered ? [...after.keys()].filter(id => merged.has(id)) : [...remote.keys()].filter(id => merged.has(id));
    const desired = [...after.keys()];
    for (let i = 0; i < desired.length; i++) {
      const id = desired[i]!;
      if (!merged.has(id) || order.includes(id)) continue;
      const following = desired.slice(i + 1).find(candidate => order.includes(candidate));
      order.splice(following ? order.indexOf(following) : order.length, 0, id);
    }
    for (const id of merged.keys()) if (!order.includes(id)) order.push(id);
    return order.map(id => merged.get(id));
  }
  if (isObject(base) && isObject(next) && (isObject(current) || !strict)) {
    const remote = isObject(current) ? current : {};
    const result: JsonObject = { ...remote };
    for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
      if (sameJson(base[key], next[key])) continue;
      assign(result, key, mergeValue(remote[key], base[key], next[key], strict));
    }
    return result;
  }
  if (!strict) return next;
  throw new WorkspaceConflict();
}
export function mergeWorkspaceState<T extends object>(current: T, base: T, next: T, authorize?: (field: string) => void): T {
  if (!isObject(current) || !isObject(base) || !isObject(next)) throw new Error('Dados de produção inválidos.');
  const result: JsonObject = { ...current };
  for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
    if (sameJson(base[key], next[key])) continue;
    authorize?.(key);
    assign(result, key, mergeValue(current[key], base[key], next[key], true, collectionIds[key]));
  }
  return result as T;
}
// Project only explicit local edits onto a server snapshot, keeping defaults out
// of requests and preserving newer optimistic edits after a server reply.
export function applyLocalChanges<T extends object>(current: T, base: T, next: T): T {
  if (!isObject(current) || !isObject(base) || !isObject(next)) throw new Error('Dados de produção inválidos.');
  const result: JsonObject = { ...current };
  for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
    if (sameJson(base[key], next[key])) continue;
    assign(result, key, mergeValue(current[key], base[key], next[key], false, collectionIds[key]));
  }
  return result as T;
}
