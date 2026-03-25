import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import type { Room, IndexReading } from '../services/InvoiceCalculationService';
import { listIndexReadings, listResidents, listRooms, upsertIndexReading } from '../services/BackendApi';

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

interface RoomWithIndex extends Room {
  reading: IndexReading | null;
  saved: boolean;
}

export default function IndexEntryScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);

  const [mois] = useState(getCurrentMonth());
  const [roomsData, setRoomsData] = useState<RoomWithIndex[]>([]);
  const [formData, setFormData] = useState<Record<number, {
    anEau: string; niEau: string; anElec: string; niElec: string;
    presence: boolean; amende: boolean;
  }>>({});

  const loadData = useCallback(async () => {
    try {
      const [apiRooms, apiResidents, readings, prevReadings] = await Promise.all([
        listRooms(true),
        listResidents(),
        listIndexReadings(mois),
        listIndexReadings(getPreviousMonth(mois)),
      ]);

      const rooms: Room[] = apiRooms
        .map((room) => {
          const resident = apiResidents.find((r) => r.currentRoomId === room.id && r.statut !== 'INACTIF');
          return {
            id: room.id,
            numero_chambre: room.numeroChambre,
            nom_prenom: resident ? `${resident.nom} ${resident.prenom}`.trim() : '',
            numero_whatsapp: resident?.whatsapp ?? resident?.telephone ?? '',
            actif: room.actif ? 1 : 0,
            date_creation: room.createdAt,
          };
        })
        .sort((a, b) => a.numero_chambre.localeCompare(b.numero_chambre));

      const newFormData: typeof formData = {};
      const roomsWithIndex: RoomWithIndex[] = [];

      for (const room of rooms) {
        const currentReading = readings.find((r) => r.roomId === room.id) || null;
        const reading: IndexReading | null = currentReading ? {
          id: currentReading.id,
          chambre_id: currentReading.roomId,
          mois: currentReading.mois,
          ancien_index_eau: currentReading.anEau,
          nouvel_index_eau: currentReading.niEau,
          ancien_index_elec: currentReading.anElec,
          nouvel_index_elec: currentReading.niElec,
          statut_presence: currentReading.statutPresence,
          amende_eau: currentReading.amendeEau ? 1 : 0,
        } : null;
        const prevReading = prevReadings.find((r) => r.roomId === room.id);

        const anEau = reading ? reading.ancien_index_eau : (prevReading ? prevReading.niEau : 0);
        const anElec = reading ? reading.ancien_index_elec : (prevReading ? prevReading.niElec : 0);

        newFormData[room.id] = {
          anEau: reading ? reading.ancien_index_eau.toString() : anEau.toString(),
          niEau: reading ? reading.nouvel_index_eau.toString() : '',
          anElec: reading ? reading.ancien_index_elec.toString() : anElec.toString(),
          niElec: reading ? reading.nouvel_index_elec.toString() : '',
          presence: reading ? reading.statut_presence === 'PRESENT' : true,
          amende: reading ? !!reading.amende_eau : false,
        };

        roomsWithIndex.push({ ...room, reading, saved: !!reading });
      }

      setRoomsData(roomsWithIndex);
      setFormData(newFormData);
    } catch (error) {
      console.error('Load index data error:', error);
    }
  }, [mois]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const updateForm = (roomId: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], [field]: value },
    }));
  };

  const validateAndSave = async (room: RoomWithIndex) => {
    const data = formData[room.id];
    if (!data) return;

    const anEau = parseFloat(data.anEau) || 0;
    const niEau = parseFloat(data.niEau) || 0;
    const anElec = parseFloat(data.anElec) || 0;
    const niElec = parseFloat(data.niElec) || 0;

    if (niEau < anEau) {
      Alert.alert(t('error'), `Chambre ${room.numero_chambre}: NI eau < AN eau`);
      return;
    }
    if (niElec < anElec) {
      Alert.alert(t('error'), `Chambre ${room.numero_chambre}: NI elec < AN elec`);
      return;
    }

    try {
      await upsertIndexReading({
        roomId: room.id,
        mois,
        anEau,
        niEau,
        anElec,
        niElec,
        statutPresence: data.presence ? 'PRESENT' : 'ABSENT',
        amendeEau: data.amende,
        saisiPar: 'mobile-admin',
      });
      await loadData();
      Alert.alert(t('success'), `Index chambre ${room.numero_chambre} enregistre.`);
    } catch (error) {
      Alert.alert(t('error'), 'Impossible de sauvegarder.');
    }
  };

  const savedCount = roomsData.filter(r => r.saved).length;

  const renderRoom = ({ item }: { item: RoomWithIndex }) => {
    const data = formData[item.id];
    if (!data) return null;

    const niEau = parseFloat(data.niEau) || 0;
    const anEau = parseFloat(data.anEau) || 0;
    const niElec = parseFloat(data.niElec) || 0;
    const anElec = parseFloat(data.anElec) || 0;
    const consoEau = niEau - anEau;
    const consoElec = niElec - anElec;
    const hasError = (data.niEau !== '' && niEau < anEau) || (data.niElec !== '' && niElec < anElec);

    return (
      <View style={[styles.roomCard, item.saved && styles.roomCardSaved, hasError && styles.roomCardError]}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomNumber}>CH {item.numero_chambre}</Text>
          <Text style={styles.roomName}>{item.nom_prenom}</Text>
          {item.saved && <Text style={styles.savedBadge}>{t('entered')}</Text>}
        </View>

        <Text style={styles.sectionTitle}>{t('water')}</Text>
        <View style={styles.indexRow}>
          <View style={styles.indexField}>
            <Text style={styles.fieldLabel}>{t('oldIndex')}</Text>
            <TextInput style={styles.indexInput} value={data.anEau} onChangeText={v => updateForm(item.id, 'anEau', v)} keyboardType="decimal-pad" />
          </View>
          <View style={styles.indexField}>
            <Text style={styles.fieldLabel}>{t('newIndex')}</Text>
            <TextInput style={[styles.indexInput, data.niEau !== '' && niEau < anEau && styles.inputError]} value={data.niEau} onChangeText={v => updateForm(item.id, 'niEau', v)} keyboardType="decimal-pad" />
          </View>
          <View style={styles.consoField}>
            <Text style={styles.fieldLabel}>{t('consumption')}</Text>
            <Text style={[styles.consoText, consoEau < 0 && { color: colors.error }]}>{data.niEau ? consoEau.toFixed(1) : '-'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('electricity')}</Text>
        <View style={styles.indexRow}>
          <View style={styles.indexField}>
            <Text style={styles.fieldLabel}>{t('oldIndex')}</Text>
            <TextInput style={styles.indexInput} value={data.anElec} onChangeText={v => updateForm(item.id, 'anElec', v)} keyboardType="decimal-pad" />
          </View>
          <View style={styles.indexField}>
            <Text style={styles.fieldLabel}>{t('newIndex')}</Text>
            <TextInput style={[styles.indexInput, data.niElec !== '' && niElec < anElec && styles.inputError]} value={data.niElec} onChangeText={v => updateForm(item.id, 'niElec', v)} keyboardType="decimal-pad" />
          </View>
          <View style={styles.consoField}>
            <Text style={styles.fieldLabel}>{t('consumption')}</Text>
            <Text style={[styles.consoText, consoElec < 0 && { color: colors.error }]}>{data.niElec ? consoElec.toFixed(1) : '-'}</Text>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>{t('present')}</Text>
            <Switch value={data.presence} onValueChange={v => updateForm(item.id, 'presence', v)} trackColor={{ false: colors.border, true: colors.success }} thumbColor={colors.white} />
          </View>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>{t('waterFine')}</Text>
            <Switch value={data.amende} onValueChange={v => updateForm(item.id, 'amende', v)} trackColor={{ false: colors.border, true: colors.error }} thumbColor={colors.white} />
          </View>
        </View>

        <TouchableOpacity style={[styles.validateButton, item.saved && styles.validateButtonSaved]} onPress={() => validateAndSave(item)}>
          <Text style={styles.validateButtonText}>{item.saved ? t('edit') : t('validate')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('indexEntry')} - {mois}</Text>
        <Text style={styles.progressText}>{savedCount}/{roomsData.length} saisies</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: roomsData.length > 0 ? `${(savedCount / roomsData.length) * 100}%` : '0%' }]} />
      </View>

      <FlatList
        data={roomsData}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noActiveRooms')}</Text>}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: SIZES.padding, backgroundColor: colors.primary,
    },
    headerTitle: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
    progressText: { fontSize: SIZES.md, color: colors.white },
    progressBar: {
      height: 6, backgroundColor: colors.border, marginHorizontal: SIZES.margin,
      borderRadius: 3, marginTop: 8,
    },
    progressFill: { height: 6, backgroundColor: colors.success, borderRadius: 3 },
    list: { padding: SIZES.padding, paddingBottom: 20 },
    roomCard: {
      backgroundColor: colors.cardBg, borderRadius: SIZES.radius,
      padding: SIZES.padding, marginBottom: SIZES.margin,
      elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4,
      borderLeftWidth: 4, borderLeftColor: colors.border,
    },
    roomCardSaved: { borderLeftColor: colors.success },
    roomCardError: { borderLeftColor: colors.error },
    roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    roomNumber: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
    roomName: { fontSize: SIZES.md, color: colors.text, flex: 1 },
    savedBadge: {
      backgroundColor: colors.success, color: colors.white, fontSize: SIZES.xs,
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', fontWeight: 'bold',
    },
    sectionTitle: { fontSize: SIZES.md, fontWeight: '600', color: colors.secondary, marginTop: 8, marginBottom: 4 },
    indexRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    indexField: { flex: 1 },
    fieldLabel: { fontSize: SIZES.xs, color: colors.textLight, marginBottom: 2 },
    indexInput: {
      height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius,
      paddingHorizontal: 8, fontSize: SIZES.md, color: colors.text, backgroundColor: colors.inputBg,
    },
    inputError: { borderColor: colors.error, borderWidth: 2 },
    consoField: { width: 60, alignItems: 'center' },
    consoText: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary, marginTop: 4 },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggleLabel: { fontSize: SIZES.md, color: colors.text },
    validateButton: {
      height: 40, backgroundColor: colors.primary, borderRadius: SIZES.radius,
      justifyContent: 'center', alignItems: 'center', marginTop: 12,
    },
    validateButtonSaved: { backgroundColor: colors.success },
    validateButtonText: { fontSize: SIZES.md, fontWeight: 'bold', color: colors.white },
    emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 40, fontSize: SIZES.md },
  });
}
