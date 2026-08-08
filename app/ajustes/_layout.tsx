import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/theme';

/** Protege todas as rotas de /ajustes — sem sessão, volta pro login. */
export default function AjustesLayout() {
  const { session, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) return null;
  if (!session) return <Redirect href="/auth/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
