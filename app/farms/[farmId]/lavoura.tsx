import { ModulePlaceholder } from '../../../src/components/ModulePlaceholder';
import { colors } from '../../../src/theme';

export default function LavouraScreen() {
  return (
    <ModulePlaceholder
      title="Lavoura"
      accentColor={colors.lavoura}
      description="Talhões, custo de produção, colheita e compradores de grão chegam na próxima etapa."
    />
  );
}
