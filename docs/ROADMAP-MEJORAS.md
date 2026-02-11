# Roadmap de Mejoras Técnicas

## 13. Service Worker / PWA (Prioridad: MEDIA)

### Estado Actual
- ✅ Firebase Messaging SW funciona (notificaciones push)
- ❌ No hay caching de assets para offline
- ❌ No hay estrategia de red para API calls
- ❌ No hay página offline

### Tareas
1. Extender el SW actual para manejar caching con Workbox
2. Estrategias:
   - Cache-first para assets estáticos (JS, CSS, icons)
   - Network-first para API calls con fallback a cache
   - Cache de imágenes con límite de edad
3. Crear página `/offline.html`
4. Agregar manifiesto de PWA completo

### Archivos a modificar
- `public/firebase-messaging-sw.js` → renombrar a `sw.js` y combinar
- `vite.config.ts` → configurar VitePWA con Workbox
- Crear `public/offline.html`

---

## 14. Feature Flags (Prioridad: MEDIA)

### Estado Actual
- ❌ No existe sistema de feature flags

### Tareas
1. Crear servicio simple de feature flags
2. Soporte para:
   - Flags por usuario (Firestore)
   - Flags globales (Remote Config)
   - Flags por entorno (env vars)
3. Hook `useFeatureFlag()`
4. UI de admin para togglear flags (opcional)

### Archivos a crear
- `src/services/featureFlags.ts`
- `src/hooks/useFeatureFlag.ts`
- `src/components/FeatureFlag.tsx` (wrapper component)

---

## 16. Tree Shaking de Iconos (Prioridad: BAJA)

### Estado Actual
- ⚠️ 32 iconos personalizados en `src/components/icons/`
- ✅ `lucide-react` ya instalado pero NO usado

### Tareas
1. Reemplazar iconos personalizados por `lucide-react`
2. Iconos a migrar (ejemplos):
   - `UserIcon` → `User` de lucide
   - `HomeIcon` → `Home` de lucide
   - `HeartIcon` → `Heart` de lucide
   - etc.
3. Iconos custom que NO existen en lucide (mantener):
   - `DairyIcon` (productos lácteos)
   - `FruitIcon`, `VegetableIcon`, `MeatIcon` (categorías)
   - `BocadoLogo` (logo propio)

### Archivos
- Eliminar: 20+ archivos de iconos genéricos
- Modificar: Todos los componentes que usan iconos

---

## 17. CSS con Clases Arbitrarias (Prioridad: BAJA)

### Estado Actual
- ⚠️ Tailwind config tiene design system básico
- ❌ Muchas clases arbitrarias en componentes (ej: `pt-safe`, colores hardcodeados)

### Tareas
1. Estandarizar clases comunes:
   - Crear plugin Tailwind para `pt-safe`, `pb-safe`
   - Agregar colores faltantes al theme
   - Crear utilidades para sombras bocado
2. Crear componentes base:
   - `Button` con variantes (primary, secondary, ghost)
   - `Card` para contenedores
   - `Input` estandarizado
3. Documentar tokens de diseño

### Archivos a crear
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- Actualizar `tailwind.config.js`

---

## 18. Storybook (Prioridad: BAJA)

### Estado Actual
- ❌ No instalado

### Tareas
1. Instalar Storybook con Vite
2. Configurar tema oscuro/claro
3. Crear stories para componentes UI base:
   - Button
   - Card
   - Input
   - Iconos
4. Documentar props con JSDoc

### Archivos a crear
- `.storybook/main.ts`
- `.storybook/preview.tsx`
- `src/components/**/*.stories.tsx`

---

## 19. Skeleton Screens (Prioridad: BAJA)

### Estado Actual
- ❌ Usando spinners de carga
- ⚠️ Pantallas en blanco mientras cargan datos

### Tareas
1. Crear componentes skeleton base:
   - `SkeletonText` (líneas de texto)
   - `SkeletonCard` (tarjetas de recetas)
   - `SkeletonAvatar` (fotos de perfil)
   - `SkeletonList` (listas)
2. Reemplazar spinners por skeletons en:
   - Pantalla de perfil
   - Lista de recetas guardadas
   - Historial
   - Pantalla de recomendación

### Archivos a crear
- `src/components/skeleton/SkeletonText.tsx`
- `src/components/skeleton/SkeletonCard.tsx`
- `src/components/skeleton/index.ts`

---

## 20. E2E Tests (Prioridad: BAJA)

### Estado Actual
- ✅ Tests unitarios con Vitest
- ❌ No hay tests E2E

### Tareas
1. Instalar Playwright
2. Crear tests para flujos críticos:
   - Registro completo
   - Login
   - Generar recomendación
   - Guardar receta
   - Actualizar perfil
3. Configurar CI/CD para correr tests
4. Mock de Firebase Auth para tests

### Archivos a crear
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `e2e/recommendation.spec.ts`
- `e2e/profile.spec.ts`

---

## Orden de Implementación Recomendado

1. **16. Tree Shaking de Iconos** - Fácil, reduce bundle size
2. **17. CSS con Clases Arbitrarias** - Mejora mantenibilidad
3. **19. Skeleton Screens** - Mejora UX inmediata
4. **13. Service Worker / PWA** - Feature importante para móviles
5. **14. Feature Flags** - Infraestructura para releases
6. **18. Storybook** - Documentación (baja prioridad)
7. **20. E2E Tests** - Calidad (baja prioridad)
