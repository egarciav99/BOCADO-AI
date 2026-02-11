<div align="center">

# 🥗 Bocado AI

## Guía Nutricional Inteligente

Recomendaciones personalizadas con IA, geolocalización para comer fuera y experiencia PWA offline.

![Vercel Deployment](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)

</div>

---

## ✨ ¿Qué es Bocado AI?

Bocado AI es una app web que adapta recomendaciones nutricionales al perfil de cada usuario. Combina:

- Perfil de salud y preferencias
- Generación de recomendaciones con IA (Gemini)
- Búsqueda de opciones fuera de casa con Google Maps vía proxy seguro
- Soporte PWA y experiencia offline

## 🧭 Navegación rápida

- [Inicio rápido](#-inicio-rápido)
- [Stack actual](#-stack-actual)
- [Variables de entorno](#-variables-de-entorno)
- [Scripts disponibles](#-scripts-disponibles)
- [API](#-endpoints-api)
- [Tests](#-e2e)
- [Despliegue](#-despliegue)
- [Docs relacionadas](#-documentación-relacionada)

## 🚀 Highlights

| Feature | Descripción |
|---|---|
| Recomendaciones IA | Motor de recomendaciones con Gemini |
| Seguridad de APIs | `GOOGLE_MAPS_API_KEY` protegida con `/api/maps-proxy` |
| UX móvil | PWA instalable con fallback offline |
| Calidad de código | Unit tests (Vitest), E2E (Playwright), Storybook |
| Escalabilidad | Backend serverless con Vercel Functions |

## 🛠️ Stack actual

- Frontend: React 19 + TypeScript + Vite
- Estado/datos: Zustand + TanStack Query
- UI: Tailwind CSS
- Backend HTTP: Vercel Functions (`/api/recommend`, `/api/maps-proxy`)
- Base de datos y auth: Firebase (Auth + Firestore)
- IA: Google Gemini
- Observabilidad: Sentry (opcional)
- Tests: Vitest + Playwright
- Storybook: Storybook 10

## 📋 Requisitos

- Node.js 20 (recomendado)
- npm
- Proyecto Firebase configurado
- Variables de entorno configuradas

## ⚡ Inicio rápido

```bash
npm install
npm run dev
```

App local: `https://bocado-ai.vercel.app`

## 🔐 Variables de entorno

### Frontend (`.env.local`)

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=

# Opcionales
VITE_SENTRY_DSN=
VITE_APP_VERSION=local
VITE_REGISTER_USER_URL=
```

### Backend Vercel (Project Settings > Environment Variables)

```bash
FIREBASE_SERVICE_ACCOUNT_KEY=
GOOGLE_MAPS_API_KEY=
GEMINI_API_KEY=

# Opcionales (si se usa Airtable)
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=
AIRTABLE_API_KEY=
```

Notas:
- `FIREBASE_SERVICE_ACCOUNT_KEY` debe contener el JSON completo de service account.
- No expongas `GOOGLE_MAPS_API_KEY` en frontend. Usa siempre `/api/maps-proxy`.

## 📜 Scripts disponibles

### Desarrollo y build

- `npm run dev`: inicia Vite (puerto 3000)
- `npm run build`: build de producción en `dist/`
- `npm run preview`: previsualiza build

### Tests

- `npm run test`: unit tests (Vitest)
- `npm run test:ui`: Vitest UI
- `npm run test:coverage`: cobertura
- `npm run test:e2e`: E2E Playwright
- `npm run test:e2e:ui`: E2E interactivo
- `npm run test:e2e:debug`: E2E debug
- `npm run test:e2e:headed`: E2E con navegador visible
- `npm run test:e2e:install-deps`: deps del sistema para Chromium
- `npm run test:e2e:install-browsers`: instala browsers Playwright

### UI y utilidades

- `npm run storybook`: Storybook local (`:6006`)
- `npm run build-storybook`: build de Storybook
- `npm run generate-icons`: genera iconos PWA

## 🌐 Endpoints API

### `POST /api/recommend`

Genera recomendación nutricional/restaurante. Payload validado con Zod.

### `GET /api/recommend`

Devuelve estado de rate limiting para el usuario autenticado (Bearer token).

### `POST /api/maps-proxy`

Proxy de Google Maps con validación y rate limit. Acciones:

- `autocomplete`
- `placeDetails`
- `geocode`
- `reverseGeocode`
- `detectLocation`

## ☁️ Firebase Functions (opcional)

La carpeta `functions/` incluye tareas programadas de mantenimiento (cleanup/archivado).

```bash
cd functions
npm install
npm run serve
npm run deploy
```

Config raíz Firebase:
- reglas: `firestore.rules`
- índices: `firestore.indexes.json`

## 🧪 E2E

- Configuración: `playwright.config.ts`
- Variables de test ejemplo: `e2e/.env.test`
- Guía detallada: `e2e/README.md`

## 📱 PWA/offline

- Workbox: `vite.config.ts`
- Fallback offline: `public/offline.html`
- Detalle técnico: `docs/PWA_OFFLINE_SETUP.md`

## 🗂️ Estructura principal

```text
src/            Frontend React
api/            Vercel Functions
functions/      Firebase Cloud Functions programadas
e2e/            Pruebas Playwright
docs/           Documentación funcional/técnica
scripts/        Scripts de soporte (esbuild, iconos, CI)
```

## 🚢 Despliegue

### Frontend + API (Vercel)

1. Configura variables de entorno en Vercel.
2. Conecta el repositorio y despliega.
3. Verifica rutas:
   - `/api/recommend`
   - `/api/maps-proxy`

### Firebase

1. Configura proyecto Firebase.
2. Publica reglas e índices:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

3. (Opcional) despliega `functions/`.

## 📚 Documentación relacionada

- `docs/03-tecnico/arquitectura.md`
- `docs/03-tecnico/modelo-datos.md`
- `docs/FEATURE_FLAGS.md`
- `docs/UI_COMPONENTS.md`
- `docs/05-ops/deploy-checklist.md`

---

<div align="center">
Hecho para escalar producto, no solo prototipos.
</div>
