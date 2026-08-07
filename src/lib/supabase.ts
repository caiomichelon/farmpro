import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/database';

// Variáveis com prefixo EXPO_PUBLIC_ são embutidas no bundle pelo Metro a
// partir do arquivo .env na raiz do projeto (sem precisar de app.config.js).
// Ver .env.example.
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(envUrl && envAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY não definidos. ' +
      'Copie .env.example para .env e preencha com as chaves do seu projeto Supabase. ' +
      'O app vai carregar as telas, mas nenhuma chamada ao backend vai funcionar até isso ser configurado.'
  );
}

// createClient exige uma URL válida — sem isso ele lança e derruba o app
// inteiro na inicialização. Usamos um placeholder só pra manter o app de pé
// (as chamadas de rede vão falhar normalmente, o que já é esperado sem
// configuração real).
const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envAnonKey || 'placeholder-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
