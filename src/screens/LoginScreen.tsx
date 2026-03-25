import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, ImageBackground, useWindowDimensions,
} from 'react-native';
import { SIZES } from '../constants/theme';
import { useAuth } from '../database/AuthContext';
import { useDatabaseOptional } from '../database/DatabaseContext';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { recoverPassword, requestRecoveryCode } from '../services/BackendApi';

const loginBackground = require('../../assets/images/login -background.png');

export default function LoginScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const { width, height } = useWindowDimensions();
  const styles = createStyles(colors, {
    isDesktopWide: width >= 1280,
    isTablet: width >= 820 && width < 1280,
    isCompact: width < 820,
    height,
  });
  const isWeb = Platform.OS === 'web';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [recoverVisible, setRecoverVisible] = useState(false);
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);

  const { login } = useAuth();
  const db = useDatabaseOptional();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      const success = await login(db, username.trim(), password);
      if (!success) {
        Alert.alert(t('error'), t('wrongCredentials'));
      }
    } catch (error) {
      Alert.alert(t('error'), 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const openRecoverModal = () => {
    setRecoverUsername(username.trim());
    setRecoverCode('');
    setRecoverNewPassword('');
    setRecoverConfirmPassword('');
    setCodeRequested(false);
    setRecoverVisible(true);
  };

  const handleRequestCode = async () => {
    if (!recoverUsername.trim()) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await requestRecoveryCode(recoverUsername.trim());
      setCodeRequested(true);
      Alert.alert(t('success'), t('recoveryCodeSent'));
    } catch (error) {
      Alert.alert(t('error'), t('recoveryCodeRequestFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async () => {
    if (!recoverUsername.trim() || !recoverCode.trim() || !recoverNewPassword.trim() || !recoverConfirmPassword.trim()) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (recoverNewPassword.length < 6) {
      Alert.alert(t('error'), t('newPasswordMin'));
      return;
    }
    if (recoverNewPassword !== recoverConfirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await recoverPassword(recoverUsername.trim(), recoverCode.trim(), recoverNewPassword);
      setRecoverVisible(false);
      Alert.alert(t('success'), t('recoverySuccess'));
      setUsername(recoverUsername.trim());
      setPassword('');
    } catch (error) {
      Alert.alert(t('error'), t('recoveryFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={loginBackground}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageAsset}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.backgroundGlowTop} />
        <View pointerEvents="none" style={styles.backgroundGlowBottom} />
        <View style={styles.inner}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>H</Text>
              <View style={styles.logoHandle} />
            </View>
            <Text style={styles.appName}>
              <Text style={styles.appNameMy}>My</Text>
              <Text style={styles.appNameH}>H</Text>
              <Text style={styles.appNameOuse}>OUSE</Text>
            </Text>
            <Text style={styles.slogan}>{t('loginSlogan')}</Text>
          </View>
 
          <View style={[styles.formContainer, isWeb && styles.formContainerWeb]}>
            <Text style={styles.formTitle}>Connexion</Text>
            <View style={styles.formDivider} />

            <Text style={styles.label}>{t('username')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('enterUsername')}
              placeholderTextColor={colors.disabled}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{t('password')}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={t('enterPassword')}
                placeholderTextColor={colors.disabled}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={openRecoverModal}>
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? `${t('login')}...` : t('login')}
              </Text>
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <Text style={styles.bottomLink}>Support</Text>
              <Text style={styles.linkSeparator}>|</Text>
              <Text style={styles.bottomLink}>{t('contact')}</Text>
            </View>

            <View style={styles.footerDivider} />
            <Text style={styles.footerVersion}>Version 1.0.1</Text>
            <Text style={styles.footerCopyright}>© 2026 MyHouse</Text>
          </View>
        </View>
      </ImageBackground>

      <Modal visible={recoverVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('recoveryTitle')}</Text>

            <Text style={styles.label}>{t('username')}</Text>
            <TextInput
              style={styles.input}
              value={recoverUsername}
              onChangeText={setRecoverUsername}
              placeholder={t('enterUsername')}
              placeholderTextColor={colors.disabled}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.requestCodeBtn} onPress={handleRequestCode}>
              <Text style={styles.requestCodeBtnText}>{t('sendRecoveryCode')}</Text>
            </TouchableOpacity>

            {codeRequested && (
              <Text style={styles.codeInfo}>{t('recoveryCodeSentHint')}</Text>
            )}

            <Text style={styles.label}>{t('recoveryCode')}</Text>
            <TextInput
              style={styles.input}
              value={recoverCode}
              onChangeText={setRecoverCode}
              placeholder={t('enterRecoveryCode')}
              placeholderTextColor={colors.disabled}
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('newPasswordShort')}</Text>
            <TextInput
              style={styles.input}
              value={recoverNewPassword}
              onChangeText={setRecoverNewPassword}
              placeholder={t('newPasswordPlaceholder')}
              placeholderTextColor={colors.disabled}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('confirmPasswordLabel')}</Text>
            <TextInput
              style={styles.input}
              value={recoverConfirmPassword}
              onChangeText={setRecoverConfirmPassword}
              placeholder={t('confirmPasswordPlaceholder')}
              placeholderTextColor={colors.disabled}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecoverVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recoverBtn} onPress={handleRecoverPassword}>
                <Text style={styles.recoverBtnText}>{t('recoverPasswordAction')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function createStyles(
  colors: ReturnType<typeof useThemeColors>,
  layout: { isDesktopWide: boolean; isTablet: boolean; isCompact: boolean; height: number },
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundImage: {
      flex: 1,
    },
    backgroundImageAsset: {
      width: '100%',
      height: '100%',
      ...(Platform.OS === 'web'
        ? {
            objectFit: 'cover' as any,
            objectPosition: layout.isDesktopWide ? 'center bottom' : layout.isTablet ? '58% bottom' : 'center center',
          }
        : null),
    },
    backgroundGlowTop: {
      position: 'absolute',
      top: layout.isCompact ? -90 : -120,
      left: layout.isCompact ? -90 : -120,
      width: layout.isCompact ? 220 : 360,
      height: layout.isCompact ? 220 : 360,
      borderRadius: 180,
      backgroundColor: 'rgba(123,97,255,0.08)',
    },
    backgroundGlowBottom: {
      position: 'absolute',
      right: layout.isCompact ? -120 : -140,
      bottom: layout.isCompact ? -120 : -140,
      width: layout.isCompact ? 260 : 420,
      height: layout.isCompact ? 260 : 420,
      borderRadius: 210,
      backgroundColor: 'rgba(44,101,176,0.08)',
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: layout.isCompact ? SIZES.padding : SIZES.padding * 2,
      paddingVertical: layout.isCompact ? 20 : 32,
      minHeight: layout.height,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: layout.isCompact ? 24 : 40,
    },
    logoCircle: {
      width: layout.isCompact ? 92 : 124,
      height: layout.isCompact ? 92 : 124,
      borderRadius: layout.isCompact ? 46 : 62,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: layout.isCompact ? 12 : 18,
      position: 'relative',
    },
    logoText: {
      fontSize: layout.isCompact ? 54 : 74,
      fontWeight: '900',
      color: '#F6C85E',
      lineHeight: layout.isCompact ? 60 : 82,
    },
    logoHandle: {
      position: 'absolute',
      width: layout.isCompact ? 40 : 54,
      height: layout.isCompact ? 14 : 18,
      borderRadius: 10,
      backgroundColor: colors.primary,
      right: layout.isCompact ? -10 : -12,
      bottom: layout.isCompact ? 8 : 10,
      transform: [{ rotate: '48deg' }],
    },
    appName: {
      fontSize: layout.isCompact ? 32 : SIZES.xxxl,
      fontWeight: 'bold',
      letterSpacing: layout.isCompact ? 1 : 2,
    },
    appNameMy: {
      color: '#8A7CF0',
    },
    appNameH: {
      color: '#F6C85E',
    },
    appNameOuse: {
      color: colors.primary,
    },
    slogan: {
      fontSize: layout.isCompact ? SIZES.sm : SIZES.md,
      color: colors.textLight,
      marginTop: 10,
      textAlign: 'center',
    },
    formContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 2,
      padding: layout.isCompact ? SIZES.padding * 1.1 : SIZES.padding * 1.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    formContainerWeb: {
      width: '100%',
      maxWidth: layout.isDesktopWide ? 700 : layout.isTablet ? 640 : 520,
      alignSelf: 'center',
      paddingHorizontal: layout.isCompact ? 22 : 44,
      paddingVertical: layout.isCompact ? 18 : 26,
    },
    formTitle: {
      fontSize: layout.isCompact ? 28 : 34,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    formDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 10,
    },
    label: {
      fontSize: SIZES.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      marginTop: layout.isCompact ? 8 : 12,
    },
    input: {
      height: layout.isCompact ? 50 : SIZES.inputHeight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SIZES.radius,
      paddingHorizontal: SIZES.padding,
      fontSize: layout.isCompact ? SIZES.md : SIZES.lg,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SIZES.radius,
      backgroundColor: colors.inputBg,
    },
    passwordInput: {
      flex: 1,
      height: layout.isCompact ? 50 : SIZES.inputHeight,
      paddingHorizontal: SIZES.padding,
      fontSize: layout.isCompact ? SIZES.md : SIZES.lg,
      color: colors.text,
    },
    eyeButton: {
      padding: SIZES.padding,
    },
    eyeIcon: {
      fontSize: 13,
      color: colors.textLight,
      fontWeight: '700',
    },
    forgotBtn: {
      alignSelf: 'flex-end',
      marginTop: 10,
    },
    forgotText: {
      color: colors.secondary,
      fontWeight: '700',
      fontSize: SIZES.sm,
    },
    loginButton: {
      height: layout.isCompact ? 50 : SIZES.buttonHeight,
      backgroundColor: colors.primary,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: layout.isCompact ? 16 : 20,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      fontSize: SIZES.lg,
      fontWeight: 'bold',
      color: colors.white,
    },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
      marginTop: 18,
    },
    bottomLink: {
      color: colors.primary,
      fontSize: layout.isCompact ? SIZES.sm : SIZES.md,
      fontWeight: '500',
    },
    linkSeparator: {
      color: colors.textLight,
      fontSize: layout.isCompact ? SIZES.sm : SIZES.md,
    },
    footerDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 18,
      marginBottom: 14,
    },
    footerVersion: {
      textAlign: 'center',
      color: colors.text,
      fontSize: layout.isCompact ? SIZES.sm : SIZES.md,
      fontWeight: '500',
    },
    footerCopyright: {
      textAlign: 'center',
      color: colors.textLight,
      fontSize: layout.isCompact ? SIZES.sm : SIZES.md,
      marginTop: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: SIZES.padding,
    },
    modalCard: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 2,
      padding: SIZES.padding * 1.2,
    },
    modalTitle: {
      fontSize: SIZES.xl,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    requestCodeBtn: {
      marginTop: 10,
      backgroundColor: colors.primary,
      borderRadius: SIZES.radius,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
    },
    requestCodeBtnText: {
      color: colors.white,
      fontWeight: '700',
    },
    codeInfo: {
      marginTop: 8,
      color: colors.success,
      fontWeight: '600',
      fontSize: SIZES.sm,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 18,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: SIZES.radius,
      backgroundColor: colors.background,
    },
    cancelBtnText: {
      color: colors.textLight,
      fontWeight: '700',
    },
    recoverBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: SIZES.radius,
      backgroundColor: colors.secondary,
    },
    recoverBtnText: {
      color: colors.white,
      fontWeight: '700',
    },
  });
}
