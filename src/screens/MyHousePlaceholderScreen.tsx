import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../database/PreferencesContext';
import { SIZES } from '../constants/theme';

type Props = {
  title: string;
  description: string;
};

export default function MyHousePlaceholderScreen({ title, description }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: SIZES.padding,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 2,
      padding: SIZES.padding * 1.5,
      alignItems: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    description: {
      color: colors.textLight,
      fontSize: SIZES.md,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: 10,
    },
  });
}
