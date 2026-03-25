# MyHouse Deploy Guide

## 1. Push the code to GitHub
1. Create a GitHub repository named `MyHouse` under `blacking237` if it does not already exist.
2. Push the `main` branch:

```bash
git init
git branch -M main
git remote add origin https://github.com/blacking237/MyHouse.git
git add .
git commit -m "Initial deployment-ready project"
git push -u origin main
```

## 2. Deploy the frontend on Vercel
1. Sign in to Vercel with `martialtankouanjanga@gmail.com`.
2. Click `Add New Project`.
3. Import `blacking237/MyHouse` from GitHub.
4. Keep the root directory as the repository root.
5. Set the build settings:

```text
Framework Preset: Other
Install Command: npm install
Build Command: npm run web:prod
Output Directory: dist
```

6. Add this environment variable in Vercel:

```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

7. Deploy the project.
8. After the first deployment, note the public URL, for example:

```text
https://myhouse.vercel.app
```

## 3. Deploy the backend on Render
1. Sign in to Render and connect the GitHub repository `blacking237/MyHouse`.
2. Create a new `Blueprint` service or `Web Service` from the repo.
3. Render will detect `render.yaml` at the repository root.
4. Confirm that the backend service uses:

```text
Docker Context: ./backend
Dockerfile: ./backend/Dockerfile
```

5. Add the required environment variables in Render:

```env
SPRING_PROFILES_ACTIVE=production
PORT=8080
APP_CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-APP.vercel.app
DB_URL=jdbc:postgresql://YOUR-NEON-HOST/YOUR_DB?sslmode=require
DB_USERNAME=YOUR_NEON_USER
DB_PASSWORD=YOUR_NEON_PASSWORD
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_ACCESS_SECONDS=900
JWT_REFRESH_SECONDS=2592000
RECOVERY_ADMIN_CODE=YOUR_RECOVERY_CODE
RECOVERY_CODE_TTL_MINUTES=15
RECOVERY_MAIL_ENABLED=true
RECOVERY_MAIL_FROM=no-reply@your-domain.com
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=YOUR_SMTP_USERNAME
MAIL_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
RESET_DEFAULT_ADMIN_ON_STARTUP=false
```

6. Deploy the backend and wait for Render to expose a URL like:

```text
https://myhouse-api.onrender.com
```

7. Update the Vercel variable `EXPO_PUBLIC_API_BASE_URL` with that final Render URL.

## 4. Create the PostgreSQL database on Neon
1. Sign in to https://neon.tech
2. Create a new project named `MyHouse`.
3. Create a PostgreSQL database, for example `neondb`.
4. Copy the connection details from Neon:
   - host
   - database name
   - username
   - password
   - SSL requirement
5. Convert the Neon connection string into Spring format:

```text
jdbc:postgresql://HOST/DATABASE?sslmode=require
```

Example:

```text
jdbc:postgresql://ep-cool-sky-a1b2c3d4-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

6. Put `DB_URL`, `DB_USERNAME` and `DB_PASSWORD` into Render.

## 5. Configure environment variables
Use `.env.example` as the reference list.

### Vercel
```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

### Render
```env
APP_CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-APP.vercel.app
DB_URL=jdbc:postgresql://YOUR-NEON-HOST/YOUR_DB?sslmode=require
DB_USERNAME=YOUR_NEON_USER
DB_PASSWORD=YOUR_NEON_PASSWORD
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=YOUR_SMTP_USERNAME
MAIL_PASSWORD=YOUR_SMTP_PASSWORD
```

## 6. Final checks
After deployment, verify:
- backend health endpoint: `/actuator/health`
- login works from the Vercel frontend
- no browser CORS error appears
- Neon migrations run correctly
- resident creation, month settings, payments and OCR still work
