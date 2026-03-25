import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type Action = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type Props = {
  title: string;
  description: string;
  bullets: string[];
  actions?: Action[];
};

export default function ActionPanel({ title, description, bullets, actions = [] }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.bullets}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
            <Text style={styles.bullet}>{bullet}</Text>
          </View>
        ))}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => {
            const primary = action.variant !== 'secondary';
            return (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionButton, primary ? styles.actionPrimary : styles.actionSecondary]}
                onPress={action.onPress}
              >
                <Text style={[styles.actionText, primary ? styles.actionTextPrimary : styles.actionTextSecondary]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    panel: {
      flex: 1,
      minWidth: 320,
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      padding: 18,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    description: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 8,
    },
    bullets: {
      marginTop: 12,
      gap: 8,
    },
    actions: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    actionButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
    },
    actionPrimary: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    actionSecondary: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '800',
    },
    actionTextPrimary: {
      color: colors.white,
    },
    actionTextSecondary: {
      color: colors.text,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginTop: 6,
    },
    bullet: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}
