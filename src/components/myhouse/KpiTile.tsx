import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type Props = {
  value: string;
  label: string;
  hint: string;
};

export default function KpiTile({ value, label, hint }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>Module</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      width: 250,
      minHeight: 146,
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      padding: 18,
    },
    caption: {
      color: colors.textLight,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    value: {
      color: colors.secondary,
      fontSize: 22,
      fontWeight: '800',
    },
    label: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 12,
    },
    hint: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 8,
    },
  });
}
