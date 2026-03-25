import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import {
  calculateBilling,
  getMonthConfig,
  listIndexReadings,
  listInvoices,
  listResidents,
  updateInvoiceDebt,
} from '../services/BackendApi';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

interface InvoiceWithRoom {
  id: number;
  roomId: number;
  numero_chambre: string;
  nom_prenom: string;
  ancien_index_eau: number | null;
  nouvel_index_eau: number | null;
  ancien_index_elec: number | null;
  nouvel_index_elec: number | null;
  pu_eau: number | null;
  pu_electricite: number | null;
  tva_config: number | null;
  delai_paiement: string | null;
  conso_eau: number;
  montant_ht_eau: number;
  tva_eau: number;
  lc_eau: number;
  surplus_eau: number;
  amende_eau: number;
  montant_ttc_eau: number;
  conso_elec: number;
  montant_ht_elec: number;
  tva_elec: number;
  lc_elec: number;
  surplus_elec: number;
  montant_ttc_elec: number;
  dette: number | null;
  net_a_payer: number;
}

export default function InvoiceCalcScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);
  const [mois] = useState(getCurrentMonth());
  const [invoices, setInvoices] = useState<InvoiceWithRoom[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [debts, setDebts] = useState<Record<number, string>>({});

  const loadInvoices = useCallback(async () => {
    try {
      const [invoiceRows, residents, readings, config] = await Promise.all([
        listInvoices(mois),
        listResidents(),
        listIndexReadings(mois),
        getMonthConfig(mois),
      ]);
      const mapped: InvoiceWithRoom[] = invoiceRows.map((row) => {
        const resident = residents.find((r) => r.id === row.residentId) ?? residents.find((r) => r.currentRoomId === row.roomId);
        const reading = readings.find((r) => r.roomId === row.roomId);
        return {
          id: row.id,
          roomId: row.roomId,
          numero_chambre: row.roomNumber,
          nom_prenom: resident ? `${resident.nom} ${resident.prenom}`.trim() : '-',
          ancien_index_eau: reading?.anEau ?? null,
          nouvel_index_eau: reading?.niEau ?? null,
          ancien_index_elec: reading?.anElec ?? null,
          nouvel_index_elec: reading?.niElec ?? null,
          pu_eau: config?.puEau ?? null,
          pu_electricite: config?.puElectricite ?? null,
          tva_config: config?.tva ?? null,
          delai_paiement: row.delaiPaiement,
          conso_eau: row.water.conso,
          montant_ht_eau: row.water.montantHt,
          tva_eau: row.water.tva,
          lc_eau: row.water.lc,
          surplus_eau: row.water.surplus,
          amende_eau: row.water.amende,
          montant_ttc_eau: row.water.montantTtc,
          conso_elec: row.electricity.conso,
          montant_ht_elec: row.electricity.montantHt,
          tva_elec: row.electricity.tva,
          lc_elec: row.electricity.lc,
          surplus_elec: row.electricity.surplus,
          montant_ttc_elec: row.electricity.montantTtc,
          dette: row.dette,
          net_a_payer: row.netAPayer,
        };
      });
      setInvoices(mapped);
      const newDebts: Record<number, string> = {};
      mapped.forEach((inv) => {
        newDebts[inv.id] = inv.dette !== null ? inv.dette.toString() : '';
      });
      setDebts(newDebts);
    } catch (error) {
      console.error('Load invoices error:', error);
    }
  }, [mois]);

  useFocusEffect(useCallback(() => { loadInvoices(); }, [loadInvoices]));

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const result = await calculateBilling(mois, true);
      if (!result.success) {
        const errorMessages = result.errors.map((e) => e.message).join('\n');
        Alert.alert(t('error'), errorMessages || 'Calcul impossible');
      } else {
        Alert.alert(t('success'), `${result.count} facture(s) calculee(s).`);
        await loadInvoices();
      }
    } catch (error) {
      Alert.alert(t('error'), 'Erreur lors du calcul des factures.');
    } finally {
      setCalculating(false);
    }
  };

  const updateDebt = async (invoiceId: number) => {
    const debtStr = debts[invoiceId];
    const debtVal = debtStr ? parseFloat(debtStr) : null;
    try {
      await updateInvoiceDebt(invoiceId, Number.isNaN(debtVal as number) ? null : debtVal);
      await loadInvoices();
    } catch (error) {
      Alert.alert(t('error'), t('cannotUpdateDebt'));
    }
  };

  const totalGlobal = invoices.reduce((sum, inv) => sum + inv.net_a_payer, 0);

  const formatNum = (n: number) => Math.round(n).toLocaleString('fr-FR');
  const formatMaybe = (n: number | null | undefined) => (typeof n === 'number' ? formatNum(n) : '-');

  const renderInvoice = ({ item }: { item: InvoiceWithRoom }) => (
    <View style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <Text style={styles.roomNumber}>CH {item.numero_chambre}</Text>
        <Text style={styles.roomName}>{item.nom_prenom}</Text>
      </View>
      <View style={styles.invoiceRow}>
        <Text style={styles.invoiceLabel}>Eau TTC</Text>
        <Text style={styles.invoiceValue}>{formatNum(item.montant_ttc_eau)} FCFA</Text>
      </View>
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Detail eau</Text>
        <Text style={styles.detailText}>
          AN: {formatMaybe(item.ancien_index_eau)} | NI: {formatMaybe(item.nouvel_index_eau)} | Conso: {formatNum(item.conso_eau)}
        </Text>
        <Text style={styles.detailText}>
          PU: {formatMaybe(item.pu_eau)} | HT: {formatNum(item.montant_ht_eau)} | TVA coef: {item.tva_config ?? '-'}
        </Text>
        <Text style={styles.detailText}>
          TVA: {formatNum(item.tva_eau)} | LC: {formatNum(item.lc_eau)} | Surplus: {formatNum(item.surplus_eau)} | Amende: {formatNum(item.amende_eau)}
        </Text>
        <Text style={styles.sectionTotal}>
          TTC eau: {formatNum(item.montant_ttc_eau)} FCFA
        </Text>
      </View>
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Detail electricite</Text>
        <Text style={styles.detailText}>
          AN: {formatMaybe(item.ancien_index_elec)} | NI: {formatMaybe(item.nouvel_index_elec)} | Conso: {formatNum(item.conso_elec)}
        </Text>
        <Text style={styles.detailText}>
          PU: {formatMaybe(item.pu_electricite)} | HT: {formatNum(item.montant_ht_elec)} | TVA coef: {item.tva_config ?? '-'}
        </Text>
        <Text style={styles.detailText}>
          TVA: {formatNum(item.tva_elec)} | LC: {formatNum(item.lc_elec)} | Surplus: {formatNum(item.surplus_elec)}
        </Text>
        <Text style={styles.sectionTotal}>
          TTC electricite: {formatNum(item.montant_ttc_elec)} FCFA
        </Text>
      </View>
      <View style={styles.invoiceRow}>
        <Text style={styles.invoiceLabel}>Total facture</Text>
        <Text style={[styles.invoiceValue, { fontWeight: 'bold' }]}>
          {formatNum(item.montant_ttc_eau + item.montant_ttc_elec)} FCFA
        </Text>
      </View>

      <View style={styles.debtRow}>
        <Text style={styles.invoiceLabel}>Dette</Text>
        <TextInput
          style={styles.debtInput}
          value={debts[item.id] || ''}
          onChangeText={v => setDebts(prev => ({ ...prev, [item.id]: v }))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.disabled}
          onBlur={() => updateDebt(item.id)}
        />
      </View>

      <View style={[styles.invoiceRow, styles.napRow]}>
        <Text style={styles.napLabel}>Net a payer</Text>
        <Text style={styles.napValue}>{formatNum(item.net_a_payer)} FCFA</Text>
      </View>
      {!!item.delai_paiement && (
        <Text style={styles.deadlineText}>Delai de paiement: {item.delai_paiement}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('invoicesTitle')} - {mois}</Text>
        <Text style={styles.headerSubtitle}>{invoices.length} facture(s)</Text>
      </View>

      <TouchableOpacity
        style={styles.calcButton}
        onPress={handleCalculate}
        disabled={calculating}
      >
        {calculating ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.calcButtonText}>{t('launchCalculation')}</Text>
        )}
      </TouchableOpacity>

      {invoices.length > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total facture toutes chambres</Text>
          <Text style={styles.totalValue}>{formatNum(totalGlobal)} FCFA</Text>
        </View>
      )}

      <FlatList
        data={invoices}
        keyExtractor={item => item.id.toString()}
        renderItem={renderInvoice}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('noInvoicesCalculated')}</Text>
        }
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: SIZES.padding, backgroundColor: colors.secondary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  headerSubtitle: { fontSize: SIZES.md, color: colors.white },
  calcButton: {
    height: SIZES.buttonHeight, backgroundColor: colors.primary, borderRadius: SIZES.radius,
    justifyContent: 'center', alignItems: 'center', margin: SIZES.margin,
  },
  calcButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  totalBanner: {
    backgroundColor: colors.primary, marginHorizontal: SIZES.margin, borderRadius: SIZES.radius,
    padding: SIZES.padding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SIZES.margin,
  },
  totalLabel: { fontSize: SIZES.md, color: colors.white },
  totalValue: { fontSize: SIZES.xl, fontWeight: 'bold', color: colors.white },
  list: { paddingHorizontal: SIZES.padding, paddingBottom: 20 },
  invoiceCard: {
    backgroundColor: colors.cardBg, borderRadius: SIZES.radius, padding: SIZES.padding,
    marginBottom: SIZES.margin / 2, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  invoiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  roomNumber: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
  roomName: { fontSize: SIZES.md, color: colors.text },
  invoiceRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2,
  },
  sectionBox: {
    marginTop: 6,
    marginBottom: 6,
    padding: 8,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 2,
  },
  sectionTitle: { fontSize: SIZES.md, fontWeight: '700', color: colors.text },
  detailText: { fontSize: SIZES.sm, color: colors.textLight },
  sectionTotal: { fontSize: SIZES.md, fontWeight: '700', color: colors.text, marginTop: 4 },
  invoiceLabel: { fontSize: SIZES.md, color: colors.textLight },
  invoiceValue: { fontSize: SIZES.md, color: colors.text },
  debtRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4,
  },
  debtInput: {
    width: 120, height: 36, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: 8, fontSize: SIZES.md, textAlign: 'right', color: colors.text,
  },
  napRow: {
    borderTopWidth: 2, borderTopColor: colors.primary, marginTop: 4, paddingTop: 8,
  },
  napLabel: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
  napValue: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
  deadlineText: { marginTop: 6, fontSize: SIZES.sm, color: colors.textLight, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 40, fontSize: SIZES.md },
});
}
