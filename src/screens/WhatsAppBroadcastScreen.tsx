import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { listResidents } from '../services/BackendApi';
import { sendWhatsAppBroadcastMessage } from '../services/WhatsAppService';

export default function WhatsAppBroadcastScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeRooms, setActiveRooms] = useState(0);
  const [recipients, setRecipients] = useState<Array<{ phone: string }>>([]);

  const loadActiveRooms = useCallback(async () => {
    const residents = await listResidents();
    const phones = residents
      .filter((r) => r.currentRoomId !== null && r.statut !== 'INACTIF')
      .map((r) => r.whatsapp ?? r.telephone ?? '')
      .filter((p) => p.trim().length > 0);
    setRecipients(phones.map((phone) => ({ phone })));
    setActiveRooms(phones.length);
  }, []);

  useFocusEffect(useCallback(() => { loadActiveRooms(); }, [loadActiveRooms]));

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert(t('error'), t('enterMessage'));
      return;
    }
    if (activeRooms === 0) {
      Alert.alert(t('error'), t('noActiveResident'));
      return;
    }

    Alert.alert(
      t('whatsappBroadcast'),
      `${t('broadcastQuestion')} a ${activeRooms} resident(s) ?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('send'),
          onPress: async () => {
            try {
              setSending(true);
              const result = await sendWhatsAppBroadcastMessage(recipients, trimmed);
              Alert.alert(
                t('finished'),
                `${t('broadcastDone')}\nTotal: ${result.totalActiveRooms}\nValides: ${result.validRecipients}\nOuverts: ${result.sentCount}\nInvalides/non-ouverts: ${result.invalidCount}`,
              );
            } catch (error) {
              Alert.alert(t('error'), t('cannotBroadcast'));
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('whatsappBroadcast')}</Text>
        <Text style={styles.subtitle}>{activeRooms} resident(s) actif(s)</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Message a diffuser (hors factures)</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Ex: Reunion copropriete samedi a 18h..."
          placeholderTextColor={colors.textLight}
          multiline
          textAlignVertical="top"
          editable={!sending}
        />

        <TouchableOpacity
          style={[styles.button, sending && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.buttonText}>Diffusion en cours...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{t('whatsappBroadcast')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: SIZES.padding,
    backgroundColor: colors.primary,
  },
  title: {
    color: colors.white,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.white,
    fontSize: SIZES.md,
    marginTop: 4,
  },
  body: {
    padding: SIZES.padding,
  },
  label: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 180,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radius,
    padding: 12,
    fontSize: SIZES.md,
    color: colors.text,
  },
  button: {
    marginTop: SIZES.margin,
    height: SIZES.buttonHeight,
    borderRadius: SIZES.radius,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});
}
