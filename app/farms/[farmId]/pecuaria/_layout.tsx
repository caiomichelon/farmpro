import { Stack } from 'expo-router';

import { colors } from '../../../../src/theme';

// NOTA: já usamos `presentation: 'modal'` aqui, mas revertemos — no Expo Go em
// iOS as telas com apresentação modal nativa renderizavam em branco (bug
// relatado testando no aparelho de verdade; no `expo start --web` não
// reproduzia, porque a web ignora `presentation` e sempre faz push normal).
// Mantemos só a animação de subida, sem trocar o tipo de apresentação.
const modalOptions = { animation: 'slide_from_bottom' as const };

export default function PecuariaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="corte/novo-lote" options={modalOptions} />
      <Stack.Screen name="corte/lote/[lotId]/animais/novo-animal" options={modalOptions} />
      <Stack.Screen name="corte/lote/[lotId]/nova-pesagem" options={modalOptions} />
      <Stack.Screen name="corte/lote/[lotId]/mortalidade" options={modalOptions} />
      <Stack.Screen name="corte/lote/[lotId]/abate" options={modalOptions} />
      <Stack.Screen name="corte/animal/[animalId]/nova-pesagem" options={modalOptions} />
      <Stack.Screen name="corte/animal/[animalId]/novo-evento-saude" options={modalOptions} />
      <Stack.Screen name="corte/animal/[animalId]/mover-lote" options={modalOptions} />
      <Stack.Screen name="cria/nova-matriz" options={modalOptions} />
      <Stack.Screen name="cria/matriz/[cowId]/nova-inseminacao" options={modalOptions} />
      <Stack.Screen name="cria/matriz/[cowId]/novo-parto" options={modalOptions} />
      <Stack.Screen name="cria/matriz/[cowId]/diagnostico" options={modalOptions} />
      <Stack.Screen name="cria/matriz/[cowId]/desmame" options={modalOptions} />
      <Stack.Screen name="cria/matriz/[cowId]/nova-pesagem" options={modalOptions} />
      <Stack.Screen name="corte/importar" options={modalOptions} />
      <Stack.Screen name="corte/lote/[lotId]/animais/importar" options={modalOptions} />
      <Stack.Screen name="cria/importar" options={modalOptions} />
    </Stack>
  );
}
