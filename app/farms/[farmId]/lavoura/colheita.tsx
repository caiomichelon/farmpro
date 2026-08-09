import { useLocalSearchParams } from 'expo-router';

import { HarvestScreen } from '../../../../src/screens/HarvestScreen';

/** Colheita direto na fazenda, sem exigir talhão/safra — pra quem só quer
 * lançar as notas dos caminhões. */
export default function FarmHarvestScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  return <HarvestScreen farmId={farmId} />;
}
