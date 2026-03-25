# MYHOUSE - Instructions de Build Mobile, Web et Bureau

## Prerequis

1. **Node.js** 18+ installe (https://nodejs.org)
2. **Java JDK 17** installe (https://adoptium.net)
3. **Android SDK** installe (via Android Studio)
   - Ouvrir Android Studio > SDK Manager
   - Installer: Android 14 (API 34), Android SDK Build-Tools, Android SDK Platform-Tools
4. **Variables d'environnement** configurees :
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk   # ou le chemin de votre SDK
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

## Installation du projet

```bash
# Decompresser l'archive
unzip metertrack-v1.0.zip
cd metertrack

# Installer les dependances
npm install
```

Le `postinstall` reapplique automatiquement les correctifs Android locaux necessaires a la build release dans cet environnement.

## Methode rapide MyHouse

```bash
npm run android:release
```

Cette commande :
- reapplique les correctifs Expo/React Native necessaires
- force `NODE_ENV=production`
- aligne Java, Android SDK et NDK
- verifie que le bundle JavaScript est bien embarque dans l APK release
- copie l APK finale prete a partager dans `dist/android/MyHouse-1.0.1-release.apk`

Important :
- ne partagez pas `android/app/build/outputs/apk/debug/app-debug.apk`
- si une APK affiche une erreur Metro ou `localhost:8081`, c est une build debug et non la release autonome

## Lancer la console web

```bash
npm run web
```

La console web MyHouse s ouvre sur l experience bureau multi-role et reutilise la meme base applicative que le mobile.

## Lancer le logiciel bureau

Premiere installation du shell Electron :

```bash
npm install --prefix .\desktop-shell
```

Mode developpement via le serveur web Expo :

```bash
npm run web
npm run desktop:remote
```

Mode bureau via une exportation web locale :

```bash
npm run web:prod
npm run desktop:local
```

Le shell bureau tente automatiquement, dans cet ordre :
- `MYHOUSE_WEB_URL`
- `dist/index.html`
- `web-build/index.html`
- `http://localhost:19006`

## Methode 1 : Build APK via Expo (Recommande)

```bash
# Installer expo-cli globalement si pas deja fait
npm install -g expo-cli

# Generer le dossier android natif
npx expo prebuild --platform android

# Aller dans le dossier android et builder l'APK
cd android
./gradlew assembleRelease

# L'APK sera genere dans :
# android/app/build/outputs/apk/release/app-release.apk
```

## Methode 2 : Build APK via EAS (si vous creez un compte Expo)

```bash
# Installer eas-cli
npm install -g eas-cli

# Se connecter a Expo
eas login

# Builder l'APK (profil preview = APK direct)
eas build --platform android --profile preview
```

Pour cette methode, ajoutez ceci dans votre `eas.json` (deja inclus) :
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## Methode 3 : Tester directement sur telephone

```bash
# Installer Expo Go sur votre telephone Android (Play Store)
# Puis lancer le serveur de dev :
npx expo start

# Scanner le QR code avec Expo Go
```

## Identifiants par defaut

- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

Vous pouvez changer le mot de passe dans Parametres > Changer le mot de passe.

## Structure du projet

```
metertrack/
├── App.tsx                          # Point d'entree
├── src/
│   ├── components/                  # Composants reutilisables
│   │   └── LoadingScreen.tsx
│   ├── constants/
│   │   └── theme.ts                 # Couleurs, tailles, polices
│   ├── database/
│   │   ├── schema.ts                # Schema SQLite (5 tables)
│   │   ├── DatabaseContext.tsx       # Provider base de donnees
│   │   └── AuthContext.tsx           # Authentification locale
│   ├── navigation/
│   │   └── AppNavigator.tsx          # Navigation par onglets
│   ├── screens/
│   │   ├── LoginScreen.tsx           # Ecran de connexion
│   │   ├── DashboardScreen.tsx       # Tableau de bord
│   │   ├── RoomsScreen.tsx           # Gestion des chambres
│   │   ├── IndexEntryScreen.tsx      # Saisie des index
│   │   ├── InvoiceCalcScreen.tsx     # Calcul des factures
│   │   ├── WhatsAppSendScreen.tsx    # Envoi WhatsApp
│   │   ├── PaymentsScreen.tsx        # Gestion des paiements
│   │   ├── MonthConfigScreen.tsx     # Configuration mensuelle
│   │   └── SettingsScreen.tsx        # Parametres + exports
│   └── services/
│       ├── InvoiceCalculationService.ts  # Moteur de calcul
│       ├── WhatsAppService.ts            # Integration WhatsApp
│       └── ExportService.ts              # Export Excel/CSV
├── assets/                          # Icones et splash screen
├── app.json                         # Configuration Expo
├── package.json                     # Dependances
└── tsconfig.json                    # Configuration TypeScript
```

## Notes importantes

- L'application fonctionne **100% hors-ligne** (base SQLite locale)
- La seule connexion externe est l'ouverture de **WhatsApp** pour envoyer les factures
- Toutes les donnees restent sur le telephone
- Compatible Android 8.0 (API 26) et superieur
