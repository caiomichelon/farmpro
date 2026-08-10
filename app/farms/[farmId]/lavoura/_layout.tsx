import { Stack } from 'expo-router';

import { useColors } from '../../../../src/theme';

export default function LavouraLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="novo-talhao" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen
        name="talhao/[plotId]/nova-safra"
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="safra/[seasonId]/nova-venda"
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="estoque/novo-item" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="estoque/item/[itemId]/nova-movimentacao" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
