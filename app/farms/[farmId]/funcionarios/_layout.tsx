import { Stack } from 'expo-router';

import { colors } from '../../../../src/theme';

export default function FuncionariosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="novo-funcionario" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="importar" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
