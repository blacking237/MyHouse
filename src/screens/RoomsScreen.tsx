import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useFocusEffect } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import type { Room } from '../services/InvoiceCalculationService';
import {
  assignResidentRoom,
  createResident,
  createRoom,
  listResidents,
  listRooms,
  patchResident,
  patchRoom,
  type ApiResident,
} from '../services/BackendApi';

export default function RoomsScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [residents, setResidents] = useState<ApiResident[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({ numero: '', nom: '', whatsapp: '' });
  const [saving, setSaving] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const [apiRooms, apiResidents] = await Promise.all([
        listRooms(),
        listResidents(),
      ]);
      const mapped: Room[] = apiRooms
        .map((room) => {
          const resident = apiResidents.find((r) => r.currentRoomId === room.id && r.statut !== 'INACTIF');
          const fullname = resident ? `${resident.nom} ${resident.prenom}`.trim() : '';
          const phone = resident?.whatsapp ?? resident?.telephone ?? '';
          return {
            id: room.id,
            numero_chambre: room.numeroChambre,
            nom_prenom: fullname,
            numero_whatsapp: phone,
            actif: room.actif ? 1 : 0,
            date_creation: room.createdAt,
          };
        })
        .sort((a, b) => a.numero_chambre.localeCompare(b.numero_chambre));
      setResidents(apiResidents);
      setRooms(mapped);
    } catch (error) {
      console.error('Load rooms error:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadRooms(); }, [loadRooms]));

  const filteredRooms = rooms.filter(r =>
    r.numero_chambre.toLowerCase().includes(search.toLowerCase()) ||
    r.nom_prenom.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditRoom(null);
    setForm({ numero: '', nom: '', whatsapp: '' });
    setModalVisible(true);
  };

  const openEditModal = (room: Room) => {
    setEditRoom(room);
    setForm({ numero: room.numero_chambre, nom: room.nom_prenom, whatsapp: room.numero_whatsapp });
    setModalVisible(true);
  };

  const normalizePhone = (value: string) => value.trim().replace(/[^\d+]/g, '');

  const getErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) return t('cannotSaveData');
    const message = error.message.trim();
    if (!message) return t('cannotSaveData');
    if (/network request failed|failed to fetch|cleartext http traffic|unable to resolve host|failed to connect/i.test(message)) {
      return 'Connexion serveur indisponible. Les donnees seront enregistrees en local.';
    }
    return message;
  };

  const pickFromContacts = async () => {
    try {
      const perm = await Contacts.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('permissionRequired'), t('allowContacts'));
        return;
      }

      const picked = await Contacts.presentContactPickerAsync();
      if (!picked) return;

      const phone = picked.phoneNumbers?.[0]?.number ?? '';
      if (!phone) {
        Alert.alert(t('info'), t('noPhoneForContact'));
        return;
      }

      setForm(prev => ({
        ...prev,
        nom: prev.nom.trim() ? prev.nom : picked.name ?? '',
        whatsapp: phone,
      }));
    } catch (error) {
      Alert.alert(t('error'), t('cannotOpenContacts'));
    }
  };

  const saveRoom = async () => {
    const numero = form.numero.trim().toUpperCase();
    const nomComplet = form.nom.trim().replace(/\s+/g, ' ');
    const whatsapp = normalizePhone(form.whatsapp);

    if (!numero || !nomComplet || !whatsapp) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (whatsapp.length > 40) {
      Alert.alert(t('error'), 'Numero WhatsApp trop long.');
      return;
    }

    const [nom, ...prenoms] = nomComplet.split(' ');
    const prenom = prenoms.join(' ').trim() || '-';
    const assignmentDate = new Date().toISOString().split('T')[0];

    setSaving(true);
    try {
      if (editRoom) {
        await patchRoom(editRoom.id, {
          numeroChambre: numero,
        });
        const existingResident = residents.find((r) => r.currentRoomId === editRoom.id && r.statut !== 'INACTIF');
        if (existingResident) {
          await patchResident(existingResident.id, {
            nom: nom.trim(),
            prenom,
            whatsapp,
            telephone: whatsapp,
          });
        } else {
          const createdResident = await createResident({
            nom: nom.trim(),
            prenom,
            whatsapp,
            telephone: whatsapp,
          });
          await assignResidentRoom(createdResident.id, editRoom.id, assignmentDate);
        }
      } else {
        const createdRoom = await createRoom({
          numeroChambre: numero,
        });
        const createdResident = await createResident({
          nom: nom.trim(),
          prenom,
          whatsapp,
          telephone: whatsapp,
        });
        await assignResidentRoom(createdResident.id, createdRoom.id, assignmentDate);
      }
      setModalVisible(false);
      await loadRooms();
      Alert.alert(t('success'), editRoom ? 'Chambre mise a jour.' : 'Chambre creee avec succes.');
    } catch (error: any) {
      console.error('Save room error:', error);
      if (error.message?.includes('UNIQUE') || error.message?.includes('already exists')) {
        Alert.alert(t('error'), t('roomAlreadyExists'));
      } else {
        Alert.alert(t('error'), getErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleRoom = async (room: Room) => {
    const newStatus = room.actif ? 0 : 1;
    const action = room.actif ? 'desactiver' : 'reactiver';
    Alert.alert(
      t('confirmation'),
      `Voulez-vous ${action} la chambre ${room.numero_chambre} ?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmAction'),
          onPress: async () => {
            await patchRoom(room.id, { actif: newStatus === 1 });
            await loadRooms();
          },
        },
      ]
    );
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity style={styles.roomCard} onPress={() => openEditModal(item)}>
      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomNumber}>CH {item.numero_chambre}</Text>
          <View style={[styles.badge, { backgroundColor: item.actif ? colors.success : colors.error }]}>
            <Text style={styles.badgeText}>{item.actif ? 'Actif' : 'Inactif'}</Text>
          </View>
        </View>
        <Text style={styles.roomName}>{item.nom_prenom}</Text>
        <Text style={styles.roomPhone}>{item.numero_whatsapp}</Text>
      </View>
      <TouchableOpacity style={styles.toggleButton} onPress={() => toggleRoom(item)}>
        <Text style={styles.toggleText}>{item.actif ? 'Desactiver' : 'Reactiver'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher par numero ou nom..."
        placeholderTextColor={colors.disabled}
      />

      <FlatList
        data={filteredRooms}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('noRoomFound')}</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editRoom ? 'Modifier la chambre' : 'Ajouter une chambre'}</Text>

            <Text style={styles.label}>Numero de chambre</Text>
            <TextInput
              style={styles.input}
              value={form.numero}
              onChangeText={v => setForm({ ...form, numero: v })}
              placeholder="Ex: 101, 306A"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.label}>Nom et prenom du resident</Text>
            <TextInput
              style={styles.input}
              value={form.nom}
              onChangeText={v => setForm({ ...form, nom: v })}
              placeholder="Ex: Dupont Jean"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.label}>Numero WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={form.whatsapp}
              onChangeText={v => setForm({ ...form, whatsapp: normalizePhone(v) })}
              placeholder="+237XXXXXXXXX"
              placeholderTextColor={colors.disabled}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={styles.contactButton} onPress={pickFromContacts}>
              <Text style={styles.contactButtonText}>Choisir depuis mes contacts</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveRoom} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? `${t('save')}...` : t('save')}</Text>
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
    searchInput: {
      margin: SIZES.margin,
      height: SIZES.inputHeight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SIZES.radius,
      paddingHorizontal: SIZES.padding,
      fontSize: SIZES.md,
      backgroundColor: colors.inputBg,
      color: colors.text,
    },
    list: { paddingHorizontal: SIZES.padding, paddingBottom: 80 },
    roomCard: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius,
      padding: SIZES.padding,
      marginBottom: SIZES.margin / 2,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    roomInfo: { flex: 1 },
    roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    roomNumber: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.primary },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: SIZES.xs, color: colors.white, fontWeight: 'bold' },
    roomName: { fontSize: SIZES.md, color: colors.text, marginTop: 4 },
    roomPhone: { fontSize: SIZES.sm, color: colors.textLight, marginTop: 2 },
    toggleButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: SIZES.radius, backgroundColor: colors.background },
    toggleText: { fontSize: SIZES.sm, color: colors.textLight },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    fabText: { fontSize: 28, color: colors.white, lineHeight: 30 },
    emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 40, fontSize: SIZES.md },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: SIZES.padding },
    modalContent: { backgroundColor: colors.cardBg, borderRadius: SIZES.radius * 2, padding: SIZES.padding * 1.5 },
    modalTitle: { fontSize: SIZES.xl, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
    label: { fontSize: SIZES.md, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
    input: {
      height: SIZES.inputHeight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SIZES.radius,
      paddingHorizontal: SIZES.padding,
      fontSize: SIZES.md,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    contactButton: {
      marginTop: 10,
      backgroundColor: colors.secondary,
      borderRadius: SIZES.radius,
      alignItems: 'center',
      justifyContent: 'center',
      height: 42,
    },
    contactButtonText: { color: colors.white, fontWeight: '700' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
    cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: colors.background },
    cancelButtonText: { fontSize: SIZES.md, color: colors.textLight },
    saveButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: colors.primary },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: 'bold' },
  });
}
