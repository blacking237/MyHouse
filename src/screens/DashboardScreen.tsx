import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { getMonthConfig, listIndexReadings, listInvoices, listRooms } from '../services/BackendApi';

interface DashboardStats {
  totalRooms: number;
  roomsWithIndex: number;
  invoicesCalculated: number;
  invoicesSent: number;
  paymentsReceived: number;
  currentMonth: string;
  monthConfigured: boolean;
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);

  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    roomsWithIndex: 0,
    invoicesCalculated: 0,
    invoicesSent: 0,
    paymentsReceived: 0,
    currentMonth: getCurrentMonth(),
    monthConfigured: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const mois = getCurrentMonth();
      const [rooms, readings, invoices, config] = await Promise.all([
        listRooms(true),
        listIndexReadings(mois),
        listInvoices(mois),
        getMonthConfig(mois),
      ]);

      setStats({
        totalRooms: rooms.length,
        roomsWithIndex: readings.length,
        invoicesCalculated: invoices.length,
        invoicesSent: invoices.filter((i) => i.statutEnvoi === 'ENVOYE').length,
        paymentsReceived: 0,
        currentMonth: mois,
        monthConfigured: !!config,
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const isComplete = stats.roomsWithIndex === stats.totalRooms && stats.totalRooms > 0;
  const statusLabel = isComplete ? t('dashboardComplete') : t('dashboardInProgress');
  const statusColor = isComplete ? colors.success : colors.warning;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.monthBanner}>
        <Text style={styles.monthText}>{getMonthLabel(stats.currentMonth)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      {stats.roomsWithIndex < stats.totalRooms && stats.totalRooms > 0 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            {stats.totalRooms - stats.roomsWithIndex} {t('roomsPendingAlert')}
          </Text>
        </View>
      )}

      {!stats.monthConfigured && stats.totalRooms > 0 && (
        <View style={[styles.alertBox, { backgroundColor: '#FFF3CD' }]}>
          <Text style={[styles.alertText, { color: '#856404' }]}>
            {t('monthConfigAlert')}
          </Text>
        </View>
      )}

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.roomsWithIndex}/{stats.totalRooms}</Text>
          <Text style={styles.cardLabel}>{t('roomsIndexed')}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.invoicesCalculated}</Text>
          <Text style={styles.cardLabel}>{t('invoicesCalculatedLabel')}</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.invoicesSent}</Text>
          <Text style={styles.cardLabel}>{t('invoicesSentLabel')}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.paymentsReceived}</Text>
          <Text style={styles.cardLabel}>{t('paymentsReceivedLabel')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('IndexEntry')}>
        <Text style={styles.primaryButtonText}>{t('enterIndexesBtn')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('InvoiceCalc')}>
        <Text style={styles.secondaryButtonText}>{t('calculateInvoicesBtn')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('WhatsAppSend')}>
        <Text style={styles.tertiaryButtonText}>{t('sendInvoicesWhatsappBtn')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.broadcastButton} onPress={() => navigation.navigate('WhatsAppBroadcast')}>
        <Text style={styles.broadcastButtonText}>{t('broadcastWhatsappBtn')}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: SIZES.padding,
    },
    monthBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: SIZES.radius,
      padding: SIZES.padding,
      marginTop: SIZES.margin,
    },
    monthText: { fontSize: SIZES.xl, fontWeight: 'bold', color: colors.white },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: SIZES.sm, fontWeight: 'bold', color: colors.white },
    alertBox: { backgroundColor: '#F8D7DA', borderRadius: SIZES.radius, padding: SIZES.padding, marginTop: SIZES.margin },
    alertText: { color: '#721C24', fontSize: SIZES.md },
    cardsRow: { flexDirection: 'row', marginTop: SIZES.margin, gap: SIZES.margin },
    card: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius,
      padding: SIZES.padding,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardNumber: { fontSize: SIZES.xxl, fontWeight: 'bold', color: colors.primary },
    cardLabel: { fontSize: SIZES.sm, color: colors.textLight, marginTop: 4, textAlign: 'center' },
    primaryButton: {
      height: SIZES.buttonHeight,
      backgroundColor: colors.primary,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SIZES.margin * 1.5,
    },
    primaryButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
    secondaryButton: {
      height: SIZES.buttonHeight,
      backgroundColor: colors.secondary,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SIZES.margin,
    },
    secondaryButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
    tertiaryButton: {
      height: SIZES.buttonHeight,
      backgroundColor: colors.inputBg,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SIZES.margin,
      borderWidth: 2,
      borderColor: colors.success,
    },
    tertiaryButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.success },
    broadcastButton: {
      height: SIZES.buttonHeight,
      backgroundColor: '#0F7A6B',
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SIZES.margin,
    },
    broadcastButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  });
}
