import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

const STORAGE_KEY = 'farmpro:offline-queue';

export interface QueuedMutation {
  id: string;
  table: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

async function readQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/** Enfileira um insert que não conseguiu sair na hora (sem sinal) — fica
 * guardado no aparelho até a próxima sincronização. */
export async function enqueueMutation(table: string, payload: Record<string, unknown>): Promise<QueuedMutation> {
  const queue = await readQueue();
  const mutation: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    table,
    payload,
    createdAt: new Date().toISOString(),
  };
  queue.push(mutation);
  await writeQueue(queue);
  return mutation;
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  return readQueue();
}

export async function getQueueCount(): Promise<number> {
  return (await readQueue()).length;
}

/** Heurística pra distinguir "sem sinal" de um erro de verdade (RLS,
 * validação etc.) — mensagens de falha de rede variam por plataforma, mas
 * convergem pra essas poucas frases. */
export function isLikelyNetworkError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('network request failed') ||
    m.includes('network error') ||
    m.includes('load failed') ||
    m.includes('the internet connection appears to be offline')
  );
}

/** Tenta mandar cada item da fila pro Supabase — o que conseguir sai da
 * fila, o que falhar (ainda sem sinal) continua guardado pra próxima
 * tentativa. Chamado ao abrir o app, ao voltar a conexão, e manualmente
 * pelo botão "Sincronizar agora". */
export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const stillPending: QueuedMutation[] = [];
  let synced = 0;

  for (const mutation of queue) {
    try {
      const { error } = await supabase.from(mutation.table as never).insert(mutation.payload as never);
      if (error) throw error;
      synced++;
    } catch {
      stillPending.push(mutation);
    }
  }

  await writeQueue(stillPending);
  return { synced, remaining: stillPending.length };
}
