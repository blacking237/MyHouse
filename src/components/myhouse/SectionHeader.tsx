import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function SectionHeader({ eyebrow, title, description }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    eyebrow: {
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
    },
    description: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 22,
      maxWidth: 820,
    },
  });
}
