import { useLocalSearchParams } from 'expo-router';

import { ImportHarvestScreen } from '../../../../../../src/screens/ImportHarvestScreen';

export default function SeasonImportHarvestScreen() {
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  return <ImportHarvestScreen farmId={farmId} seasonId={seasonId} />;
}
