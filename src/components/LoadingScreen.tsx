import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';

export default function LoadingScreen() {
  const colors = useThemeColors();
  const { t } = usePreferences();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{t('loading')}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: SIZES.margin,
    fontSize: SIZES.lg,
    color: colors.textLight,
  },
});
}
