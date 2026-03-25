import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { getMonthConfig, upsertMonthConfig } from '../services/BackendApi';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getPreviousMonth(m: string): string {
  const parts = m.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  if (month === 0) { month = 12; year--; }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function getMonthLabel(mois: string): string {
  const months = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
  ];
  const parts = mois.split('-');
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${months[monthIndex]} ${parts[0]}`;
}

export default function MonthConfigScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);
  const [mois] = useState(getCurrentMonth());
  const [existingId, setExistingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    puEau: '',
    puElec: '',
    tva: '19.25',
    lcEau: '',
    lcElec: '',
    surplusEau: '0',
    surplusElec: '0',
    penaltyMissingIndex: '0',
    windowStartDay: '25',
    windowEndDay: '30',
    delaiPaiement: '',
  });

  const loadConfig = useCallback(async () => {
    try {
      const config = await getMonthConfig(mois);

      if (config) {
        setExistingId(config.id);
        setForm({
          puEau: config.puEau.toString(),
          puElec: config.puElectricite.toString(),
          tva: config.tva.toString(),
          lcEau: config.lcEau.toString(),
          lcElec: config.lcElectricite.toString(),
          surplusEau: config.surplusEauTotal.toString(),
          surplusElec: config.surplusElecTotal.toString(),
          penaltyMissingIndex: (config.penaltyMissingIndex ?? 0).toString(),
          windowStartDay: (config.indexWindowStartDay ?? 25).toString(),
          windowEndDay: (config.indexWindowEndDay ?? 30).toString(),
          delaiPaiement: formatDateFr(config.delaiPaiement),
        });
      } else {
        // Try to carry over from previous month
        const prevMonth = getPreviousMonth(mois);
        const prevConfig = await getMonthConfig(prevMonth);
        if (prevConfig) {
          setForm({
            puEau: prevConfig.puEau.toString(),
            puElec: prevConfig.puElectricite.toString(),
            tva: prevConfig.tva.toString(),
            lcEau: prevConfig.lcEau.toString(),
            lcElec: prevConfig.lcElectricite.toString(),
            surplusEau: '0',
            surplusElec: '0',
            penaltyMissingIndex: (prevConfig.penaltyMissingIndex ?? 0).toString(),
            windowStartDay: (prevConfig.indexWindowStartDay ?? 25).toString(),
            windowEndDay: (prevConfig.indexWindowEndDay ?? 30).toString(),
            delaiPaiement: '',
          });
        }
      }
    } catch (error) {
      console.error('Load config error:', error);
    }
  }, [mois]);

  useFocusEffect(useCallback(() => { loadConfig(); }, [loadConfig]));

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const saveConfig = async () => {
    const puEau = parseFloat(form.puEau);
    const puElec = parseFloat(form.puElec);
    const tva = parseFloat(form.tva);
    const lcEau = parseFloat(form.lcEau);
    const lcElec = parseFloat(form.lcElec);
    const surplusEau = parseFloat(form.surplusEau) || 0;
    const surplusElec = parseFloat(form.surplusElec) || 0;
    const penaltyMissingIndex = parseFloat(form.penaltyMissingIndex) || 0;
    const windowStartDay = parseInt(form.windowStartDay, 10);
    const windowEndDay = parseInt(form.windowEndDay, 10);

    if (isNaN(puEau) || isNaN(puElec) || isNaN(tva) || isNaN(lcEau) || isNaN(lcElec)) {
      Alert.alert(t('error'), 'Veuillez remplir tous les champs obligatoires avec des valeurs valides.');
      return;
    }

    if (surplusEau < 0 || surplusElec < 0) {
      Alert.alert(t('error'), 'Le surplus ne peut pas etre negatif.');
      return;
    }

    if (Number.isNaN(windowStartDay) || Number.isNaN(windowEndDay)) {
      Alert.alert(t('error'), 'Les jours de la periode doivent etre valides.');
      return;
    }

    if (!form.delaiPaiement.trim()) {
      Alert.alert(t('error'), 'Veuillez definir la date limite de paiement.');
      return;
    }

    const delaiPaiementIso = toApiDate(form.delaiPaiement.trim());
    if (!delaiPaiementIso) {
      Alert.alert(t('error'), 'Format date invalide. Utilisez JJ/MM/AAAA.');
      return;
    }

    try {
      await upsertMonthConfig(mois, {
        puEau,
        puElectricite: puElec,
        tva,
        lcEau,
        lcElectricite: lcElec,
        surplusEauTotal: surplusEau,
        surplusElecTotal: surplusElec,
        penaltyMissingIndex,
        indexWindowStartDay: windowStartDay,
        indexWindowEndDay: windowEndDay,
        exportsValidatedByConcierge: false,
        exportsValidatedAt: null,
        exportsValidatedBy: null,
        amendeEauMontant: 3000,
        minimumFacture: 500,
        delaiPaiement: delaiPaiementIso,
      });
      Alert.alert(t('success'), t('monthParamsSaved'));
      await loadConfig();
    } catch (error) {
      Alert.alert(t('error'), 'Impossible de sauvegarder les parametres.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('monthParamsTitle')} - {getMonthLabel(mois)}</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>{t('unitPrices')}</Text>

        <Text style={styles.label}>PU Eau (FCFA/m3)</Text>
        <TextInput
          style={styles.input}
          value={form.puEau}
          onChangeText={v => updateField('puEau', v)}
          keyboardType="decimal-pad"
          placeholder="Ex: 500"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>PU Electricite (FCFA/kWh)</Text>
        <TextInput
          style={styles.input}
          value={form.puElec}
          onChangeText={v => updateField('puElec', v)}
          keyboardType="decimal-pad"
          placeholder="Ex: 100"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.sectionTitle}>{t('meterRent')}</Text>

        <Text style={styles.label}>LC Eau (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={form.lcEau}
          onChangeText={v => updateField('lcEau', v)}
          keyboardType="decimal-pad"
          placeholder="Ex: 1000"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>LC Electricite (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={form.lcElec}
          onChangeText={v => updateField('lcElec', v)}
          keyboardType="decimal-pad"
          placeholder="Ex: 1000"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.sectionTitle}>{t('mainMeterSurplus')}</Text>

        <Text style={styles.label}>Surplus Eau Total (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={form.surplusEau}
          onChangeText={v => updateField('surplusEau', v)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>Surplus Electricite Total (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={form.surplusElec}
          onChangeText={v => updateField('surplusElec', v)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>Penalite retard / index manquant (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={form.penaltyMissingIndex}
          onChangeText={v => updateField('penaltyMissingIndex', v)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.sectionTitle}>Periode de saisie</Text>

        <Text style={styles.label}>Jour debut (1-31)</Text>
        <TextInput
          style={styles.input}
          value={form.windowStartDay}
          onChangeText={v => updateField('windowStartDay', v)}
          keyboardType="numeric"
          placeholder="25"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>Jour fin (1-31)</Text>
        <TextInput
          style={styles.input}
          value={form.windowEndDay}
          onChangeText={v => updateField('windowEndDay', v)}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.sectionTitle}>{t('vatAndDeadline')}</Text>

        <Text style={styles.label}>TVA (%)</Text>
        <TextInput
          style={styles.input}
          value={form.tva}
          onChangeText={v => updateField('tva', v)}
          keyboardType="decimal-pad"
          placeholder="19.25"
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>{t('paymentDeadline')}</Text>
        <TextInput
          style={styles.input}
          value={form.delaiPaiement}
          onChangeText={v => updateField('delaiPaiement', v)}
          placeholder="Ex: 15/04/2025"
          placeholderTextColor={colors.disabled}
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveConfig}>
          <Text style={styles.saveButtonText}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function toApiDate(value: string): string | null {
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (fr) {
    return `${fr[3]}-${fr[2]}-${fr[1]}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return value;
  return null;
}

function formatDateFr(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!iso) return value;
  return `${iso[3]}/${iso[2]}/${iso[1]}`;
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: SIZES.padding, backgroundColor: colors.primary,
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  formContainer: {
    backgroundColor: colors.cardBg, borderRadius: SIZES.radius,
    margin: SIZES.margin, padding: SIZES.padding,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.lg, fontWeight: 'bold', color: colors.secondary,
    marginTop: 16, marginBottom: 8, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingBottom: 4,
  },
  label: { fontSize: SIZES.md, fontWeight: '600', color: colors.text, marginBottom: 4, marginTop: 12 },
  input: {
    height: SIZES.inputHeight, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding, fontSize: SIZES.md, color: colors.text, backgroundColor: colors.inputBg,
  },
  saveButton: {
    height: SIZES.buttonHeight, backgroundColor: colors.primary, borderRadius: SIZES.radius,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },
  saveButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
});
}
