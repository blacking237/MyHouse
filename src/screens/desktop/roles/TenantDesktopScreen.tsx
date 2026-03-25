import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../database/AuthContext';
import { usePreferences, useThemeColors } from '../../../database/PreferencesContext';
import {
  exportPaymentReceiptPdf,
  getMe,
  listContracts,
  listPaymentsByInvoice,
  upsertIndexReading,
  type ApiContract,
  type ApiPayment,
} from '../../../services/BackendApi';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

function parseAmount(value: string): number {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function TenantDesktopScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const { currentUsername } = useAuth();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { metrics, reload } = useMyHouseConsoleData();

  const [residentIdFromSession, setResidentIdFromSession] = React.useState<number | null>(null);
  const [payments, setPayments] = React.useState<ApiPayment[]>([]);
  const [contracts, setContracts] = React.useState<ApiContract[]>([]);
  const [notice, setNotice] = React.useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [form, setForm] = React.useState({
    anEau: '',
    niEau: '',
    anElec: '',
    niElec: '',
    presence: true,
    amende: false,
  });

  React.useEffect(() => {
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
  }, []);

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

  React.useEffect(() => {
    let alive = true;
    if (!invoice) {
      setPayments([]);
      return undefined;
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
  }, [invoice]);

  React.useEffect(() => {
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
  }, []);

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

  const setBanner = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message });
  };

  const submitReading = async () => {
    if (!room) {
      setBanner('error', 'Aucune chambre active rattachee a ce compte resident.');
      return;
    }
    if (!metrics.monthConfig) {
      setBanner('error', t('monthConfigAlert'));
      return;
    }
    if (!meterWindowOpen) {
      setBanner('error', `La saisie est fermee. Fenetre active du ${windowStart} au ${windowEnd}.`);
      return;
    }
    const anEau = parseAmount(form.anEau);
    const niEau = parseAmount(form.niEau);
    const anElec = parseAmount(form.anElec);
    const niElec = parseAmount(form.niElec);
    if (niEau < anEau || niElec < anElec) {
      setBanner('error', 'Les nouveaux index doivent etre superieurs ou egaux aux anciens.');
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
      reload();
      setBanner('success', 'Index resident enregistres avec succes.');
    } catch (error) {
      setBanner('error', error instanceof Error ? error.message : t('cannotSaveData'));
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
      setBanner('success', 'Quittance telechargee.');
    } catch {
      setBanner('error', t('exportError'));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{t('tenantRole')}</Text>
        <Text style={styles.title}>{resident ? `${resident.nom} ${resident.prenom}`.trim() : t('tenantRole')}</Text>
        <Text style={styles.subtitle}>
          {room ? `Chambre ${room.numeroChambre} | ${metrics.month}` : 'Affectation resident en attente.'}
        </Text>
      </View>

      {notice ? (
        <View style={[
          styles.notice,
          notice.type === 'success' ? styles.noticeSuccess : notice.type === 'error' ? styles.noticeError : styles.noticeInfo,
        ]}>
          <Text style={styles.noticeText}>{notice.message}</Text>
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        <Card styles={styles} title="Fenetre MeterTrack" value={`${windowStart} -> ${windowEnd}`} hint={meterWindowOpen ? 'Ouverte' : 'Fermee'} />
        <Card styles={styles} title={t('netToPayLabel')} value={invoice ? formatMoney(invoice.netAPayer) : '0 FCFA'} hint={invoice?.delaiPaiement ?? '-'} />
        <Card styles={styles} title={t('payments')} value={formatMoney(paidAmount)} hint={`${payments.length} enregistrement(s)`} />
        <Card styles={styles} title="Reste" value={formatMoney(remainingAmount)} hint={remainingAmount > 0 ? 'Paiement attendu' : 'Solde regle'} />
      </View>

      <Section title={styles} label={t('indexEntry')}>
        <Text style={styles.sectionLead}>
          La periode est definie par le concierge. La saisie resident est autorisee uniquement entre le {windowStart} et le {windowEnd}.
        </Text>
        <View style={styles.formGrid}>
          <Field styles={styles} label="AN Eau" value={form.anEau} onChange={(value) => setForm((current) => ({ ...current, anEau: value }))} />
          <Field styles={styles} label="NI Eau" value={form.niEau} onChange={(value) => setForm((current) => ({ ...current, niEau: value }))} />
          <Field styles={styles} label="AN Elec" value={form.anElec} onChange={(value) => setForm((current) => ({ ...current, anElec: value }))} />
          <Field styles={styles} label="NI Elec" value={form.niElec} onChange={(value) => setForm((current) => ({ ...current, niElec: value }))} />
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewText}>Preview eau: {Number.isFinite(waterPreview) ? waterPreview.toFixed(1) : '-'}</Text>
          <Text style={styles.previewText}>Preview elec: {Number.isFinite(elecPreview) ? elecPreview.toFixed(1) : '-'}</Text>
        </View>
        <TouchableOpacity style={[styles.primaryButton, !meterWindowOpen && styles.buttonDisabled]} onPress={submitReading} disabled={!meterWindowOpen}>
          <Text style={styles.primaryButtonText}>{reading ? t('save') : t('validate')}</Text>
        </TouchableOpacity>
        {!meterWindowOpen ? (
          <Text style={styles.warningText}>
            Saisie bloquee hors periode. Une penalite peut etre appliquee selon le parametrage concierge.
          </Text>
        ) : null}
      </Section>

      <Section title={styles} label={t('payments')}>
        {invoice ? (
          <>
            <Row styles={styles} label="Facture" value={invoice.roomNumber} />
            <Row styles={styles} label={t('stateLabel')} value={invoice.statutEnvoi} />
            <Row styles={styles} label={t('paymentDelayLabel')} value={invoice.delaiPaiement ?? '-'} />
            {(invoice.penaltyMissingIndex ?? 0) > 0 ? (
              <Text style={styles.warningText}>
                Penalite retard / index manquant appliquee: {formatMoney(invoice.penaltyMissingIndex ?? 0)}
              </Text>
            ) : null}
            {(invoice.internetFee ?? 0) > 0 ? <Row styles={styles} label="Internet" value={formatMoney(invoice.internetFee ?? 0)} /> : null}
            {(invoice.commonCharges ?? 0) > 0 ? <Row styles={styles} label="Charges communes" value={formatMoney(invoice.commonCharges ?? 0)} /> : null}
            {(invoice.loyer ?? 0) > 0 ? <Row styles={styles} label="Loyer" value={formatMoney(invoice.loyer ?? 0)} /> : null}
            <Row styles={styles} label={t('netToPayLabel')} value={formatMoney(invoice.netAPayer)} />
            <Row styles={styles} label="Paye" value={formatMoney(paidAmount)} />
            <Row styles={styles} label="Reste" value={formatMoney(remainingAmount)} />
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>Aucun paiement enregistre pour cette facture.</Text>
            ) : (
              payments.map((payment) => (
                <View key={payment.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{formatMoney(payment.amount)}</Text>
                    <Text style={styles.listMeta}>
                      {payment.paidAt.slice(0, 10)} | {payment.method} | {payment.status}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => downloadReceipt(payment.id)}>
                    <Text style={styles.secondaryButtonText}>Quittance</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>Aucune facture disponible pour ce resident.</Text>
        )}
      </Section>

      <Section title={styles} label={t('contracts')}>
        {currentContract ? (
          <>
            <Row styles={styles} label={t('stateLabel')} value={currentContract.status} />
            <Row styles={styles} label="Signature" value={currentContract.signingMode} />
            <Row styles={styles} label="Periode" value={`${currentContract.startDate ?? '-'} -> ${currentContract.endDate ?? '-'}`} />
            <Row styles={styles} label="Loyer" value={formatMoney(currentContract.monthlyRent)} />
            <Row styles={styles} label="Caution" value={formatMoney(currentContract.deposit)} />
            <Row styles={styles} label="Renouvellement" value={currentContract.autoRenewal ? 'Auto' : 'Manuel'} />
          </>
        ) : (
          <Text style={styles.emptyText}>Aucun contrat actif trouve pour ce resident.</Text>
        )}
      </Section>
    </ScrollView>
  );
}

function Card({
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
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiHint}>{hint}</Text>
    </View>
  );
}

function Section({
  title,
  label,
  children,
}: {
  title: ReturnType<typeof createStyles>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={title.section}>
      <Text style={title.sectionTitle}>{label}</Text>
      {children}
    </View>
  );
}

function Row({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
      padding: 24,
      gap: 18,
    },
    hero: {
      backgroundColor: colors.cardBg,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    eyebrow: {
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textLight,
      fontSize: 15,
      lineHeight: 22,
    },
    notice: {
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    noticeSuccess: {
      backgroundColor: colors.success,
    },
    noticeError: {
      backgroundColor: colors.error,
    },
    noticeInfo: {
      backgroundColor: colors.primary,
    },
    noticeText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    kpiCard: {
      minWidth: 180,
      flexGrow: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
    },
    kpiLabel: {
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    kpiValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    kpiHint: {
      color: colors.textLight,
      fontSize: 13,
    },
    section: {
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    sectionLead: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 22,
    },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    field: {
      minWidth: 180,
      flexGrow: 1,
      gap: 6,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 14,
    },
    previewRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    previewText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '800',
    },
    secondaryButton: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    warningText: {
      color: colors.error,
      fontSize: 13,
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      color: colors.textLight,
      fontSize: 14,
    },
    rowValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'right',
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.inputBg,
      padding: 12,
    },
    listTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    listMeta: {
      color: colors.textLight,
      fontSize: 13,
      marginTop: 4,
    },
    emptyText: {
      color: colors.textLight,
      fontSize: 14,
    },
  });
}
