import { ModulePlaceholder } from '../../../src/components/ModulePlaceholder';
import { colors } from '../../../src/theme';

export default function PecuariaScreen() {
  return (
    <ModulePlaceholder
      title="Pecuária"
      accentColor={colors.pecuaria}
      description="Corte (indicadores zootécnicos, lotes, frigoríficos) e Cria/Reprodução chegam na próxima etapa."
    />
  );
}
