import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import {
  getMonthConfig,
  listIndexReadings,
  listInvoices,
  listResidents,
  updateInvoiceSendStatus,
} from '../services/BackendApi';
import { buildInvoiceMessage, sendWhatsAppMessage } from '../services/WhatsAppService';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

interface InvoiceWithRoom {
  id: number;
  roomId: number;
  mois: string;
  numero_chambre: string;
  nom_prenom: string;
  numero_whatsapp: string;
  an_eau: number;
  ni_eau: number;
  an_elec: number;
  ni_elec: number;
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
  total_facture: number;
  penalty_missing_index: number;
  dette: number;
  net_a_payer: number;
  delai_paiement: string;
  statut_envoi: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR';
}

interface SendReport {
  attempted: number;
  success: number;
  error: number;
  failedRooms: string[];
}

export default function WhatsAppSendScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);
  const [mois] = useState(getCurrentMonth());
  const [invoices, setInvoices] = useState<InvoiceWithRoom[]>([]);
  const [sending, setSending] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [report, setReport] = useState<SendReport | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      const [apiInvoices, residents, readings, config] = await Promise.all([
        listInvoices(mois),
        listResidents(),
        listIndexReadings(mois),
        getMonthConfig(mois),
      ]);

      if (!config) {
        setInvoices([]);
        return;
      }

      const mapped: InvoiceWithRoom[] = apiInvoices.map((inv) => {
        const resident = residents.find((r) => r.id === inv.residentId) ?? residents.find((r) => r.currentRoomId === inv.roomId);
        const reading = readings.find((r) => r.roomId === inv.roomId);
        return {
          id: inv.id,
          roomId: inv.roomId,
          mois: inv.mois,
          numero_chambre: inv.roomNumber,
          nom_prenom: resident ? `${resident.nom} ${resident.prenom}`.trim() : '-',
          numero_whatsapp: resident?.whatsapp ?? resident?.telephone ?? '',
          an_eau: reading?.anEau ?? 0,
          ni_eau: reading?.niEau ?? 0,
          an_elec: reading?.anElec ?? 0,
          ni_elec: reading?.niElec ?? 0,
          conso_eau: inv.water.conso,
          montant_ht_eau: inv.water.montantHt,
          tva_eau: inv.water.tva,
          lc_eau: inv.water.lc,
          surplus_eau: inv.water.surplus,
          amende_eau: inv.water.amende,
          montant_ttc_eau: inv.water.montantTtc,
          conso_elec: inv.electricity.conso,
          montant_ht_elec: inv.electricity.montantHt,
          tva_elec: inv.electricity.tva,
          lc_elec: inv.electricity.lc,
          surplus_elec: inv.electricity.surplus,
          montant_ttc_elec: inv.electricity.montantTtc,
          total_facture: inv.totalFacture,
          penalty_missing_index: inv.penaltyMissingIndex ?? 0,
          dette: inv.dette ?? 0,
          net_a_payer: inv.netAPayer,
          delai_paiement: inv.delaiPaiement ?? config.delaiPaiement,
          statut_envoi: inv.statutEnvoi,
        };
      });
      setInvoices(mapped);
    } catch (error) {
      console.error('Load invoices error:', error);
    }
  }, [mois]);

  useFocusEffect(useCallback(() => { loadInvoices(); }, [loadInvoices]));

  const checkPrerequisites = async (): Promise<boolean> => {
    const config = await getMonthConfig(mois);
    if (!config) {
      Alert.alert(t('error'), t('monthConfigMissing'));
      return false;
    }
    if (!config.delaiPaiement) {
      Alert.alert(t('error'), t('setDeadlineBeforeSend'));
      return false;
    }
    if (invoices.length === 0) {
      Alert.alert(t('error'), t('noInvoiceBeforeSend'));
      return false;
    }
    return true;
  };

  const handleSendIndividual = async (invoice: InvoiceWithRoom) => {
    const ok = await checkPrerequisites();
    if (!ok) return;

    const phone = invoice.numero_whatsapp.replace(/[^0-9]/g, '');
    if (phone.length < 9) {
      Alert.alert(t('error'), `${t('invalidWhatsapp')} (CH ${invoice.numero_chambre})`);
      return;
    }

    setSendingId(invoice.id);
    try {
      const message = buildInvoiceMessage({
        mois: invoice.mois,
        roomNumber: invoice.numero_chambre,
        residentName: invoice.nom_prenom,
        phone: invoice.numero_whatsapp,
        anEau: invoice.an_eau,
        niEau: invoice.ni_eau,
        anElec: invoice.an_elec,
        niElec: invoice.ni_elec,
        consoEau: invoice.conso_eau,
        montantHtEau: invoice.montant_ht_eau,
        tvaEau: invoice.tva_eau,
        lcEau: invoice.lc_eau,
        surplusEau: invoice.surplus_eau,
        amendeEau: invoice.amende_eau,
        montantTtcEau: invoice.montant_ttc_eau,
        consoElec: invoice.conso_elec,
        montantHtElec: invoice.montant_ht_elec,
        tvaElec: invoice.tva_elec,
        lcElec: invoice.lc_elec,
        surplusElec: invoice.surplus_elec,
        montantTtcElec: invoice.montant_ttc_elec,
        totalFacture: invoice.total_facture,
        penaltyMissingIndex: invoice.penalty_missing_index,
        dette: invoice.dette,
        netAPayer: invoice.net_a_payer,
        delaiPaiement: invoice.delai_paiement,
      });
      const success = await sendWhatsAppMessage(invoice.numero_whatsapp, message);
      if (success) {
        Alert.alert(
          t('sendConfirmTitle'),
          `CH ${invoice.numero_chambre}: ${t('sendOpenedBody')}`,
          [
            {
              text: 'Non (Erreur)',
              style: 'cancel',
              onPress: async () => {
                await updateInvoiceSendStatus(invoice.id, 'ERREUR');
                await loadInvoices();
              },
            },
            {
              text: t('send'),
              onPress: async () => {
                await updateInvoiceSendStatus(invoice.id, 'ENVOYE');
                await loadInvoices();
              },
            },
          ],
        );
      } else {
        Alert.alert(t('error'), t('cannotOpenWhatsapp'));
        await updateInvoiceSendStatus(invoice.id, 'ERREUR');
        await loadInvoices();
      }
    } catch (error) {
      Alert.alert(t('error'), t('sendProcessError'));
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    const ok = await checkPrerequisites();
    if (!ok) return;

    const unsent = invoices.filter(i => i.statut_envoi !== 'ENVOYE');
    if (unsent.length === 0) {
      Alert.alert(t('info'), t('allAlreadySent'));
      return;
    }

    Alert.alert(
      t('groupSendTitle'),
      `${unsent.length} facture(s). ${t('groupSendQuestion')}`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('send'),
          onPress: async () => {
            setSending(true);
            setProgress({ current: 0, total: unsent.length });
            setReport(null);
            let successCount = 0;
            let errorCount = 0;
            const failedRooms: string[] = [];

            for (let i = 0; i < unsent.length; i++) {
              const item = unsent[i];
              setProgress({ current: i + 1, total: unsent.length });
              setSendingId(item.id);

              try {
                const message = buildInvoiceMessage({
                  mois: item.mois,
                  roomNumber: item.numero_chambre,
                  residentName: item.nom_prenom,
                  phone: item.numero_whatsapp,
                  anEau: item.an_eau,
                  niEau: item.ni_eau,
                  anElec: item.an_elec,
                  niElec: item.ni_elec,
                  consoEau: item.conso_eau,
                  montantHtEau: item.montant_ht_eau,
                  tvaEau: item.tva_eau,
                  lcEau: item.lc_eau,
                  surplusEau: item.surplus_eau,
                  amendeEau: item.amende_eau,
                  montantTtcEau: item.montant_ttc_eau,
                  consoElec: item.conso_elec,
                  montantHtElec: item.montant_ht_elec,
                  tvaElec: item.tva_elec,
                  lcElec: item.lc_elec,
                  surplusElec: item.surplus_elec,
                  montantTtcElec: item.montant_ttc_elec,
                  totalFacture: item.total_facture,
                  penaltyMissingIndex: item.penalty_missing_index,
                  dette: item.dette,
                  netAPayer: item.net_a_payer,
                  delaiPaiement: item.delai_paiement,
                });
                const success = await sendWhatsAppMessage(item.numero_whatsapp, message);
                await updateInvoiceSendStatus(item.id, success ? 'ENVOYE' : 'ERREUR');
                if (success) {
                  successCount += 1;
                } else {
                  errorCount += 1;
                  failedRooms.push(item.numero_chambre);
                }
              } catch (error) {
                await updateInvoiceSendStatus(item.id, 'ERREUR');
                errorCount += 1;
                failedRooms.push(item.numero_chambre);
              }

              if (i < unsent.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
            }

            setSending(false);
            setSendingId(null);
            setReport({
              attempted: unsent.length,
              success: successCount,
              error: errorCount,
              failedRooms,
            });
            await loadInvoices();
            Alert.alert(t('finished'), t('groupSendDone'));
          },
        },
      ],
    );
  };

  const sentCount = invoices.filter(i => i.statut_envoi === 'ENVOYE').length;
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENVOYE': return { icon: 'OK', color: colors.success };
      case 'ERREUR': return { icon: 'X', color: colors.error };
      default: return { icon: '...', color: colors.warning };
    }
  };

  const renderInvoice = ({ item }: { item: InvoiceWithRoom }) => {
    const status = getStatusIcon(item.statut_envoi);
    const isSending = sendingId === item.id;

    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceHeader}>
            <Text style={styles.roomNumber}>CH {item.numero_chambre}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>
                {isSending ? '...' : status.icon}
              </Text>
            </View>
          </View>
          <Text style={styles.roomName}>{item.nom_prenom}</Text>
          <Text style={styles.amount}>{Math.round(item.net_a_payer).toLocaleString('fr-FR')} FCFA</Text>
          {item.penalty_missing_index > 0 ? (
            <Text style={styles.penaltyText}>Penalite retard: {Math.round(item.penalty_missing_index).toLocaleString('fr-FR')} FCFA</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.sendButton, item.statut_envoi === 'ENVOYE' && styles.resendButton]}
          onPress={() => handleSendIndividual(item)}
          disabled={sending}
        >
          <Text style={styles.sendButtonText}>
            {item.statut_envoi === 'ENVOYE' ? t('whatsappResend') : t('whatsappSendOne')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Envoi WhatsApp - {mois}</Text>
        <Text style={styles.headerSubtitle}>{sentCount}/{invoices.length} envoyees</Text>
      </View>

      {sending && (
        <View style={styles.progressBanner}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.progressText}>
            Envoi en cours... {progress.current}/{progress.total}
          </Text>
        </View>
      )}

      {report ? (
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Rapport d'envoi</Text>
          <Text style={styles.reportText}>Tentatives: {report.attempted} | Succes: {report.success} | Erreurs: {report.error}</Text>
          {report.failedRooms.length > 0 ? (
            <Text style={styles.reportText}>Chambres en erreur: {report.failedRooms.join(', ')}</Text>
          ) : (
            <Text style={styles.reportText}>Aucune erreur sur le dernier envoi groupe.</Text>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.sendAllButton, sending && styles.sendAllButtonDisabled]}
        onPress={handleSendAll}
        disabled={sending}
      >
        <Text style={styles.sendAllButtonText}>{t('whatsappSendAll')}</Text>
      </TouchableOpacity>

      <FlatList
        data={invoices}
        keyExtractor={item => item.id.toString()}
        renderItem={renderInvoice}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('whatsappNone')}</Text>
        }
      />

      {invoices.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {sentCount}/{invoices.length} factures envoyees avec succes
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: SIZES.padding, backgroundColor: colors.success,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  headerSubtitle: { fontSize: SIZES.md, color: colors.white },
  progressBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, padding: SIZES.padding, marginHorizontal: SIZES.margin,
    borderRadius: SIZES.radius, marginTop: SIZES.margin,
  },
  progressText: { fontSize: SIZES.md, color: colors.white },
  sendAllButton: {
    height: SIZES.buttonHeight, backgroundColor: colors.success, borderRadius: SIZES.radius,
    justifyContent: 'center', alignItems: 'center', margin: SIZES.margin,
  },
  sendAllButtonDisabled: { opacity: 0.5 },
  sendAllButtonText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  list: { paddingHorizontal: SIZES.padding, paddingBottom: 80 },
  invoiceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderRadius: SIZES.radius, padding: SIZES.padding,
    marginBottom: SIZES.margin / 2, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  invoiceInfo: { flex: 1 },
  invoiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomNumber: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
  statusBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statusText: { fontSize: SIZES.sm, color: colors.white, fontWeight: 'bold' },
  roomName: { fontSize: SIZES.md, color: colors.text, marginTop: 2 },
  amount: { fontSize: SIZES.sm, color: colors.textLight, marginTop: 2 },
  penaltyText: { fontSize: SIZES.sm, color: colors.error, marginTop: 4, fontWeight: '700' },
  sendButton: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radius, backgroundColor: colors.success,
  },
  resendButton: { backgroundColor: colors.secondary },
  sendButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 40, fontSize: SIZES.md },
  summary: {
    padding: SIZES.padding, backgroundColor: colors.cardBg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  summaryText: { fontSize: SIZES.md, textAlign: 'center', color: colors.text },
  reportCard: {
    marginHorizontal: SIZES.margin,
    marginTop: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: colors.cardBg,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportTitle: { fontSize: SIZES.md, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
  reportText: { fontSize: SIZES.sm, color: colors.text, lineHeight: 20 },
});
}
