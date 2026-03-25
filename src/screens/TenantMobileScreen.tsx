import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { useAuth } from '../database/AuthContext';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { useMyHouseConsoleData } from '../hooks/useMyHouseConsoleData';
import {
  exportPaymentReceiptPdf,
  getMe,
  listContracts,
  listPaymentsByInvoice,
  upsertIndexReading,
  type ApiContract,
  type ApiPayment,
} from '../services/BackendApi';

type TenantMobileSection = 'overview' | 'billing' | 'payments';

type TenantMobileScreenProps = {
  initialSection?: TenantMobileSection;
};

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

function parseAmount(value: string): number {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function TenantMobileScreen({
  initialSection = 'overview',
}: TenantMobileScreenProps) {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const { currentUsername } = useAuth();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { metrics, reload } = useMyHouseConsoleData();

  const [residentIdFromSession, setResidentIdFromSession] = React.useState<number | null>(null);
  const [payments, setPayments] = React.useState<ApiPayment[]>([]);
  const [contracts, setContracts] = React.useState<ApiContract[]>([]);
  const [form, setForm] = React.useState({
    anEau: '',
    niEau: '',
    anElec: '',
    niElec: '',
    presence: true,
    amende: false,
  });

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      void (async () => {
        try {
          const me = await getMe();
          if (alive) {
            setResidentIdFromSession(me.residentId ?? null);
          }
        } catch {
          if (alive) {
            setResidentIdFromSession(null);
          }
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const resident = React.useMemo(() => {
    if (residentIdFromSession != null) {
      return metrics.residents.find((entry) => entry.id === residentIdFromSession) ?? null;
    }
    const normalizedUser = currentUsername.trim().toLowerCase();
    const matchedByName = metrics.residents.find((entry) => (
      `${entry.nom}.${entry.prenom}`.replace(/\s+/g, '').toLowerCase() === normalizedUser
      || `${entry.nom}${entry.prenom}`.replace(/\s+/g, '').toLowerCase() === normalizedUser
    ));
    return matchedByName ?? metrics.residents.find((entry) => entry.statut !== 'INACTIF') ?? null;
  }, [currentUsername, metrics.residents, residentIdFromSession]);

  const room = React.useMemo(() => (
    resident?.currentRoomId != null
      ? metrics.rooms.find((entry) => entry.id === resident.currentRoomId) ?? null
      : null
  ), [metrics.rooms, resident?.currentRoomId]);

  const invoice = React.useMemo(() => (
    room ? metrics.invoices.find((entry) => entry.roomId === room.id) ?? null : null
  ), [metrics.invoices, room]);

  const reading = React.useMemo(() => (
    room ? metrics.readings.find((entry) => entry.roomId === room.id) ?? null : null
  ), [metrics.readings, room]);

  React.useEffect(() => {
    setForm({
      anEau: reading ? String(reading.anEau) : '0',
      niEau: reading ? String(reading.niEau) : '',
      anElec: reading ? String(reading.anElec) : '0',
      niElec: reading ? String(reading.niElec) : '',
      presence: reading ? reading.statutPresence === 'PRESENT' : true,
      amende: reading ? reading.amendeEau : false,
    });
  }, [reading]);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      if (!invoice) {
        setPayments([]);
        return () => {
          alive = false;
        };
      }
      void (async () => {
        try {
          const rows = await listPaymentsByInvoice(invoice.id);
          if (alive) {
            setPayments(rows);
          }
        } catch {
          if (alive) {
            setPayments([]);
          }
        }
      })();
      return () => {
        alive = false;
      };
    }, [invoice]),
  );

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      void (async () => {
        try {
          const rows = await listContracts();
          if (alive) {
            setContracts(rows);
          }
        } catch {
          if (alive) {
            setContracts([]);
          }
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const currentContract = React.useMemo(() => {
    if (resident?.id != null) {
      return contracts.find((entry) => entry.residentId === resident.id) ?? null;
    }
    if (room) {
      return contracts.find((entry) => entry.roomNumero === room.numeroChambre) ?? null;
    }
    return null;
  }, [contracts, resident?.id, room]);

  const today = new Date();
  const currentDay = today.getDate();
  const windowStart = metrics.monthConfig?.indexWindowStartDay ?? 25;
  const windowEnd = metrics.monthConfig?.indexWindowEndDay ?? 30;
  const meterWindowOpen = currentDay >= windowStart && currentDay <= windowEnd;
  const waterPreview = parseAmount(form.niEau) - parseAmount(form.anEau);
  const elecPreview = parseAmount(form.niElec) - parseAmount(form.anElec);
  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = invoice ? Math.max(0, invoice.netAPayer - paidAmount) : 0;

  const submitReading = async () => {
    if (!room) {
      Alert.alert(t('error'), 'Aucune chambre active rattachee a ce compte resident.');
      return;
    }
    if (!metrics.monthConfig) {
      Alert.alert(t('error'), t('monthConfigAlert'));
      return;
    }
    if (!meterWindowOpen) {
      Alert.alert(t('error'), `La saisie est fermee. Fenetre active du ${windowStart} au ${windowEnd}.`);
      return;
    }
    const anEau = parseAmount(form.anEau);
    const niEau = parseAmount(form.niEau);
    const anElec = parseAmount(form.anElec);
    const niElec = parseAmount(form.niElec);
    if (niEau < anEau || niElec < anElec) {
      Alert.alert(t('error'), 'Les nouveaux index doivent etre superieurs ou egaux aux anciens.');
      return;
    }
    try {
      await upsertIndexReading({
        roomId: room.id,
        mois: metrics.month,
        anEau,
        niEau,
        anElec,
        niElec,
        statutPresence: form.presence ? 'PRESENT' : 'ABSENT',
        amendeEau: form.amende,
        saisiPar: currentUsername || 'resident',
      });
      await reload();
      Alert.alert(t('success'), 'Index resident enregistres avec succes.');
    } catch (error) {
      Alert.alert(t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const downloadReceipt = async (paymentId: number) => {
    try {
      const blob = await exportPaymentReceiptPdf(paymentId);
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = `payment-${paymentId}-receipt.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      }
      Alert.alert(t('success'), 'Quittance telechargee.');
    } catch {
      Alert.alert(t('error'), t('exportError'));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MyHouse resident</Text>
        <Text style={styles.title}>{resident ? `${resident.nom} ${resident.prenom}`.trim() : t('tenantRole')}</Text>
        <Text style={styles.subtitle}>
          {room ? `Chambre ${room.numeroChambre} | ${metrics.month}` : 'Affectation resident en attente.'}
        </Text>
      </View>

      <View style={styles.kpiGrid}>
        <MetricCard styles={styles} title="Fenetre" value={`${windowStart}-${windowEnd}`} hint={meterWindowOpen ? 'Saisie ouverte' : 'Saisie fermee'} />
        <MetricCard styles={styles} title="Facture" value={invoice ? formatMoney(invoice.netAPayer) : '0 FCFA'} hint={invoice?.delaiPaiement ?? '-'} />
        <MetricCard styles={styles} title="Paiements" value={formatMoney(paidAmount)} hint={`${payments.length} recu(s)`} />
        <MetricCard styles={styles} title="Reste" value={formatMoney(remainingAmount)} hint={remainingAmount > 0 ? 'A regler' : 'Solde'} />
      </View>

      {(initialSection === 'overview' || initialSection === 'billing') && (
        <Section styles={styles} title="Index MeterTrack">
          <Text style={styles.sectionLead}>
            La saisie est autorisee uniquement entre le {windowStart} et le {windowEnd}, selon la periode definie par le concierge.
          </Text>
          <View style={styles.fieldGrid}>
            <Field styles={styles} label="AN Eau" value={form.anEau} onChange={(value) => setForm((current) => ({ ...current, anEau: value }))} />
            <Field styles={styles} label="NI Eau" value={form.niEau} onChange={(value) => setForm((current) => ({ ...current, niEau: value }))} />
            <Field styles={styles} label="AN Elec" value={form.anElec} onChange={(value) => setForm((current) => ({ ...current, anElec: value }))} />
            <Field styles={styles} label="NI Elec" value={form.niElec} onChange={(value) => setForm((current) => ({ ...current, niElec: value }))} />
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewText}>Preview eau: {Number.isFinite(waterPreview) ? waterPreview.toFixed(1) : '-'}</Text>
            <Text style={styles.previewText}>Preview elec: {Number.isFinite(elecPreview) ? elecPreview.toFixed(1) : '-'}</Text>
          </View>
          {!meterWindowOpen ? (
            <Text style={styles.warningText}>
              Saisie bloquee hors periode. Une penalite peut etre appliquee si le retard n&apos;est pas annule par le concierge.
            </Text>
          ) : null}
          <TouchableOpacity style={[styles.primaryButton, !meterWindowOpen && styles.disabledButton]} onPress={submitReading} disabled={!meterWindowOpen}>
            <Text style={styles.primaryButtonText}>{reading ? t('save') : t('validate')}</Text>
          </TouchableOpacity>
        </Section>
      )}

      <Section styles={styles} title={initialSection === 'payments' ? 'Mes paiements' : 'Facture active'}>
        {invoice ? (
          <>
            <InfoRow styles={styles} label="Chambre" value={invoice.roomNumber} />
            <InfoRow styles={styles} label={t('stateLabel')} value={invoice.statutEnvoi} />
            <InfoRow styles={styles} label={t('paymentDelayLabel')} value={invoice.delaiPaiement ?? '-'} />
            {(invoice.penaltyMissingIndex ?? 0) > 0 ? (
              <Text style={styles.warningText}>
                Penalite retard / index manquant: {formatMoney(invoice.penaltyMissingIndex ?? 0)}
              </Text>
            ) : null}
            {(invoice.internetFee ?? 0) > 0 ? <InfoRow styles={styles} label="Internet" value={formatMoney(invoice.internetFee ?? 0)} /> : null}
            {(invoice.commonCharges ?? 0) > 0 ? <InfoRow styles={styles} label="Charges communes" value={formatMoney(invoice.commonCharges ?? 0)} /> : null}
            {(invoice.loyer ?? 0) > 0 ? <InfoRow styles={styles} label="Loyer" value={formatMoney(invoice.loyer ?? 0)} /> : null}
            <InfoRow styles={styles} label={t('netToPayLabel')} value={formatMoney(invoice.netAPayer)} />
            <InfoRow styles={styles} label="Paye" value={formatMoney(paidAmount)} />
            <InfoRow styles={styles} label="Reste" value={formatMoney(remainingAmount)} />
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>Aucun paiement enregistre pour cette facture.</Text>
            ) : (
              payments.map((payment) => (
                <View key={payment.id} style={styles.paymentCard}>
                  <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
                  <Text style={styles.paymentMeta}>
                    {payment.paidAt.slice(0, 10)} | {payment.method ?? 'MANUAL'} | {payment.status ?? 'COMPLETED'}
                  </Text>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => downloadReceipt(payment.id)}>
                    <Text style={styles.secondaryButtonText}>Quittance PDF</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>Aucune facture disponible pour ce resident.</Text>
        )}
      </Section>

      {(initialSection === 'overview' || initialSection === 'billing') && (
        <Section styles={styles} title="Mon contrat">
          {currentContract ? (
            <>
              <InfoRow styles={styles} label={t('stateLabel')} value={currentContract.status} />
              <InfoRow styles={styles} label="Signature" value={currentContract.signingMode} />
              <InfoRow styles={styles} label="Periode" value={`${currentContract.startDate ?? '-'} -> ${currentContract.endDate ?? '-'}`} />
              <InfoRow styles={styles} label="Loyer" value={formatMoney(currentContract.monthlyRent)} />
              <InfoRow styles={styles} label="Caution" value={formatMoney(currentContract.deposit)} />
            </>
          ) : (
            <Text style={styles.emptyText}>Aucun contrat actif trouve pour ce resident.</Text>
          )}
        </Section>
      )}
    </ScrollView>
  );
}

function MetricCard({
  styles,
  title,
  value,
  hint,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function Section({
  styles,
  title,
  children,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Field({
  styles,
  label,
  value,
  onChange,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: SIZES.padding,
      gap: 16,
      paddingBottom: 32,
    },
    hero: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 2,
      padding: SIZES.padding * 1.25,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    eyebrow: {
      color: colors.secondary,
      fontSize: SIZES.sm,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textLight,
      fontSize: SIZES.md,
      lineHeight: 20,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCard: {
      flexGrow: 1,
      minWidth: 145,
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 1.5,
      padding: SIZES.padding,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    metricTitle: {
      color: colors.textLight,
      fontSize: SIZES.xs,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: {
      color: colors.text,
      fontSize: SIZES.lg,
      fontWeight: '800',
    },
    metricHint: {
      color: colors.textLight,
      fontSize: SIZES.sm,
    },
    section: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 1.75,
      padding: SIZES.padding,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: SIZES.lg,
      fontWeight: '800',
    },
    sectionLead: {
      color: colors.textLight,
      fontSize: SIZES.sm,
      lineHeight: 20,
    },
    fieldGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    field: {
      minWidth: 135,
      flexGrow: 1,
      gap: 6,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: SIZES.sm,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SIZES.radius,
      backgroundColor: colors.inputBg,
      color: colors.text,
      paddingHorizontal: SIZES.padding,
      paddingVertical: 11,
      fontSize: SIZES.md,
    },
    previewRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    previewText: {
      color: colors.text,
      fontSize: SIZES.sm,
      fontWeight: '700',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: SIZES.radius,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
      paddingHorizontal: 16,
    },
    disabledButton: {
      opacity: 0.55,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: SIZES.md,
      fontWeight: '800',
    },
    secondaryButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.inputBg,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: SIZES.sm,
      fontWeight: '800',
    },
    warningText: {
      color: colors.error,
      fontSize: SIZES.sm,
      lineHeight: 20,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      color: colors.textLight,
      fontSize: SIZES.sm,
      flex: 1,
    },
    infoValue: {
      color: colors.text,
      fontSize: SIZES.sm,
      fontWeight: '700',
      flex: 1,
      textAlign: 'right',
    },
    paymentCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: SIZES.radius * 1.25,
      padding: SIZES.padding,
      gap: 8,
    },
    paymentAmount: {
      color: colors.text,
      fontSize: SIZES.lg,
      fontWeight: '800',
    },
    paymentMeta: {
      color: colors.textLight,
      fontSize: SIZES.sm,
      lineHeight: 18,
    },
    emptyText: {
      color: colors.textLight,
      fontSize: SIZES.sm,
      lineHeight: 20,
    },
  });
}
