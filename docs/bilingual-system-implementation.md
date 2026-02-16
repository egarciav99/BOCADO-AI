## 🌐 Sistema Bilingüe Implementado - Síntesis

Este documento describe la implementación completa del sistema bilingüe (Español/Inglés) con sincronización en Firebase.

---

## ✅ Cambios Implementados

### 1. **Sincronización Global de Idioma (UI)**

#### Campo en UserProfile
- Se agregó `language?: 'es' | 'en'` a la interfaz `UserProfile` en [src/types.ts](src/types.ts)
- Este campo se guarda en Firestore bajo `users/{uid}/language`

#### I18nContext Refactorizado
- Archivo: [src/contexts/I18nContext.tsx](src/contexts/I18nContext.tsx)
- **Prioridad de Carga:**
  1. Firebase (si usuario autenticado y tiene preferencia guardada) ← **Single Source of Truth**
  2. localStorage (fallback local)
  3. Navegador (idioma del sistema)

- **Sincronización:**
  - Al cambiar idioma con `setLocale()`, automáticamente se guarda en Firebase
  - El cambio se refleja globalmente en todos los componentes

#### Características
```typescript
const { locale, setLocale, t, isLoadingLocale } = useTranslation();

// Al cambiar idioma
setLocale('en'); // Guarda automáticamente en Firebase
```

---

### 2. **Lógica de Traducción y Reglas de Firebase**

#### Restricción de Backend
- ✅ Firebase **SIEMPRE** almacena datos en español
- Los idiomas se guardan como constantes (constants.ts) en español
- Solo la UI se traduce dinámicamente

#### Middleware de Escritura (Inbound)
- Archivo: [src/utils/translationMiddleware.ts](src/utils/translationMiddleware.ts)
- **Función:** `translateForStorage()`
- Los formularios guardan directamente valores de `constants.ts` (español)
- No requiere traducción adicional

#### Middleware de Lectura (Outbound)
- **Función:** `translateForUI()`
- Convierte valores españoles a la UI en el idioma seleccionado
- Usa mapeos en [src/utils/translationHelpers.ts](src/utils/translationHelpers.ts)

**Ejemplo:**
```typescript
const diseases = ['Hipertensión', 'Diabetes']; // Español en Firebase
const displayDiseases = translateForUI(diseases, diseaseKeys, t);
// Si locale === 'en': ['Hypertension', 'Diabetes']
// Si locale === 'es': ['Hipertensión', 'Diabetes']
```

---

### 3. **Archivos de Traducción**

#### es.json y en.json
- [src/locales/es.json](src/locales/es.json) - Español (504 líneas)
- [src/locales/en.json](src/locales/en.json) - Inglés (504 líneas, en paralelo)

**Cobertura traducci ón:**
- ✅ Botones y etiquetas
- ✅ Mensajes de error y validación
- ✅ Placeholders
- ✅ Modales y diálogos
- ✅ Configuración de perfil
- ✅ Notificaciones

---

### 4. **Componentes Actualizados**

#### ProfileScreen
- **Cambio de idioma:** Selector con `t('profile.language')`
- **Cambio de tema:** Selector con `t('profile.theme')`
- **Gestión de contraseña:** Utiliza `t('profile.changePassword')`
- **Eliminar cuenta:** Utiliza `t('profile.deleteAccount')`
- **Exportar datos:** Utiliza `t('profile.downloadData')`
- **Guardado automático en Firebase**

#### HomeScreen
- Títulos: `t('home.title')`
- Botones: `t('home.enterButton')`, `t('home.logoutButton')`
- Subtítulos: `t('home.subtitle')`

#### LoginScreen
- Título: `t('login.title')`
- E-mail no verificado: `t('login.emailNotVerified')`
- Restablecer contraseña: `t('login.resetPassword')`
- Placeholders: `t('login.placeholders.email')`

---

## 🔄 Flujo de Sincronización

```
┌─────────────────────────────────────────┐
│   1. USUARIO CAMBIA IDIOMA              │
│   - Click en botón "🇪🇸 Español"       │
│   - Llama a: setLocale('es')            │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  2. I18nContext actualiza estado local  │
│   - locale: 'es'                        │
│   - localStorage: 'bocado-locale=es'    │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  3. Sincronización a Firebase           │
│   - updateProfileMutation.mutate()      │
│   - Firestore: users/{uid}/language='es'│
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  4. Todos los componentes se actualizan │
│   - useTranslation() devuelve:          │
│     { locale: 'es', t: (key) => ... }  │
│   - Las traducciones se aplican al UI   │
└─────────────────────────────────────────┘
```

---

## 📝 Formato de Traducciones

### Archivos JSON (es.json, en.json)
```json
{
  "profile": {
    "language": "Idioma",
    "theme": "Tema",
    "changePassword": "Cambiar Contraseña",
    "dataIncludes": {
      "profile": "Tu perfil y todas tus preferencias",
      "recipes": "Todas las recetas guardadas"
    }
  }
}
```

### Uso en Componentes
```tsx
const { t } = useTranslation();
<h2>{t('profile.language')}</h2>
<button>{t('profile.dataIncludes.profile')}</button>
```

---

## 🔐 Seguridad y Cumplimiento

✅ **Privacidad de Usuarios:**
- Preferencia de idioma guardada en perfil del usuario
- Accesible solo si usuario autenticado
- No se comparte con terceros

✅ **Integridad de Datos:**
- Firebase rules validan que solo el usuario pueda actualizar su idioma
- Datos de negocio siempre en español

✅ **Recuperación ante Errores:**
- Si Firebase falla: usa localStorage
- Si localStorage falla: usa idioma del navegador

---

## 🧪 Verificación de Implementación

### Checklist de Funcionalidad

- [ ] **Carga inicial:**
  - Usuario nuevo sin preferencia → idioma del navegador
  - Usuario con preferencia guardada → carga preferencia desde Firebase
  
- [ ] **Cambio de idioma:**
  - Click en selector de idioma → se cambia UI inmediatamente
  - Se guarda en Firebase sin errores
  - Se persiste en logout/login

- [ ] **Consistencia de datos:**
  - Perfil (preferencias, alergias, etc.) en español
  - UI se traduce según locale seleccionado

- [ ] **Formularios:**
  - Guardan valores en español
  - Muestran etiquetas en idioma seleccionado

---

## 📊 Archivos Modificados/Creados

### Creados
- [src/utils/translationMiddleware.ts](src/utils/translationMiddleware.ts) - Nuevo middleware

### Modificados
- [src/types.ts](src/types.ts) - Agregado campo `language` a UserProfile
- [src/contexts/I18nContext.tsx](src/contexts/I18nContext.tsx) - Refactorizado con sincronización Firebase
- [src/locales/es.json](src/locales/es.json) - Completado con nuevas traducciones
- [src/locales/en.json](src/locales/en.json) - Completado con nuevas traducciones
- [src/components/ProfileScreen.tsx](src/components/ProfileScreen.tsx) - Actualizadas traducciones
- [src/components/HomeScreen.tsx](src/components/HomeScreen.tsx) - Usan traducciones correctas
- [src/components/LoginScreen.tsx](src/components/LoginScreen.tsx) - Actualizadas traducciones

---

## 🚀 Próximos Pasos Opcionales

1. **Traducción automática de texto libre:**
   - Implementar traducción de descripciones (Google Translate API)
   - Actualmente solo se traduce texto estático

2. **Auditoría exhaustiva:**
   - Escanear todos los componentes para hardcoding
   - Asegurar consistencia en nomenclatura de keys

3. **Analytics mejorado:**
   - Trackear cambios de idioma por usuario
   - Medir uso de cada idioma

4. **Testing:**
   - Agregar tests de sincronización de idioma
   - Verificar comportamiento de fallback

---

**Última actualización:** Febrero 16, 2026  
**Responsable:** Copilot & Team Bocado
