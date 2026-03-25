import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import {
  createPayment,
  exportPaymentReceiptPdf,
  listInvoices,
  listPaymentsByInvoice,
  listResidents,
  recordPayment,
} from '../services/BackendApi';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

interface InvoiceWithRoom {
  id: number;
  numero_chambre: string;
  nom_prenom: string;
  net_a_payer: number;
}

interface PaymentWithRoom {
  id: number;
  facture_id: number;
  montant_paye: number;
  date_paiement: string;
  observation: string | null;
  method: string | null;
  status: string | null;
}

export default function PaymentsScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);
  const [mois] = useState(getCurrentMonth());
  const [invoices, setInvoices] = useState<InvoiceWithRoom[]>([]);
  const [payments, setPayments] = useState<PaymentWithRoom[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRoom | null>(null);
  const [payForm, setPayForm] = useState({ montant: '', observation: '', method: 'MOBILE_MONEY' });

  const loadData = useCallback(async () => {
    try {
      const [invoiceRows, residents] = await Promise.all([
        listInvoices(mois),
        listResidents(),
      ]);
      const invs = invoiceRows.map((invoice) => {
        const resident = residents.find((entry) => entry.id === invoice.residentId)
          ?? residents.find((entry) => entry.currentRoomId === invoice.roomId);
        return {
          id: invoice.id,
          numero_chambre: invoice.roomNumber,
          nom_prenom: resident ? `${resident.nom} ${resident.prenom}`.trim() : '-',
          net_a_payer: invoice.netAPayer,
        };
      });
      setInvoices(invs);

      const paymentLists = await Promise.all(invoiceRows.map((invoice) => listPaymentsByInvoice(invoice.id).catch(() => [])));
      const pays = paymentLists.flatMap((entries) => entries.map((payment) => ({
        id: payment.id,
        facture_id: payment.invoiceId,
        montant_paye: payment.amount,
        date_paiement: payment.paidAt,
        observation: payment.observation,
        method: payment.method,
        status: payment.status,
      })));
      setPayments(pays);
    } catch (error) {
      console.error('Load payments error:', error);
    }
  }, [mois]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openPaymentModal = (invoice: InvoiceWithRoom) => {
    setSelectedInvoice(invoice);
    setPayForm({ montant: '', observation: '', method: 'MOBILE_MONEY' });
    setModalVisible(true);
  };

  const savePayment = async () => {
    if (!selectedInvoice) return;
    const montant = parseFloat(payForm.montant);
    if (isNaN(montant) || montant <= 0) {
      Alert.alert(t('error'), t('invalidAmount'));
      return;
    }

    try {
      try {
        await createPayment({
          invoiceId: selectedInvoice.id,
          amount: montant,
          method: payForm.method,
          observation: payForm.observation || null,
        });
      } catch {
        await recordPayment(selectedInvoice.id, montant, `${payForm.method}${payForm.observation ? ` | ${payForm.observation}` : ''}`);
      }
      setModalVisible(false);
      await loadData();
      Alert.alert(t('success'), t('paymentRecorded'));
    } catch (error) {
      Alert.alert(t('error'), t('cannotSaveData'));
    }
  };

  const getTotalPaid = (invoiceId: number): number => {
    return payments
      .filter(p => p.facture_id === invoiceId)
      .reduce((sum, p) => sum + p.montant_paye, 0);
  };

  const getPaymentStatus = (invoice: InvoiceWithRoom): { label: string; color: string } => {
    const paid = getTotalPaid(invoice.id);
    if (paid >= invoice.net_a_payer) return { label: 'Solde', color: colors.success };
    if (paid > 0) return { label: 'Partiel', color: colors.warning };
    return { label: 'Impaye', color: colors.error };
  };

  const formatNum = (n: number) => Math.round(n).toLocaleString('fr-FR');

  const renderInvoice = ({ item }: { item: InvoiceWithRoom }) => {
    const status = getPaymentStatus(item);
    const totalPaid = getTotalPaid(item.id);
    const remaining = item.net_a_payer - totalPaid;

    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.roomNumber}>CH {item.numero_chambre}</Text>
            <Text style={styles.roomName}>{item.nom_prenom}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>NAP: {formatNum(item.net_a_payer)} FCFA</Text>
          <Text style={styles.amountLabel}>Paye: {formatNum(totalPaid)} FCFA</Text>
        </View>
        {remaining > 0 && (
          <Text style={styles.remainingText}>Reste: {formatNum(remaining)} FCFA</Text>
        )}
        {payments.filter((payment) => payment.facture_id === item.id).slice(0, 2).map((payment) => (
          <View key={payment.id} style={styles.historyRow}>
            <Text style={styles.historyText}>
              {payment.date_paiement.slice(0, 10)} | {payment.method ?? 'MANUAL'} | {payment.status ?? 'COMPLETED'} | {formatNum(payment.montant_paye)} FCFA
            </Text>
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={async () => {
                try {
                  const blob = await exportPaymentReceiptPdf(payment.id);
                  if (typeof window !== 'undefined') {
                    const url = window.URL.createObjectURL(blob);
                    const anchor = window.document.createElement('a');
                    anchor.href = url;
                    anchor.download = `payment-${payment.id}-receipt.pdf`;
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                  }
                } catch {
                  Alert.alert(t('error'), t('exportError'));
                }
              }}
            >
              <Text style={styles.receiptButtonText}>Quittance</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => openPaymentModal(item)}
        >
          <Text style={styles.payButtonText}>{t('registerPayment')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('paymentTitle')} - {mois}</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={item => item.id.toString()}
        renderItem={renderInvoice}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('noInvoicesFirst')}</Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Paiement - CH {selectedInvoice?.numero_chambre}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedInvoice?.nom_prenom} - NAP: {selectedInvoice ? formatNum(selectedInvoice.net_a_payer) : '0'} FCFA
            </Text>

              <Text style={styles.label}>{t('paidAmount')}</Text>
            <TextInput
              style={styles.input}
              value={payForm.montant}
              onChangeText={v => setPayForm(prev => ({ ...prev, montant: v }))}
              keyboardType="decimal-pad"
              placeholder="Ex: 15000"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.label}>Mode de paiement</Text>
            <View style={styles.methodRow}>
              {['MOBILE_MONEY', 'VISA', 'WIRE_TRANSFER'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodChip, payForm.method === method && styles.methodChipActive]}
                  onPress={() => setPayForm(prev => ({ ...prev, method }))}
                >
                  <Text style={[styles.methodChipText, payForm.method === method && styles.methodChipTextActive]}>
                    {method === 'MOBILE_MONEY' ? 'Mobile Money' : method === 'VISA' ? 'Visa' : 'Virement'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

              <Text style={styles.label}>{t('noteOptional')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={payForm.observation}
              onChangeText={v => setPayForm(prev => ({ ...prev, observation: v }))}
              placeholder="Note..."
              placeholderTextColor={colors.disabled}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
                  <Text style={styles.saveButtonText}>{t('save')}</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: SIZES.padding, backgroundColor: colors.primary,
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
  list: { padding: SIZES.padding, paddingBottom: 20 },
  invoiceCard: {
    backgroundColor: colors.cardBg, borderRadius: SIZES.radius, padding: SIZES.padding,
    marginBottom: SIZES.margin / 2, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  invoiceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  invoiceInfo: { flex: 1 },
  roomNumber: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
  roomName: { fontSize: SIZES.md, color: colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: SIZES.sm, color: colors.white, fontWeight: 'bold' },
  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 8,
  },
  amountLabel: { fontSize: SIZES.md, color: colors.textLight },
  remainingText: { fontSize: SIZES.md, fontWeight: 'bold', color: colors.error, marginTop: 4 },
  historyRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyText: { flex: 1, fontSize: SIZES.sm, color: colors.textLight },
  receiptButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
  receiptButtonText: { fontSize: SIZES.sm, color: colors.primary, fontWeight: '700' },
  payButton: {
    height: 40, backgroundColor: colors.secondary, borderRadius: SIZES.radius,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  payButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 40, fontSize: SIZES.md },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: SIZES.padding },
  modalContent: { backgroundColor: colors.cardBg, borderRadius: SIZES.radius * 2, padding: SIZES.padding * 1.5 },
  modalTitle: { fontSize: SIZES.xl, fontWeight: 'bold', color: colors.text },
  modalSubtitle: { fontSize: SIZES.md, color: colors.textLight, marginTop: 4, marginBottom: 16 },
  label: { fontSize: SIZES.md, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    height: SIZES.inputHeight, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding, fontSize: SIZES.md, color: colors.text, backgroundColor: colors.inputBg,
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  methodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg },
  methodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodChipText: { color: colors.text, fontSize: SIZES.sm, fontWeight: '700' },
  methodChipTextActive: { color: colors.white },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: colors.background },
  cancelButtonText: { fontSize: SIZES.md, color: colors.textLight },
  saveButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: colors.primary },
  saveButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: 'bold' },
});
}
