import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../database/PreferencesContext';

type Props = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export default function StartupErrorScreen({ title, message, actionLabel, onAction }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
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
      maxWidth: 560,
      backgroundColor: colors.cardBg,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
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
    button: {
      marginTop: 8,
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    buttonText: {
      color: colors.white,
      fontSize: SIZES.md,
      fontWeight: '800',
    },
  });
}
