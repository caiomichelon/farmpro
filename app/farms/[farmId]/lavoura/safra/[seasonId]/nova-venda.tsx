import { useLocalSearchParams } from 'expo-router';

import { NewSaleScreen } from '../../../../../../src/screens/NewSaleScreen';

export default function SeasonNewSaleScreen() {
  const { farmId, seasonId, harvestEntryId, quantity, truckPlate } = useLocalSearchParams<{
    farmId: string;
    seasonId: string;
    harvestEntryId?: string;
    quantity?: string;
    truckPlate?: string;
  }>();
  return (
    <NewSaleScreen
      farmId={farmId}
      seasonId={seasonId}
      harvestEntryId={harvestEntryId}
      prefillQuantity={quantity}
      prefillTruckPlate={truckPlate}
    />
  );
}
