import { useLocalSearchParams } from 'expo-router';

import { SalesScreen } from '../../../../../../src/screens/SalesScreen';

export default function SeasonSalesScreen() {
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  return <SalesScreen farmId={farmId} seasonId={seasonId} />;
}
