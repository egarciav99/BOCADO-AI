# Pre-Launch

<aside>
🚀

**Pre-Launch** — checklist final antes de producción.

- *Estado:* listo, falta verificación post-deploy
- *Fecha:* 2026-02-10
- *Commit:* Pre-launch fixes complete
</aside>

## ✅ Deal-breakers resueltos

<aside>
🛡️

**Todo lo crítico para lanzar ya está corregido.**

</aside>

### 1) Rate Limiting fail-closed

**Archivo:** `api/utils/rateLimit.ts`

- Cambiado de *fail-open* a *fail-closed*.
- Ahora rechaza requests si Firestore falla.

### 2) Fix de `useRateLimit` hook

**Archivo:** `src/hooks/useRateLimit.ts`

- Fix de memory leak (línea 77).
- `useMemo` para `formattedTimeLeft`.
- `useMemo` para `message`.

### 3) Prevención de memory leak en paginación

**Archivo:** `src/hooks/usePaginatedFirestoreQuery.ts`

- Límite máximo de **500 items**.
- Evita crecimiento indefinido del array.

### 4) Consistencia de CORS

**Archivo:** `api/maps-proxy.ts`

- Agregados orígenes `127.0.0.1` faltantes.
- Métodos permitidos estandarizados.

### 5) Tests para API (Zod + rate limiting)

**Archivo:** `api/__tests__/validation.test.ts` *(nuevo)*

- Tests de validación Zod.
- Tests de constantes de rate limiting.
- **8 nuevos tests** pasando.

### 6) Firestore indexes

**Archivo:** `firestore.indexes.json`

- `rate_limit_v2 (updatedAt)`
- `ip_rate_limits (updatedAt)`
- `user_interactions (userId + createdAt)`
- `user_interactions (status + createdAt)`

### 7) Firestore rules

**Archivo:** `firestore.rules`

- Colecciones de rate limiting protegidas (solo Admin SDK).
- Cache de maps proxy protegido.
- `ip_rate_limits` protegido.

### 8) Documentación de Sentry

**Archivo:** `docs/SENTRY_SETUP.md` *(nuevo)*

- Guía completa de configuración.
- Variables de entorno.
- Verificación post-deploy.

---

## 🧪 Tests status

```
✓ api/__tests__/validation.test.ts (8 tests)
✓ src/test/schemas.test.ts (8 tests)
✓ src/test/utils.test.ts (5 tests)

Test Files  3 passed (3)
     Tests  21 passed (21)
```

## 🏗️ Build status

```
✓ TypeScript compilation: OK
✓ Vite build: OK
✓ PWA generation: OK
```

---

## 🚀 Deploy

### Comandos

```bash
# 1. Deploy Firestore indexes
firebase deploy --only firestore:indexes

# 2. Deploy Firestore rules
firebase deploy --only firestore:rules

# 3. Deploy Cloud Functions
firebase deploy --only functions

# 4. Deploy to Vercel
vercel --prod
```

---

## 🔎 Post-deploy verification (manual)

- [ ]  Registro de usuario nuevo funciona
- [ ]  Login funciona
- [ ]  Generar recomendación "En casa" funciona
- [ ]  Generar recomendación "Fuera" funciona
- [ ]  Rate limit funciona (esperar 30s entre requests)
- [ ]  Búsqueda de ciudades en perfil funciona (vía proxy)
- [ ]  Sentry recibe errores (forzar un error de prueba)

---

## 🔐 Variables de entorno requeridas

### Vercel (Frontend + API)

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_SENTRY_DSN=          # Opcional pero recomendado

# Backend
FIREBASE_SERVICE_ACCOUNT_KEY=
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=
```

---

<aside>
✅

**Listo para launch** cuando completes la verificación post-deploy.

</aside>