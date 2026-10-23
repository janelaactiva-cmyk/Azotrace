'use client';

type Message = Readonly<{ id: number; kind: 'notice' | 'confirm'; text: string }>;
type Pending = { message: Message; resolve: (answer: boolean) => void };
const queue: Pending[] = [];
const listeners = new Set<() => void>();
let nextId = 0;
const publish = () => { for (const listener of listeners) listener(); };
function enqueue(kind: Message['kind'], text: string): Promise<boolean> {
  return new Promise(resolve => {
    queue.push({ message: { id: ++nextId, kind, text }, resolve });
    publish();
  });
}
export async function showMessage(text: string): Promise<void> { await enqueue('notice', text); }
export function confirmMessage(text: string): Promise<boolean> { return enqueue('confirm', text); }
export const subscribeMessages = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getMessage = (): Message | null => queue[0]?.message ?? null;
export const getServerMessage = (): Message | null => null;
export function closeMessage(id: number, confirmed: boolean): void {
  if (queue[0]?.message.id !== id) return;
  const pending = queue.shift()!;
  pending.resolve(confirmed);
  publish();
}
