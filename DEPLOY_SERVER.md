# MyHouse - Guide de deploiement serveur

## 1. Contenu du dossier
Ce dossier contient uniquement les fichiers utiles pour redeployer :
- application mobile/web Expo
- shell bureau Electron
- backend Spring Boot
- scripts de build utiles
- modeles de deploiement dans `deploy/`

Les dossiers generes ont ete retires volontairement : `node_modules`, `target`, `build`, bases locales, logs et artefacts temporaires.

## 2. Prerequis serveur
- Node.js 18+
- Java JDK 17
- PostgreSQL 14+
- Nginx ou Apache en reverse proxy
- HTTPS actif avec un vrai certificat
- Windows Server ou Linux selon votre choix

## 3. Fichiers a renseigner
### Frontend
Copier `.env.production.example` vers `.env.production` si besoin, puis verifier :

```env
EXPO_PUBLIC_API_BASE_URL=https://api.myhouse.cm
```

### Backend
Copier `backend/.env.production.example` vers `backend/.env.production`, puis renseigner :
- acces PostgreSQL
- secret JWT
- SMTP
- integrations optionnelles

## 4. Reverse proxy
Des exemples Nginx sont fournis :
- `deploy/nginx/app.myhouse.cm.conf`
- `deploy/nginx/api.myhouse.cm.conf`

Architecture recommandee :
- `https://app.myhouse.cm` pour le frontend web
- `https://api.myhouse.cm` pour le backend Spring Boot

## 5. Build web
Depuis la racine :

```bash
npm install
npm run web:prod
```

Publier ensuite le contenu web exporte sur le serveur web.

## 6. Build Android release
Depuis la racine :

```bash
npm install
npm run android:release
```

APK attendue :
`dist/android/MyHouse-1.0.1-release.apk`

## 7. Build bureau Windows
```bash
npm install --prefix .\desktop-shell
npm run web:prod
npm --prefix .\desktop-shell run dist:win
```

## 8. Demarrage backend
### Windows
Script fourni :
`deploy/windows/start-backend.ps1`

### Linux
Script fourni :
`deploy/linux/start-backend.sh`

Ces scripts chargent `backend/.env.production`, construisent le jar, puis lancent le backend.

## 9. Verification finale
Verifier au minimum :
- ouverture de session
- creation resident
- parametres du mois
- paiements
- contrats
- OCR
- exports PDF/Excel
- acces mobile, web et bureau vers la meme API publique
