# MyHouse

MyHouse est une plateforme de gestion de residence qui regroupe :
- application mobile Android Expo / React Native
- application web Expo
- shell bureau Electron pour Windows
- backend Spring Boot avec PostgreSQL

## Contenu du depot
- `src` : logique applicative frontend
- `android` : projet Android natif pour les builds release
- `backend` : API Spring Boot, securite JWT, migrations Flyway
- `desktop-shell` : emballage Electron du client web
- `scripts` : scripts de build et de preparation
- `DEPLOY_SERVER.md` : guide de deploiement serveur

## Prerequis
- Node.js 18+
- Java JDK 17
- PostgreSQL 14+
- Android SDK pour les builds APK

## Configuration rapide
### Frontend
Creer ou adapter le fichier `.env.production` :

```env
EXPO_PUBLIC_API_BASE_URL=https://api.myhouse.cm
```

### Backend
Utiliser `backend/.env.production.example` comme base pour la configuration serveur.

## Lancement en developpement
### Frontend Expo
```bash
npm install
npm run start
```

### Web
```bash
npm run web
```

### Desktop
```bash
npm install --prefix .\desktop-shell
npm run web
npm run desktop:remote
```

### Backend
Sous Windows :
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

## Build production
### Web
```bash
npm install
npm run web:prod
```

### Android APK
```bash
npm install
npm run android:release
```

APK attendue :
`dist/android/MyHouse-1.0.1-release.apk`

### Desktop Windows
```bash
npm install --prefix .\desktop-shell
npm run web:prod
npm --prefix .\desktop-shell run dist:win
```

### Backend jar
Sous Windows :
```powershell
cd backend
.\mvnw.cmd clean package
```

## Deploiement
Le guide detaille se trouve ici :
- `DEPLOY_SERVER.md`

Architecture recommandee :
- `https://app.myhouse.cm` pour le frontend web
- `https://api.myhouse.cm` pour l API backend
- HTTPS obligatoire en production

## Securite
Ne jamais versionner :
- mots de passe production
- fichiers `.env` contenant des secrets reels
- `android/keystore.properties`
- fichiers `.jks`

## GitHub
Depot principal :
- https://github.com/blacking237/MyHouse
