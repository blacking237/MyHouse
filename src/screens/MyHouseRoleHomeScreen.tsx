import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { type AppRole, useAuth } from '../database/AuthContext';
import { useThemeColors } from '../database/PreferencesContext';

type QuickAction = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route?: string;
  description: string;
};

const ROLE_COPY: Record<AppRole, { title: string; subtitle: string; actions: QuickAction[] }> = {
  tenant: {
    title: 'Espace RESIDENT',
    subtitle: 'Factures, paiements, contrat et suivi de votre logement.',
    actions: [
      { label: 'Mes factures', icon: 'document-text-outline', route: 'Factures', description: 'Consulter les factures et echeances.' },
      { label: 'Mes paiements', icon: 'card-outline', route: 'Paiements', description: 'Suivre les paiements et recus.' },
      { label: 'Mon profil', icon: 'person-circle-outline', route: 'Profil', description: 'Mettre a jour vos informations.' },
    ],
  },
  concierge: {
    title: 'Espace CONCIERGE',
    subtitle: 'Operations terrain, relevés, diffusions et tickets.',
    actions: [
      { label: 'Operations', icon: 'speedometer-outline', route: 'Dashboard', description: 'Saisir les index et piloter les factures.' },
      { label: 'Residents', icon: 'people-outline', route: 'Residents', description: 'Voir les residents actifs et leurs chambres.' },
      { label: 'Diffusion', icon: 'megaphone-outline', route: 'Messages', description: 'Envoyer des messages groupe.' },
    ],
  },
  manager: {
    title: 'Espace GESTIONNAIRE',
    subtitle: 'Pilotage des logements, residents, loyers et rapports.',
    actions: [
      { label: 'Dashboard', icon: 'grid-outline', route: 'Dashboard', description: 'Vue d ensemble de votre activite.' },
      { label: 'Logements', icon: 'home-outline', route: 'Logements', description: 'Gerer les chambres et logements.' },
      { label: 'Rapports', icon: 'stats-chart-outline', route: 'Factures', description: 'Suivre factures, index et indicateurs.' },
    ],
  },
  adminCommercial: {
    title: 'ADMIN_COMMERCIAL',
    subtitle: 'Souscriptions, equipe et pipeline commercial.',
    actions: [
      { label: 'Pipeline', icon: 'golf-outline', description: 'Suivi des prospects et validations.' },
      { label: 'Equipe', icon: 'people-circle-outline', description: 'Encadrer les commerciaux par zone.' },
      { label: 'Licences', icon: 'ribbon-outline', description: 'Suivre les activations et renouvellements.' },
    ],
  },
  adminSav: {
    title: 'ADMIN_SAV',
    subtitle: 'Tickets support, satisfaction et ameliorations produit.',
    actions: [
      { label: 'Tickets', icon: 'construct-outline', description: 'Trier et assigner les tickets.' },
      { label: 'KPIs', icon: 'pulse-outline', description: 'Suivre NPS, delais et volume SAV.' },
      { label: 'Qualite', icon: 'sparkles-outline', description: 'Prioriser les ameliorations UX.' },
    ],
  },
  adminJuridique: {
    title: 'ADMIN_JURIDIQUE',
    subtitle: 'Contrats types, conformite et alertes legales.',
    actions: [
      { label: 'Contrats', icon: 'document-lock-outline', description: 'Valider les modeles par pays.' },
      { label: 'Alertes', icon: 'warning-outline', description: 'Suivre les obligations de conformite.' },
      { label: 'Pays', icon: 'globe-outline', description: 'Adapter les regles juridiques CEMAC.' },
    ],
  },
  adminCompta: {
    title: 'ADMIN_COMPTA',
    subtitle: 'Revenus, TVA, exports et reconciliation financiere.',
    actions: [
      { label: 'Revenus', icon: 'cash-outline', description: 'Suivre les flux par pays.' },
      { label: 'TVA', icon: 'calculator-outline', description: 'Controler les taux et montants collectes.' },
      { label: 'Exports', icon: 'download-outline', description: 'Generer rapports PDF et Excel.' },
    ],
  },
  superAdmin: {
    title: 'SUPER_ADMIN',
    subtitle: 'Pilotage global MyHouse: equipe, licences, revenus et parametres.',
    actions: [
      { label: 'KPIs', icon: 'bar-chart-outline', description: 'Voir la performance globale CEMAC.' },
      { label: 'Equipe', icon: 'people-outline', description: 'Creer et encadrer les admins.' },
      { label: 'Parametres', icon: 'settings-outline', route: 'Profil', description: 'Ajuster tarifs, TVA et commissions.' },
    ],
  },
};

export default function MyHouseRoleHomeScreen() {
  const navigation = useNavigation<any>();
  const { activeRole } = useAuth();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const copy = ROLE_COPY[activeRole];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MyHouse</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {copy.actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={styles.card}
          onPress={() => action.route && navigation.navigate(action.route)}
          disabled={!action.route}
        >
          <View style={styles.cardIcon}>
            <Ionicons name={action.icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{action.label}</Text>
            <Text style={styles.cardDescription}>{action.description}</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={colors.textLight} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: SIZES.padding,
      gap: 14,
    },
    hero: {
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 2,
      padding: SIZES.padding * 1.25,
      marginTop: 8,
    },
    eyebrow: {
      color: colors.secondary,
      fontSize: SIZES.sm,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 8,
    },
    subtitle: {
      color: colors.textLight,
      fontSize: SIZES.md,
      marginTop: 8,
      lineHeight: 20,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.cardBg,
      borderRadius: SIZES.radius * 1.5,
      padding: SIZES.padding,
    },
    cardIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBg,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      color: colors.text,
      fontSize: SIZES.lg,
      fontWeight: '700',
    },
    cardDescription: {
      color: colors.textLight,
      fontSize: SIZES.sm,
      marginTop: 3,
    },
  });
}
