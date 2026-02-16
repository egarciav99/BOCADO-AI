# 🚀 Configuración de Variables de Entorno en Vercel

## Tabla de Resumen

| Variable | Dónde obtenerla | Ejemplo |
|----------|----------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Console > Settings | `AIzaSyC...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console > Settings | `proyecto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console > Settings | `proyecto-123` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console > Settings | `proyecto.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console > Settings | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase Console > Settings | `1:123:web:abc` |
| `VITE_FIREBASE_VAPID_KEY` | Firebase Console > Cloud Messaging | `BPx...` |
| `VITE_REGISTER_USER_URL` | Tu backend/función | `https://...` |

## Paso a Paso: Vercel Dashboard

### 1. Accede a tu proyecto en Vercel
```
https://vercel.com/[tu-usuario]/[tu-proyecto]
```

### 2. Ve a Settings
```
Dashboard > Tu Proyecto > Settings (tab superior)
```

### 3. Environment Variables (menú lateral izquierdo)
```
Settings > Environment Variables
```

### 4. Agregar cada variable
Para cada variable de la tabla:

1. Click en **"Add New"**
2. **Key:** `VITE_FIREBASE_API_KEY` (copia exactamente)
3. **Value:** Pega tu valor real (sin comillas)
4. **Environment:** Selecciona todos:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click en **"Save"**

Repite para las 8 variables.

### 5. Redeploy (si ya tienes deploys)
```
Deployments > Click en el más reciente > ⋯ (tres puntos) > Redeploy
```

O simplemente haz un nuevo `git push` para trigger un deploy automático.

## Verificación Post-Deploy

### En la consola del navegador (en tu sitio desplegado):
```javascript
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});
```

Deberías ver tus valores (es normal, Firebase client keys son públicas).

## CLI Alternativo (Opcional)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link tu proyecto (si no lo has hecho)
vercel link

# Agregar variables una por una
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_API_KEY preview
vercel env add VITE_FIREBASE_API_KEY development

# O importar desde archivo (requiere formato especial)
vercel env pull .env.production
```

## Seguridad

### ✅ Buenas Prácticas

1. **Firebase Security Rules**: Protege tu base de datos
2. **API Key Restrictions**: En Firebase Console > Credentials
   - Agrega tu dominio de Vercel a HTTP referrers
   - Ejemplo: `*.vercel.app`, `tudominio.com`

3. **Secrets sensibles**: Variables como API keys de backend
   - NO uses prefijo `VITE_` (no se exponen al cliente)
   - Ejemplo: `API_SECRET_KEY`

### 🔒 ¿Qué es público y qué es privado?

```javascript
// ✅ PÚBLICO (prefijo VITE_) - Se incluye en el bundle del cliente
VITE_FIREBASE_API_KEY=abc123    // OK, Firebase está diseñado así

// 🔒 PRIVADO (sin prefijo VITE_) - Solo disponible en build/server
STRIPE_SECRET_KEY=sk_live_...   // Nunca en el cliente
DATABASE_PASSWORD=supersecret   // Nunca en el cliente
```

## Troubleshooting

### Variables no se aplican después de agregar
- ✅ Solución: Redeploy el proyecto

### Error "undefined" en producción
- ✅ Verifica que el nombre sea exacto (case-sensitive)
- ✅ Verifica que tenga el prefijo `VITE_`
- ✅ Reinicia el build después de agregar variables

### Variables funcionan local pero no en Vercel
- ✅ Verifica que se agregaron en Vercel Dashboard
- ✅ Verifica que seleccionaste el environment correcto
- ✅ Redeploy el proyecto

## Scripts Útiles

```bash
# Ver todas las variables configuradas
vercel env ls

# Descargar las variables de producción
vercel env pull .env.production

# Remover una variable
vercel env rm VITE_OLD_VARIABLE production
```

## Referencias

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Env Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
