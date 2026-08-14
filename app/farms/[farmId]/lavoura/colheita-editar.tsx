import { useLocalSearchParams } from 'expo-router';

import { EditHarvestEntryScreen } from '../../../../src/screens/EditHarvestEntryScreen';

/** Rota única pra editar uma nota de colheita, tanto vinda da fazenda solta
 * quanto de uma safra específica — a edição é sempre por id da nota, não
 * precisa saber o contexto de onde veio. */
export default function EditHarvestEntryRoute() {
  const { farmId, entryId } = useLocalSearchParams<{ farmId: string; entryId: string }>();
  return <EditHarvestEntryScreen farmId={farmId} entryId={entryId} />;
}
