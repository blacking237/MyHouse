import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SIZES } from '../constants/theme';
import { type AppRole, useAuth } from '../database/AuthContext';
import { useDatabase } from '../database/DatabaseContext';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { exportResidents, exportInvoices, exportPayments, exportComplet } from '../services/ExportService';
import { getRecoveryEmail, setRecoveryEmail } from '../services/BackendApi';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const db = useDatabase();
  const { logout, changePassword, activeRole, availableRoles, setActiveRole } = useAuth();
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const { language, setLanguage, themeMode, setThemeMode, t } = usePreferences();
  const styles = createStyles(colors);

  const [mois] = useState(getCurrentMonth());
  const [recoveryEmail, setRecoveryEmailState] = useState('');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  React.useEffect(() => {
    async function loadRecoveryEmail() {
      try {
        const result = await getRecoveryEmail();
        setRecoveryEmailState(result.recoveryEmail ?? '');
      } catch {
        // Ignore if backend not reachable.
      }
    }
    void loadRecoveryEmail();
  }, []);

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }
    if (newPwd.length < 6) {
      Alert.alert(t('error'), t('newPasswordMin'));
      return;
    }

    const success = await changePassword(db, oldPwd, newPwd);
    if (success) {
      Alert.alert(t('success'), t('passwordChanged'));
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } else {
      Alert.alert(t('error'), t('oldPasswordWrong'));
    }
  };

  const handleExport = async (type: string) => {
    try {
      switch (type) {
        case 'residents':
          await exportResidents(db, mois, language);
          break;
        case 'invoices':
          await exportInvoices(db, mois, language);
          break;
        case 'payments':
          await exportPayments(db, mois, language);
          break;
        case 'complet':
          await exportComplet(db, mois, language);
          break;
      }
    } catch (error) {
      Alert.alert(t('error'), t('exportError'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logoutTitle'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('disconnect'), onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleSaveRecoveryEmail = async () => {
    if (!recoveryEmail.trim()) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    try {
      await setRecoveryEmail(recoveryEmail.trim());
      Alert.alert(t('success'), t('recoveryEmailSaved'));
    } catch {
      Alert.alert(t('error'), t('cannotSaveData'));
    }
  };

  const roleLabel = (role: AppRole) => {
    switch (role) {
      case 'tenant': return t('tenantRole');
      case 'concierge': return t('conciergeRole');
      case 'manager': return t('managerRole');
      case 'adminCommercial': return t('adminCommercialRole');
      case 'adminSav': return t('adminSavRole');
      case 'adminJuridique': return t('adminJuridiqueRole');
      case 'adminCompta': return t('adminComptaRole');
      case 'superAdmin': return t('superAdminRole');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('monthConfig')}</Text>
        <TouchableOpacity style={styles.monthConfigButton} onPress={() => navigation.navigate('MonthConfig')}>
          <Text style={styles.monthConfigButtonText}>{t('openMonthConfig')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('switchRole')}</Text>
        <Text style={styles.currentRoleText}>{t('currentRole')}: {roleLabel(activeRole)}</Text>
        <View style={styles.roleGrid}>
          {availableRoles.map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleChip, role === activeRole && styles.roleChipActive]}
              onPress={() => setActiveRole(role)}
            >
              <Text style={[styles.roleChipText, role === activeRole && styles.roleChipTextActive]}>
                {roleLabel(role)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.tagButton, language === 'fr' && styles.tagButtonActive]}
            onPress={() => setLanguage('fr')}
          >
            <Text style={[styles.tagButtonText, language === 'fr' && styles.tagButtonTextActive]}>{t('pickFrench')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tagButton, language === 'en' && styles.tagButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.tagButtonText, language === 'en' && styles.tagButtonTextActive]}>{t('pickEnglish')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tagButton, language === 'es' && styles.tagButtonActive]}
            onPress={() => setLanguage('es')}
          >
            <Text style={[styles.tagButtonText, language === 'es' && styles.tagButtonTextActive]}>{t('pickSpanish')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('theme')}</Text>
        <TouchableOpacity
          style={styles.monthConfigButton}
          onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
        >
          <Text style={styles.monthConfigButtonText}>
            {themeMode === 'light' ? t('darkMode') : t('lightMode')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('exportData')} ({mois})</Text>

        <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('residents')}>
          <Text style={styles.exportButtonText}>{t('exportResidentsXlsx')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('invoices')}>
          <Text style={styles.exportButtonText}>{t('exportInvoicesXlsx')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('payments')}>
          <Text style={styles.exportButtonText}>{t('exportPaymentsXlsx')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.exportButton, styles.exportCompletButton]} onPress={() => handleExport('complet')}>
          <Text style={styles.exportButtonText}>{t('exportCompleteXlsx')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('changePasswordSection')}</Text>

        <Text style={styles.label}>{t('recoveryEmailLabel')}</Text>
        <TextInput
          style={styles.input}
          value={recoveryEmail}
          onChangeText={setRecoveryEmailState}
          placeholder={t('recoveryEmailPlaceholder')}
          placeholderTextColor={colors.disabled}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.changePasswordButton} onPress={handleSaveRecoveryEmail}>
          <Text style={styles.changePasswordButtonText}>{t('saveRecoveryEmail')}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>{t('oldPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          value={oldPwd}
          onChangeText={setOldPwd}
          secureTextEntry
          placeholder={t('oldPasswordPlaceholder')}
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>{t('newPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          value={newPwd}
          onChangeText={setNewPwd}
          secureTextEntry
          placeholder={t('newPasswordPlaceholder')}
          placeholderTextColor={colors.disabled}
        />

        <Text style={styles.label}>{t('confirmPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          value={confirmPwd}
          onChangeText={setConfirmPwd}
          secureTextEntry
          placeholder={t('confirmPasswordPlaceholder')}
          placeholderTextColor={colors.disabled}
        />

        <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
          <Text style={styles.changePasswordButtonText}>{t('changePasswordAction')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('about')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('appLabel')}</Text>
          <Text style={styles.infoValue}>MYHOUSE</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('versionLabel')}</Text>
          <Text style={styles.infoValue}>1.0.1</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('platformLabel')}</Text>
          <Text style={styles.infoValue}>{t('androidLabel')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('productManager')}</Text>
          <Text style={styles.infoValue}>Njanga Martial</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('contact')}</Text>
          <Text style={styles.infoValue}>+237681681515</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('emailLabel')}</Text>
          <Text style={styles.infoValue}>martialtankouanjanga@gmail.com</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>{t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: SIZES.padding, backgroundColor: colors.primary },
    headerTitle: { fontSize: SIZES.lg, fontWeight: 'bold', color: colors.white },
    section: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius,
      margin: SIZES.margin,
      marginBottom: 0,
      padding: SIZES.padding,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    sectionTitle: {
      fontSize: SIZES.lg,
      fontWeight: 'bold',
      color: colors.secondary,
      marginBottom: 12,
    },
    monthConfigButton: {
      height: 46,
      borderRadius: SIZES.radius,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthConfigButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: '700' },
    rowActions: { flexDirection: 'row', gap: 10 },
    roleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 10,
    },
    currentRoleText: {
      color: colors.textLight,
      fontSize: SIZES.md,
    },
    roleChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.inputBg,
    },
    roleChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    roleChipText: {
      color: colors.text,
      fontWeight: '600',
    },
    roleChipTextActive: {
      color: colors.white,
    },
    tagButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SIZES.radius,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.inputBg,
    },
    tagButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagButtonText: { color: colors.text, fontWeight: '600' },
    tagButtonTextActive: { color: colors.white },
    exportButton: {
      height: 44,
      backgroundColor: colors.primary,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    exportCompletButton: { backgroundColor: colors.secondary },
    exportButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: '600' },
    label: { fontSize: SIZES.md, fontWeight: '600', color: colors.text, marginBottom: 4, marginTop: 12 },
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
    changePasswordButton: {
      height: SIZES.buttonHeight,
      backgroundColor: colors.secondary,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    changePasswordButtonText: { fontSize: SIZES.md, color: colors.white, fontWeight: 'bold' },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: { fontSize: SIZES.md, color: colors.textLight },
    infoValue: { fontSize: SIZES.md, color: colors.text, fontWeight: '600' },
    logoutButton: {
      height: SIZES.buttonHeight,
      backgroundColor: colors.error,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      margin: SIZES.margin,
    },
    logoutButtonText: { fontSize: SIZES.lg, color: colors.white, fontWeight: 'bold' },
  });
}
