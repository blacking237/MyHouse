import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppRole } from '../../database/AuthContext';
import { useThemeColors } from '../../database/PreferencesContext';
import { ROLE_META } from '../../constants/myhouse';

type Props = {
  activeRole: AppRole;
  availableRoles: AppRole[];
  onSelectRole: (role: AppRole) => void;
  title: string;
  subtitle: string;
  sections?: { key: string; label: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }[];
  activeSectionKey?: string;
  onSelectSection?: (sectionKey: string) => void;
  children: React.ReactNode;
};

export default function ConsoleShell({
  activeRole,
  availableRoles,
  onSelectRole,
  title,
  subtitle,
  children,
}: Props) {
  void availableRoles;
  void onSelectRole;

  const colors = useThemeColors();
  const styles = createStyles(colors);
  const roleMeta = ROLE_META[activeRole];

  return (
    <View style={styles.page}>
      <View style={styles.topBand}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>MH</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>
              <Text style={styles.brandMy}>My</Text>
              <Text style={styles.brandHouse}>HOUSE</Text>
            </Text>
            <Text style={styles.brandCaption}>Application bureau</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Espace actif</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroText}>{subtitle}</Text>
          </View>

          <View style={styles.workspaceBadge}>
            <Ionicons
              name={roleMeta.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.workspaceBadgeText}>{roleMeta.shortLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {children}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: '#0E2540',
    },
    topBand: {
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 18,
      backgroundColor: '#102945',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(220, 148, 20, 0.24)',
      gap: 18,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandMark: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(220, 148, 20, 0.5)',
      backgroundColor: '#173556',
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandMarkText: {
      color: '#F4C44E',
      fontSize: 21,
      fontWeight: '800',
    },
    brandCopy: {
      flex: 1,
      marginLeft: 14,
      gap: 2,
    },
    brand: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    brandMy: {
      color: '#7B61FF',
    },
    brandHouse: {
      color: '#F4C44E',
    },
    brandCaption: {
      color: '#D6E3F3',
      fontSize: 13,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(79, 131, 186, 0.55)',
      backgroundColor: '#122E4D',
      padding: 22,
    },
    heroCopy: {
      flex: 1,
      gap: 6,
    },
    heroEyebrow: {
      color: '#F4C44E',
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '800',
    },
    heroText: {
      color: '#D6E3F3',
      fontSize: 15,
      lineHeight: 23,
      maxWidth: 860,
    },
    workspaceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.primary,
      alignSelf: 'flex-start',
    },
    workspaceBadgeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    content: {
      flex: 1,
    },
    contentInner: {
      padding: 22,
      gap: 18,
    },
  });
}
