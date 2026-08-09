import { useLocalSearchParams } from 'expo-router';

import { NewSaleScreen } from '../../../../src/screens/NewSaleScreen';

/** Nova venda direto na fazenda, sem exigir talhão/safra. */
export default function FarmNewSaleScreen() {
  const { farmId, harvestEntryId, quantity, truckPlate } = useLocalSearchParams<{
    farmId: string;
    harvestEntryId?: string;
    quantity?: string;
    truckPlate?: string;
  }>();
  return (
    <NewSaleScreen farmId={farmId} harvestEntryId={harvestEntryId} prefillQuantity={quantity} prefillTruckPlate={truckPlate} />
  );
}
