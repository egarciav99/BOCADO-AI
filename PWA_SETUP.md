# 🥗 Bocado PWA (Progressive Web App)

Bocado ahora es una PWA completamente funcional que puede instalarse en cualquier dispositivo.

## ✅ Características Implementadas

### Funcionalidades PWA
- ✅ **Instalable**: Se puede agregar a la pantalla de inicio de cualquier dispositivo
- ✅ **Offline**: Funciona sin conexión (cache de assets y datos)
- ✅ **Responsive**: Adaptado para móviles y desktop
- ✅ **Update Detection**: Detecta cuando hay nuevas versiones disponibles
- ✅ **Offline Banner**: Muestra banner cuando no hay conexión
- ✅ **Install Banner**: Prompt nativo para instalar la app

### Caché Implementado
| Tipo | Estrategia | Duración |
|------|------------|----------|
| Assets (JS/CSS/HTML) | Precache | Versión actual |
| Imágenes | Cache First | 30 días |
| Fuentes Google | Cache First | 1 año |
| API Geonames | Network First | 1 día |

## 📱 Cómo Instalar

### iOS (Safari)
1. Abre Bocado en Safari
2. Toca el botón "Compartir" (cuadrado con flecha)
3. Selecciona "Agregar a la pantalla de inicio"
4. Confirma con "Agregar"

### Android (Chrome)
1. Abre Bocado en Chrome
2. Toca el menú de 3 puntos
3. Selecciona "Agregar a la pantalla de inicio"
4. O espera el banner de instalación automático

### Desktop (Chrome/Edge)
1. Abre Bocado
2. Verás un icono de instalación en la barra de direcciones
3. Haz clic y selecciona "Instalar"

## 🔧 Configuración Técnica

### Archivos Generados
```
public/
├── manifest.json          # Configuración del PWA
├── icons/                 # Iconos en todos los tamaños
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── screenshots/           # Screenshots para la tienda

src/
├── components/
│   └── PWABanner.tsx      # Banner de notificaciones PWA
└── hooks/
    └── usePWA.ts          # Hook para funcionalidades PWA
```

### Plugin Vite PWA
```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [...]
  },
  manifest: { ... }
})
```

## 🎨 Personalización

### Colores
- **Theme Color**: `#4A7C59` (verde bocado)
- **Background**: `#FAFAF5` (crema)
- Modifica en `index.html` y `vite.config.ts`

### Iconos
Para regenerar los iconos con un diseño diferente:
```bash
npm run generate-icons
```

Edita `scripts/generate-pwa-icons.js` para cambiar el emoji o colores.

## 🔄 Actualizaciones

Cuando deployas una nueva versión:

1. El Service Worker detecta automáticamente la nueva versión
2. Se muestra un banner azul "Nueva versión disponible"
3. El usuario puede actualizar inmediatamente o continuar
4. Al actualizar, la página se recarga con la nueva versión

## 🧪 Testing

### En Desarrollo
```bash
npm run dev
```
El Service Worker está habilitado en desarrollo para testing.

### Verificar Instalación
1. Abre DevTools > Application > Manifest
2. Verifica que todos los campos estén correctos
3. Revisa los iconos en Application > Frames > Icons

### Verificar Service Worker
1. Abre DevTools > Application > Service Workers
2. Deberías ver `sw.js` activo
3. En "Cache Storage" verás los recursos cacheados

### Lighthouse Audit
```bash
# Generar build de producción
npm run build
npm run preview

# En Chrome, abre DevTools > Lighthouse
# Selecciona "PWA" y corre el audit
```

## 📊 Métricas Esperadas

Con Lighthouse deberías obtener:
- **PWA**: 100/100
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 100

## 🚨 Troubleshooting

### No aparece el banner de instalación
- Asegúrate de cumplir con todos los requisitos del manifest
- La app debe servirse sobre HTTPS
- Debe haber un Service Worker registrado

### Cambios no se reflejan
- El Service Worker cachea agresivamente
- Usa "Clear storage" en DevTools > Application
- O espera la notificación de nueva versión

### Iconos no se muestran
- Verifica que todos los tamaños estén generados
- Revisa que las rutas en manifest.json sean correctas
- Asegúrate de que los archivos estén en `public/icons/`

### App no funciona offline
- Verifica en DevTools > Network que esté marcado "Offline"
- Revisa Application > Cache Storage que haya entries
- El Service Worker puede tardar en activarse

## 📝 Notas de Implementación

### Auto-Update
El PWA usa `registerType: 'autoUpdate'` que:
- Registra el SW automáticamente
- Verifica actualizaciones cada vez que la app se carga
- Muestra notificación cuando hay nueva versión

### Estrategias de Caché
- **Precache**: Assets esenciales (JS/CSS/HTML)
- **Cache First**: Recursos estáticos (imágenes, fuentes)
- **Network First**: Datos dinámicos (API de ciudades)

### Limitaciones Offline
Algunas funciones requieren conexión:
- Generar nuevas recomendaciones (requiere API de Gemini)
- Autenticación (Firebase Auth requiere red)

Las funciones que funcionan offline:
- Ver recetas guardadas
- Ver perfil
- Editar despensa
- Navegar entre pantallas

## 🚀 Deployment

No se requiere configuración adicional para deployar. El PWA funciona automáticamente en:
- Vercel
- Netlify
- Firebase Hosting
- Cualquier hosting con HTTPS

```bash
# Deploy a Vercel
vercel --prod

# El PWA se activa automáticamente
```
