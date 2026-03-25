import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { type AppRole, useAuth } from '../database/AuthContext';

import DashboardScreen from '../screens/DashboardScreen';
import RoomsScreen from '../screens/RoomsScreen';
import InvoiceCalcScreen from '../screens/InvoiceCalcScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import IndexEntryScreen from '../screens/IndexEntryScreen';
import WhatsAppSendScreen from '../screens/WhatsAppSendScreen';
import WhatsAppBroadcastScreen from '../screens/WhatsAppBroadcastScreen';
import MonthConfigScreen from '../screens/MonthConfigScreen';
import MyHouseRoleHomeScreen from '../screens/MyHouseRoleHomeScreen';
import MyHousePlaceholderScreen from '../screens/MyHousePlaceholderScreen';
import TenantMobileScreen from '../screens/TenantMobileScreen';
import DesktopRoleScreen from '../screens/desktop/DesktopRoleScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

type TabSpec = {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  component: React.ComponentType<any>;
};

function createPlaceholder(title: string, description: string) {
  return function PlaceholderWrapper() {
    return <MyHousePlaceholderScreen title={title} description={description} />;
  };
}

function RoleHubStack() {
  const colors = useThemeColors();
  const { activeRole } = useAuth();

  const titles: Record<AppRole, string> = {
    tenant: 'Accueil locataire',
    concierge: 'Dashboard concierge',
    manager: 'Dashboard gestionnaire',
    adminCommercial: 'Dashboard commercial',
    adminSav: 'Dashboard SAV',
    adminJuridique: 'Dashboard juridique',
    adminCompta: 'Dashboard comptabilite',
    superAdmin: 'Dashboard global',
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="RoleHome" component={MyHouseRoleHomeScreen} options={{ title: titles[activeRole] }} />
      <Stack.Screen name="IndexEntry" component={IndexEntryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InvoiceCalc" component={InvoiceCalcScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WhatsAppSend" component={WhatsAppSendScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WhatsAppBroadcast" component={WhatsAppBroadcastScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function OperationsStack() {
  const colors = useThemeColors();
  const { t } = usePreferences();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: t('meterTrackTitle') }} />
      <Stack.Screen name="IndexEntry" component={IndexEntryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InvoiceCalc" component={InvoiceCalcScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WhatsAppSend" component={WhatsAppSendScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WhatsAppBroadcast" component={WhatsAppBroadcastScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const colors = useThemeColors();
  const { t } = usePreferences();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: t('settings'), headerShown: false }} />
      <Stack.Screen name="MonthConfig" component={MonthConfigScreen} options={{ title: t('monthConfig'), headerShown: false }} />
    </Stack.Navigator>
  );
}

function TenantInvoicesScreen() {
  return <TenantMobileScreen initialSection="billing" />;
}

function TenantPaymentsScreen() {
  return <TenantMobileScreen initialSection="payments" />;
}

function getTabsByRole(role: AppRole): TabSpec[] {
  switch (role) {
    case 'tenant':
      return [
        { name: 'Accueil', title: 'Accueil', icon: 'home-outline', component: RoleHubStack },
        { name: 'Factures', title: 'Factures', icon: 'document-text-outline', component: TenantInvoicesScreen },
        { name: 'Paiements', title: 'Paiements', icon: 'card-outline', component: TenantPaymentsScreen },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'concierge':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'grid-outline', component: RoleHubStack },
        { name: 'Operations', title: 'Operations', icon: 'speedometer-outline', component: OperationsStack },
        { name: 'Residents', title: 'Residents', icon: 'people-outline', component: RoomsScreen },
        { name: 'Messages', title: 'Messages', icon: 'megaphone-outline', component: WhatsAppBroadcastScreen },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'manager':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'grid-outline', component: RoleHubStack },
        { name: 'Logements', title: 'Logements', icon: 'home-outline', component: RoomsScreen },
        { name: 'Factures', title: 'Factures', icon: 'calculator-outline', component: OperationsStack },
        { name: 'Paiements', title: 'Paiements', icon: 'cash-outline', component: PaymentsScreen },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'adminCommercial':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'bar-chart-outline', component: RoleHubStack },
        { name: 'Equipe', title: 'Equipe', icon: 'people-outline', component: createPlaceholder('Equipe commerciale', 'Cette interface gerera les commerciaux, quotas, zones et performances.') },
        { name: 'Pipeline', title: 'Pipeline', icon: 'golf-outline', component: createPlaceholder('Pipeline commercial', 'Cette vue affichera les prospects, demos, validations et souscriptions.') },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'adminSav':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'bar-chart-outline', component: RoleHubStack },
        { name: 'Tickets', title: 'Tickets', icon: 'construct-outline', component: createPlaceholder('Tickets SAV', 'La console SAV centralisera les incidents, priorites et SLA.') },
        { name: 'KPIs', title: 'KPIs', icon: 'pulse-outline', component: createPlaceholder('KPIs satisfaction', 'Cette vue suivra NPS, resolution et adoption produit.') },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'adminJuridique':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'bar-chart-outline', component: RoleHubStack },
        { name: 'Contrats', title: 'Contrats', icon: 'document-lock-outline', component: createPlaceholder('Contrats types', 'Les modeles juridiques par pays seront centralises ici.') },
        { name: 'Alertes', title: 'Alertes', icon: 'warning-outline', component: createPlaceholder('Alertes legales', 'Cette vue suivra conformite, signatures et changements reglementaires.') },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'adminCompta':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'bar-chart-outline', component: RoleHubStack },
        { name: 'Revenus', title: 'Revenus', icon: 'cash-outline', component: createPlaceholder('Revenus', 'La vue finance suivra revenus, paiements et reconciliation.') },
        { name: 'TVA', title: 'TVA', icon: 'calculator-outline', component: createPlaceholder('TVA par pays', 'Les flux TVA CEMAC seront consolides et exportables.') },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    case 'superAdmin':
      return [
        { name: 'Dashboard', title: 'Dashboard', icon: 'bar-chart-outline', component: RoleHubStack },
        { name: 'Equipe', title: 'Equipe', icon: 'people-outline', component: createPlaceholder('Equipe MyHouse', 'Le Super Admin pilotera admins, quotas, zones et affectations.') },
        { name: 'Licences', title: 'Licences', icon: 'ribbon-outline', component: createPlaceholder('Licences et offres', 'Les plans MyHouse, quotas et activations seront administres ici.') },
        { name: 'Profil', title: 'Profil', icon: 'person-outline', component: SettingsStack },
      ];
    default:
      return [];
  }
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function AppNavigator() {
  const { themeMode } = usePreferences();
  const { activeRole } = useAuth();
  const colors = useThemeColors();
  const tabs = getTabsByRole(activeRole);

  const navTheme = themeMode === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.tabBg,
          text: colors.text,
          border: colors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.tabBg,
          text: colors.text,
          border: colors.border,
        },
      };

  if (Platform.OS === 'web') {
    return (
      <NavigationContainer theme={navTheme}>
        {activeRole === 'tenant' ? (
          <MyHousePlaceholderScreen
            title="Acces resident sur mobile uniquement"
            description="Pour des raisons de securite, l espace resident MyHouse est disponible uniquement dans l application mobile."
          />
        ) : (
          <DesktopRoleScreen />
        )}
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const current = tabs.find((tab) => tab.name === route.name);
            const iconName: IoniconsName = current?.icon ?? 'ellipse-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.disabled,
          tabBarStyle: {
            backgroundColor: colors.tabBg,
            borderTopColor: colors.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: SIZES.xs,
            fontWeight: '700',
          },
          headerShown: false,
        })}
      >
        {tabs.map((tab) => (
          <Tab.Screen
            key={`${activeRole}-${tab.name}`}
            name={tab.name}
            component={tab.component}
            options={{ title: tab.title }}
          />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
