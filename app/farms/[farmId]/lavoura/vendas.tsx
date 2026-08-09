import { useLocalSearchParams } from 'expo-router';

import { SalesScreen } from '../../../../src/screens/SalesScreen';

/** Vendas direto na fazenda, sem exigir talhão/safra. */
export default function FarmSalesScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  return <SalesScreen farmId={farmId} />;
}
