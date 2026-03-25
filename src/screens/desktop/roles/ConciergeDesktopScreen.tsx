import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ConciergeInventoryModule from '../../../features/concierge/inspection/ConciergeInventoryModule';
import MeterTrackDesktopScreen from '../../MeterTrackDesktopScreen';
import { useThemeColors } from '../../../database/PreferencesContext';
import { useAuth } from '../../../database/AuthContext';
import { useDatabaseOptional } from '../../../database/DatabaseContext';
import { createUserAccount } from '../../../services/BackendApi';

type ConciergeWorkspace = 'inspection' | 'metertrack' | 'accounts';

export default function ConciergeDesktopScreen() {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const db = useDatabaseOptional();
  const { createRoleAccount, listRoleAccounts, currentUsername } = useAuth();
  const [workspace, setWorkspace] = React.useState<ConciergeWorkspace>('inspection');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [accounts, setAccounts] = React.useState<Array<{
    id: number;
    username: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [notice, setNotice] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAccounts = React.useCallback(async () => {
    const rows = await listRoleAccounts(db);
    const filtered = rows
      .filter((entry) => entry.role === 'tenant' && (entry.createdBy === currentUsername || entry.parentUsername === currentUsername))
      .map((entry) => ({
        id: entry.id,
        username: entry.username,
        status: entry.status,
        createdAt: String(entry.createdAt).slice(0, 10),
      }));
    setAccounts(filtered);
  }, [currentUsername, db, listRoleAccounts]);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleCreateResidentAccount = React.useCallback(async () => {
    try {
      await createUserAccount({
        username: username.trim().toLowerCase(),
        password,
        role: 'RESIDENT',
      });
    } catch (apiError) {
      const result = await createRoleAccount(db, username, password, 'tenant', currentUsername || 'concierge');
      if (!result.ok) {
        setNotice({ type: 'error', message: result.reason === 'duplicate' ? 'Ce compte resident existe deja.' : 'Creation impossible. Verifiez les informations.' });
        return;
      }
    }
    setUsername('');
    setPassword('');
    setNotice({ type: 'success', message: 'Compte resident cree et synchronise avec le backend.' });
    await loadAccounts();
  }, [createRoleAccount, currentUsername, db, loadAccounts, password, username]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Espace concierge</Text>
        <Text style={styles.subtitle}>Inspection terrain, supervision MeterTrack et creation des comptes residents.</Text>
        <View style={styles.tabRow}>
          <TabButton
            styles={styles}
            active={workspace === 'inspection'}
            label="Inspection"
            onPress={() => setWorkspace('inspection')}
          />
          <TabButton
            styles={styles}
            active={workspace === 'metertrack'}
            label="MeterTrack"
            onPress={() => setWorkspace('metertrack')}
          />
          <TabButton
            styles={styles}
            active={workspace === 'accounts'}
            label="Residents"
            onPress={() => setWorkspace('accounts')}
          />
        </View>
      </View>

      <View style={styles.body}>
        {workspace === 'inspection' ? <ConciergeInventoryModule /> : null}
        {workspace === 'metertrack' ? <MeterTrackDesktopScreen embedded defaultPage="indexes" /> : null}
        {workspace === 'accounts' ? (
          <ScrollView contentContainerStyle={styles.accountsContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Creer un compte resident</Text>
              <Text style={styles.cardBody}>Le concierge peut preparer les comptes locataires/residents. Ils conservent le cycle de validation existant.</Text>
              {notice ? (
                <View style={[styles.notice, notice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{notice.message}</Text>
                </View>
              ) : null}
              <Text style={styles.label}>Identifiant resident</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                placeholder="resident.exemple"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.label}>Mot de passe provisoire</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                placeholder="minimum 6 caracteres"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateResidentAccount}>
                <Text style={styles.primaryButtonText}>Creer le compte resident</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comptes residents prepares</Text>
              <Text style={styles.cardBody}>Suivi des comptes residents crees depuis l espace concierge.</Text>
              {accounts.length === 0 ? (
                <Text style={styles.emptyText}>Aucun compte resident cree depuis cet espace pour le moment.</Text>
              ) : (
                accounts.map((account) => (
                  <View key={account.id} style={styles.accountRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountTitle}>{account.username}</Text>
                      <Text style={styles.accountMeta}>Creation: {account.createdAt}</Text>
                    </View>
                    <View style={[styles.badge, account.status === 'ACTIVE' ? styles.badgeActive : account.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending]}>
                      <Text style={styles.badgeText}>{account.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function TabButton({
  styles,
  active,
  label,
  onPress,
}: {
  styles: ReturnType<typeof createStyles>;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBg,
      gap: 8,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 21,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    tabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    tabText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    tabTextActive: {
      color: colors.white,
    },
    body: {
      flex: 1,
    },
    accountsContent: {
      padding: 20,
      gap: 16,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 10,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    cardBody: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 21,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
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
    primaryButton: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '800',
    },
    notice: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noticeSuccess: {
      backgroundColor: colors.success,
    },
    noticeError: {
      backgroundColor: colors.error,
    },
    noticeText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '700',
    },
    emptyText: {
      color: colors.textLight,
      fontSize: 14,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    accountTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    accountMeta: {
      color: colors.textLight,
      fontSize: 12,
      marginTop: 2,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    badgePending: {
      backgroundColor: colors.warning,
    },
    badgeActive: {
      backgroundColor: colors.success,
    },
    badgeRejected: {
      backgroundColor: colors.error,
    },
    badgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
