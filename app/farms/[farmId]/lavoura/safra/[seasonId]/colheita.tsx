import { useLocalSearchParams } from 'expo-router';

import { HarvestScreen } from '../../../../../../src/screens/HarvestScreen';

export default function SeasonHarvestScreen() {
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  return <HarvestScreen farmId={farmId} seasonId={seasonId} />;
}
