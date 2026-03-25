import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type DetailRow = {
  label: string;
  value: string;
};

type DetailAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  rows: DetailRow[];
  actions?: DetailAction[];
  onClose: () => void;
};

export default function DetailModal({
  visible,
  title,
  subtitle,
  rows,
  actions = [],
  onClose,
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            {rows.map((row) => (
              <View key={`${row.label}-${row.value}`} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </ScrollView>

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
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(5, 16, 28, 0.58)',
    },
    card: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '88%',
      borderRadius: 24,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
      paddingHorizontal: 22,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCopy: {
      flex: 1,
      gap: 6,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
    },
    closeButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    closeText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    content: {
      maxHeight: 420,
    },
    contentInner: {
      padding: 22,
      gap: 12,
    },
    row: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.inputBg,
      gap: 6,
    },
    rowLabel: {
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    rowValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingHorizontal: 22,
      paddingVertical: 18,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
  });
}
