import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../database/PreferencesContext';

type Props = {
  title: string;
  message: string;
  keepLabel: string;
  resetLabel: string;
  onKeep: () => void;
  onReset: () => void;
};

export default function UpgradePromptScreen({
  title,
  message,
  keepLabel,
  resetLabel,
  onKeep,
  onReset,
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onReset}>
            <Text style={styles.secondaryButtonText}>{resetLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onKeep}>
            <Text style={styles.primaryButtonText}>{keepLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 620,
      backgroundColor: colors.cardBg,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    title: {
      color: colors.text,
      fontSize: SIZES.xl,
      fontWeight: '800',
    },
    message: {
      color: colors.textLight,
      fontSize: SIZES.md,
      lineHeight: 22,
    },
    actions: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: SIZES.md,
      fontWeight: '800',
    },
    secondaryButton: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: SIZES.md,
      fontWeight: '800',
    },
  });
}
