import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme';

/** Protege todas as rotas de /farms — sem sessão, volta pro login. */
export default function FarmsLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;
  if (!session) return <Redirect href="/auth/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[farmId]/exportar" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
