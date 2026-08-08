import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { EmployeeMessage, EmployeeMessageSender } from '../types/database';

/** Chat entre funcionário e gerente — sem login separado pro funcionário,
 * quem estiver com o celular na mão escolhe "enviando como" na tela (mesmo
 * padrão do ponto digital). Mensagens em ordem cronológica, mais antiga
 * primeiro, como qualquer app de chat. */
export function useEmployeeMessages(employeeId: string | undefined) {
  const [messages, setMessages] = useState<EmployeeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('employee_messages')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as mensagens.');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sendMessage = useCallback(
    async (sender: EmployeeMessageSender, body: string) => {
      if (!employeeId) return { error: 'Funcionário não encontrado.' };
      if (!body.trim()) return { error: 'Escreva uma mensagem.' };

      const { error: insertError } = await supabase.from('employee_messages').insert({
        employee_id: employeeId,
        sender,
        body: body.trim(),
        // Mensagem do gerente já nasce "lida" (ele acabou de escrever); só
        // a do funcionário fica pendente até o gerente abrir a conversa.
        read_at: sender === 'gerente' ? new Date().toISOString() : null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [employeeId, reload]
  );

  // Chamar quando o gerente abre a conversa — marca as mensagens do
  // funcionário como lidas, pra sumir o badge de "não lida" na lista.
  const markReadByManager = useCallback(async () => {
    if (!employeeId) return;
    await supabase
      .from('employee_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('employee_id', employeeId)
      .eq('sender', 'funcionario')
      .is('read_at', null);
    await reload();
  }, [employeeId, reload]);

  return { messages, isLoading, error, reload, sendMessage, markReadByManager };
}
