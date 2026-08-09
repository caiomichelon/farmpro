import { useLocalSearchParams } from 'expo-router';

import { ImportHarvestScreen } from '../../../../src/screens/ImportHarvestScreen';

/** Importar notas de colheita direto na fazenda, sem exigir talhão/safra. */
export default function FarmImportHarvestScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  return <ImportHarvestScreen farmId={farmId} />;
}
