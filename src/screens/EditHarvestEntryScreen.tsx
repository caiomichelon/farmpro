import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChipSelect } from '../components/ChipSelect';
import { PhotoPicker } from '../components/PhotoPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { useGrainBuyers } from '../hooks/useGrainBuyers';
import { supabase } from '../lib/supabase';
import { radius, spacing, typography, useColors, type Colors } from '../theme';
import type { HarvestEntry } from '../types/database';

/** Converte "DD/MM/AAAA" em "AAAA-MM-DD". */
function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** Editar uma nota de colheita já lançada — pensada principalmente pra
 * completar informação que ficou faltando (comprador, umidade, peso antes
 * do desconto) numa nota antiga, seja de importação de planilha sem essas
 * colunas ou de antes do app capturar isso. Funciona pra nota amarrada a
 * uma safra ou solta direto na fazenda — não precisa saber qual dos dois é,
 * já que a edição é sempre por id. */
export function EditHarvestEntryScreen({ farmId, entryId }: { farmId: string; entryId: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { buyers, createBuyer } = useGrainBuyers(farmId);

  const [entry, setEntry] = useState<HarvestEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('harvest_entries').select('*').eq('id', entryId).single();
      if (cancelled) return;
      if (error) {
        setLoadError('Não encontrei essa nota — pode ter sido removida.');
        setIsLoading(false);
        return;
      }
      setEntry(data as HarvestEntry);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      </SafeAreaView>
    );
  }

  if (loadError || !entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Editar nota de colheita" />
        <View style={styles.content}>
          <Text style={styles.error}>{loadError ?? 'Nota não encontrada.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // key={entry.id} garante que o formulário abaixo reinicia o estado com os
  // valores certos sempre que a entrada carregada muda.
  return <EditForm key={entry.id} farmId={farmId} entry={entry} buyers={buyers} createBuyer={createBuyer} colors={colors} styles={styles} />;
}

function EditForm({
  farmId,
  entry,
  buyers,
  createBuyer,
  colors,
  styles,
}: {
  farmId: string;
  entry: HarvestEntry;
  buyers: ReturnType<typeof useGrainBuyers>['buyers'];
  createBuyer: ReturnType<typeof useGrainBuyers>['createBuyer'];
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [quantity, setQuantity] = useState(String(entry.quantity_sacas));
  const [harvestedAt, setHarvestedAt] = useState(formatDate(entry.harvested_at));
  const [truckPlate, setTruckPlate] = useState(entry.truck_plate ?? '');
  const [driverName, setDriverName] = useState(entry.driver_name ?? '');
  const [grossWeight, setGrossWeight] = useState(entry.gross_weight_kg !== null ? String(entry.gross_weight_kg) : '');
  const [netWeight, setNetWeight] = useState(entry.net_weight_kg !== null ? String(entry.net_weight_kg) : '');
  const [rawWeight, setRawWeight] = useState(entry.raw_net_weight_kg !== null ? String(entry.raw_net_weight_kg) : '');
  const [humidity, setHumidity] = useState(entry.humidity_pct !== null ? String(entry.humidity_pct) : '');
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(entry.photo_url);

  // A nota antiga pode ter um comprador digitado que não bate com nenhum
  // cadastrado (veio livre de planilha, por exemplo) — nesse caso não marca
  // nenhum chip, só mostra o texto atual, pra não sobrescrever sem querer.
  const matchingBuyer = buyers.find((b) => b.name === entry.buyer_name);
  const [buyerId, setBuyerId] = useState<string | null>(matchingBuyer?.id ?? null);
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleAddBuyer() {
    if (!newBuyerName.trim()) return;
    const { error: createError, id } = await createBuyer({ name: newBuyerName.trim() });
    if (createError) {
      setError(createError);
      return;
    }
    if (id) setBuyerId(id);
    setNewBuyerName('');
    setIsAddingBuyer(false);
  }

  async function handleSave() {
    const quantityValue = Number(quantity.replace(',', '.'));
    if (!quantityValue || quantityValue <= 0) {
      setError('Informe uma quantidade válida em sacas.');
      return;
    }
    const dateValue = parseDate(harvestedAt);
    if (!dateValue) {
      setError('Data inválida — use DD/MM/AAAA.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const buyerName = buyerId ? buyers.find((b) => b.id === buyerId)?.name ?? null : entry.buyer_name;
    const { error: updateError } = await supabase
      .from('harvest_entries')
      .update({
        quantity_sacas: quantityValue,
        harvested_at: dateValue,
        truck_plate: truckPlate.trim() || null,
        driver_name: driverName.trim() || null,
        buyer_name: buyerName,
        gross_weight_kg: grossWeight.trim() ? Number(grossWeight.replace(',', '.')) : null,
        net_weight_kg: netWeight.trim() ? Number(netWeight.replace(',', '.')) : null,
        raw_net_weight_kg: rawWeight.trim() ? Number(rawWeight.replace(',', '.')) : null,
        humidity_pct: humidity.trim() ? Number(humidity.replace(',', '.')) : null,
        notes: notes.trim() || null,
        photo_url: photoUrl,
      })
      .eq('id', entry.id);
    setIsSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Editar nota de colheita" subtitle="Corrija ou complete o que faltou — comprador, umidade, peso antes do desconto" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {saved ? <Text style={styles.savedBanner}>✓ Nota atualizada</Text> : null}

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Nota</Text>
            <TextField label="Sacas colhidas" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
            <TextField label="Data" value={harvestedAt} onChangeText={setHarvestedAt} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" />
            <TextField label="Placa do caminhão" value={truckPlate} onChangeText={setTruckPlate} placeholder="Opcional" autoCapitalize="characters" />
            <TextField label="Motorista" value={driverName} onChangeText={setDriverName} placeholder="Opcional" />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Peso e umidade</Text>
            <TextField label="Peso bruto (kg)" value={grossWeight} onChangeText={setGrossWeight} keyboardType="decimal-pad" placeholder="Opcional" />
            <TextField label="Peso líquido p/ fixação (kg)" value={netWeight} onChangeText={setNetWeight} keyboardType="decimal-pad" placeholder="Opcional" />
            <TextField label="Peso antes do desconto (kg)" value={rawWeight} onChangeText={setRawWeight} keyboardType="decimal-pad" placeholder="Se diferente do líquido" />
            <TextField label="Umidade (%)" value={humidity} onChangeText={setHumidity} keyboardType="decimal-pad" placeholder="Ex.: 14" />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Comprador</Text>
            {entry.buyer_name && !matchingBuyer ? (
              <Text style={styles.help}>Nota atual: "{entry.buyer_name}" — escolha um comprador cadastrado abaixo pra trocar, ou deixe como está.</Text>
            ) : null}
            {buyers.length > 0 ? (
              <ChipSelect
                label="Comprador"
                options={buyers.map((b) => ({ value: b.id, label: b.name }))}
                value={buyerId}
                onChange={setBuyerId}
                accentColor={colors.lavoura}
              />
            ) : null}
            {isAddingBuyer ? (
              <View style={styles.inlineRow}>
                <View style={{ flex: 1 }}>
                  <TextField label="Nome do novo comprador" value={newBuyerName} onChangeText={setNewBuyerName} placeholder="Ex.: Cooperativa Lar" />
                </View>
                <Button label="Adicionar" onPress={handleAddBuyer} disabled={!newBuyerName.trim()} />
              </View>
            ) : (
              <Button label="+ Novo comprador" variant="ghost" onPress={() => setIsAddingBuyer(true)} />
            )}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Outros</Text>
            <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
            <PhotoPicker label="Foto da nota de pesagem" photoUrl={photoUrl} onChange={setPhotoUrl} farmId={farmId} folder="harvest-entries" accentColor={colors.lavoura} />
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actionsRow}>
            <Button label="Voltar" variant="ghost" onPress={() => router.back()} style={styles.flexButton} />
            <Button label="Salvar alterações" onPress={handleSave} loading={isSaving} style={styles.flexButton} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    card: {
      gap: spacing.md,
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.lavoura,
    },
    help: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.md,
    },
    savedBanner: {
      ...typography.captionMedium,
      color: colors.lavoura,
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    flexButton: {
      flex: 1,
    },
    error: {
      color: colors.danger,
    },
  });
}
