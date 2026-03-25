# MyHouse - Guide de deploiement serveur

## 1. Contenu du dossier
Ce dossier contient uniquement les fichiers utiles pour redeployer :
- application mobile/web Expo
- shell bureau Electron
- backend Spring Boot
- scripts de build utiles

Les dossiers generes ont ete retires volontairement : `node_modules`, `target`, `build`, bases locales, logs et artefacts temporaires.

## 2. Prerequis serveur
- Node.js 18+
- Java JDK 17
- PostgreSQL 14+
- Nginx ou Apache en reverse proxy
- HTTPS actif avec un vrai certificat
- Windows Server ou Linux selon votre choix

## 3. Configuration frontend
Renseigner le fichier `.env.production` a la racine :

```env
EXPO_PUBLIC_API_BASE_URL=https://api.myhouse.cm
```

Cette URL doit etre l URL publique definitive du backend.

## 4. Configuration backend
Copier `backend/.env.production.example` vers un vrai fichier d environnement serveur puis renseigner :
- acces PostgreSQL
- secret JWT
- SMTP
- integrations optionnelles (Flutterwave, WhatsApp, SendGrid, Expo Push)

## 5. Demarrage backend
Depuis `backend` :

### Windows
```powershell
.\mvnw.cmd spring-boot:run
```

### Linux
```bash
./mvnw spring-boot:run
```

Pour produire un jar :

### Windows
```powershell
.\mvnw.cmd clean package
```

### Linux
```bash
./mvnw clean package
java -jar target/ambercity-backend-0.0.1-SNAPSHOT.jar
```

## 6. Build web
Depuis la racine du projet :

```bash
npm install
npm run web:prod
```

Publier ensuite le contenu exporte sur votre hebergement web ou derriere Nginx.

## 7. Build Android release
Depuis la racine du projet :

```bash
npm install
npm run android:release
```

APK attendue :
`dist/android/MyHouse-1.0.1-release.apk`

## 8. Build bureau Windows
Installer d abord les dependances du shell Electron :

```bash
npm install --prefix .\desktop-shell
npm run web:prod
npm --prefix .\desktop-shell run dist:win
```

## 9. Reverse proxy recommande
- `https://app.myhouse.cm` vers l application web
- `https://api.myhouse.cm` vers le backend Spring Boot
- activer CORS uniquement pour les domaines frontend autorises
- ne jamais laisser `localhost` ou `10.0.2.2` en production

## 10. Verification finale
Verifier au minimum :
- ouverture de session
- creation resident
- parametres du mois
- paiements
- contrats
- OCR
- exports PDF/Excel
- acces mobile, web et bureau vers la meme API publique
