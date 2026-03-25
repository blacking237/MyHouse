import 'react-native-gesture-handler';
import React from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider, useDatabaseError, useDatabaseReady, useRetryDatabaseSetup } from './src/database/DatabaseContext';
import { AuthProvider, useAuth } from './src/database/AuthContext';
import { PreferencesProvider, usePreferences } from './src/database/PreferencesContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import LoadingScreen from './src/components/LoadingScreen';
import StartupErrorScreen from './src/components/StartupErrorScreen';
import UpgradePromptScreen from './src/components/UpgradePromptScreen';

function AppContent() {
  const isReady = useDatabaseReady();
  const databaseError = useDatabaseError();
  const retryDatabaseSetup = useRetryDatabaseSetup();
  const { isAuthenticated } = useAuth();
  const { needsUpgradePrompt, resolveUpgradePrompt } = usePreferences();

  React.useEffect(() => {
    if (!isReady || !needsUpgradePrompt) return;
    if (typeof document !== 'undefined') return;
    Alert.alert(
      'Mise a jour',
      'Souhaitez-vous conserver les anciennes donnees (chambres, index, factures, paiements) ?',
      [
        {
          text: 'Non, repartir a zero',
          style: 'destructive',
          onPress: () => { void resolveUpgradePrompt(false); },
        },
        {
          text: 'Oui, conserver',
          onPress: () => { void resolveUpgradePrompt(true); },
        },
      ],
      { cancelable: false }
    );
  }, [isReady, needsUpgradePrompt, resolveUpgradePrompt]);

  if (databaseError) {
    return (
      <StartupErrorScreen
        title="Demarrage incomplet"
        message={`La base locale MyHouse n a pas pu etre initialisee.\n\nDetail: ${databaseError}`}
        actionLabel="Reessayer"
        onAction={retryDatabaseSetup}
      />
    );
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (needsUpgradePrompt) {
    return (
      <UpgradePromptScreen
        title="Mise a jour MyHouse"
        message="Choisissez si vous voulez conserver les anciennes donnees locales avant de continuer."
        keepLabel="Oui, conserver"
        resetLabel="Non, repartir a zero"
        onKeep={() => { void resolveUpgradePrompt(true); }}
        onReset={() => { void resolveUpgradePrompt(false); }}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <PreferencesProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </PreferencesProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { themeMode } = usePreferences();
  return (
    <>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <AppContent />
    </>
  );
}
