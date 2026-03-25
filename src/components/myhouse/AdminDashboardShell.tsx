import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';
import KpiTile from './KpiTile';
import SectionHeader from './SectionHeader';

type AdminKpi = { value: string; label: string; hint?: string };
type AdminAction = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' };

export default function AdminDashboardShell({
  title,
  description,
  kpis,
  actions,
}: {
  title: string;
  description: string;
  kpis: AdminKpi[];
  actions: AdminAction[];
}) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionHeader eyebrow="Administration" title={title} description={description} />
      <View style={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <KpiTile key={kpi.label} value={kpi.value} label={kpi.label} hint={kpi.hint ?? ''} />
        ))}
      </View>
      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionButton, action.variant === 'secondary' && styles.actionSecondary]}
            onPress={action.onPress}
          >
            <Text style={action.variant === 'secondary' ? [styles.actionText, styles.actionTextSecondary] : styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      padding: 24,
      gap: 18,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    actionSecondary: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: {
      color: colors.white,
      fontWeight: '800',
    },
    actionTextSecondary: {
      color: colors.text,
    },
  });
}
