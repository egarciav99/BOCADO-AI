# 🔐 AUDITORÍA COMPLETA DEL SISTEMA DE AUTENTICACIÓN Y PERSISTENCIA DE SESIÓN

**Fecha:** 16 de Marzo, 2026  
**Estado:** ⚠️ FALLOS CRÍTICOS IDENTIFICADOS  
**Prioridad:** CRÍTICA

---

## 📋 RESUMEN EJECUTIVO

Se han identificado **5 PROBLEMAS CRÍTICOS** en la lógica de autenticación y persistencia de sesión:

1. **❌ Flujo de permisos incorrecto** - Los usuarios autenticados son enviados a "registerMethod" en lugar de "recommendation"
2. **❌ Lógica de onAuthStateChanged incorrecta** - SIEMPRE envía a "recommendation" aunque el usuario no tenga perfil completo
3. **❌ Falta de validación de estado** - No verifica si el usuario completó su perfil antes de mostrar la app
4. **❌ Inconsistencia en navegación** - HasSession es inconsistente entre componentes
5. **❌ Faltan pantallas de error y casos edge** - Sin manejo de usuarios sin perfil o perfiles incompletos

---

## 🔍 PROBLEMA #1: FLUJO DE PERMISOS INCORRECTO

### Ubicación
- **Archivo:** `src/App.tsx` línea 312-315  
- **Componente:** PermissionsScreen

### Código Problemático
```typescript
// HomeScreen → onGoToApp() → setCurrentScreen("permissions")
// PermissionsScreen → onAccept() → setCurrentScreen("registerMethod")

// Flujo actual cuando usuario hace clic en "Entrar" (ya está logueado):
// home → permissions → registerMethod ❌

// Debería ser:
// home → recommendation ✅
```

### Impacto
- **Crítico:** Un usuario autenticado hace clic en "Entrar" y es enviado a la pantalla de registro en lugar de la app
- Confunde al usuario
- Circuito cerrado de navegación

### Raíz del Problema
PermissionsScreen se usa para DOS casos:
1. Usuarios nuevos SIN autenticación (debe ir a registerMethod)
2. Usuarios YA autenticados (debe ir a recommendation)

Pero NO hay lógica para diferenciar entre ellos.

---

## 🔍 PROBLEMA #2: onAuthStateChanged SIEMPRE VA A RECOMMENDATION

### Ubicación
- **Archivo:** `src/App.tsx` línea 203-230

### Código Problemático
```typescript
unsubscribe = onAuthStateChanged(
  auth,
  (user) => {
    if (user) {
      // ... logging ...
      setUser(user);
      setCurrentScreen("recommendation");  // ⚠️ SIEMPRE!
    } else {
      setCurrentScreen("home");
    }
  }
);
```

### El Problema
Cuando Firebase restaura la sesión:
1. Usuario se autenticó hace 3 días
2. Cierra la app
3. Abre la app de nuevo
4. Firebase restaura su sesión automáticamente
5. onAuthStateChanged dispara con el usuario
6. **LA APP ENVÍA AL USUARIO A "recommendation" (MainApp) SIN VERIFICAR SI TIENE PERFIL**

### Consecuencias
- Usuario sin perfil ve pantalla de "Recommendation" vacía
- No hay forma de completar su perfil después
- La app está "congelada"

---

## 🔍 PROBLEMA #3: NO HAY VALIDACIÓN DE ESTADO DEL USUARIO

### Ubicación
- **Archivo:** `src/App.tsx`  
- **Servicio:** authService.ts, hooks/useUser.ts

### Falta Lógica
```typescript
// FALTA: Después de authentificarse, verificar:
// 1. ¿El usuario tiene perfil completo en Firestore?
// 2. ¿El usuario completó los 3 pasos del registro?
// 3. ¿El usuario es un usuario nuevo con Google sin perfil?

// Actualmente NO hay validación
```

### Estados Usuario No Manejados
- ✅ Usuario logueado con perfil completo → recommendation
- ❌ Usuario logueado SIN perfil (nuevo)
- ❌ Usuario logueado con perfil INCOMPLETO
- ❌ Usuario que fue a registerMethod pero NO terminó
- ❌ Usuario que se registró con Google pero falta completar datos

---

## 🔍 PROBLEMA #4: hasSession INCONSISTENTE

### Ubicación
- **Archivo:** `src/components/HomeScreen.tsx` línea 26

### Código Problemático
```typescript
const hasSession = isAuthenticated || !!profile;

// Esto es INCONSISTENTE porque:
// 1. ProfileQuery puede estar en loading
// 2. ProfileQuery puede fallar (sin internet, permisos, etc)
// 3. isAuthenticated podría ser true pero profile undefined
```

### Momento en que Falla
1. Usuario está logueado en Firebase
2. Pero su perfil aún está cargando desde Firestore
3. hasSession puede ser true o false dependiendo del timing
4. Los botones pueden cambiar incorrectamente

---

## 🔍 PROBLEMA #5: FLUJO DE REGISTRO CON GOOGLE

### Ubicación
- **Archivo:** `src/components/RegistrationMethodScreen.tsx`  
- **Función:** handleGoogleSignIn

### El Flujo Actual
```typescript
// Usuario hace clic en "Registrarse con Google"
1. signInWithGoogle() ✓
2. Si es usuario nuevo → va a "register" ✓
3. Usuario completa Step 1, 2, 3 ✓
4. RegistrationFlow → setCurrentScreen("recommendation") ✓
5. Usuario ve MainApp con tutorial → ✓

// PERO SI el usuario se registró con Google ANTES:
1. signInWithGoogle() ✓
2. Si es usuario EXISTENTE → muestra error "Ya está registrado" ✓
3. Pero debería ir a "login" o "recommendation" ✓
```

### Problema
- Después de que usuario nuevo se registra con Google, si:
  - Cierra la app
  - Vuelve a abrirla
- La app va a "recommendation" (vía onAuthStateChanged)
- Pero NO verifica si completó el perfil

---

## 📊 DIAGRAMA DE FLUJO ACTUAL (INCORRECTO)

```
┌─────────────────────────────────────────────────────────────┐
│                         INICIO (home)                       │
└──────────────┬──────────────────────────────────────────────┘
               │ isAuthenticated?
        ┌──────┴─────────┐
        │ YES            │ NO
        ▼                ▼
    ┌──────────────┐  ┌──────────────┐
    │ Botones:     │  │ Botones:     │
    │ - Entrar     │  │ - Empezar    │
    │ - Logout     │  │ - Entrar     │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           │ Entrar          │ Empezar
           ▼                 ▼
       ┌────────────┐    ┌──────────────────┐
       │ Permissions│    │ RegistrationMethod
       └──────┬─────┘    └─────────┬────────┘
              │Accept           │Elegir método
              ▼                 ▼
         ❌ registerMethod  ┌────────────┐
                            │ RegistrationFlow
                            └──────┬─────┘
                                   │Completar
                                   ▼
                            ┌──────────────┐
                            │ Recommendation
                            └──────────────┘

                    🔥 PROBLEMA: PermissionsScreen va a registerMethod
                       aunque usuario ya está autenticado!
```

---

## 📊 DIAGRAMA DE FLUJO CORRECTO

```
┌──────────────────────────────────────────────────────────────┐
│                      INICIO (onAuthStateChanged)             │
└──────────────┬───────────────────────────────────────────────┘
               │ Restaurar sesión de Firebase?
        ┌──────┴──────────┐
        │ SÍ              │ NO
        ▼                 ▼
    ┌────────────────┐  ┌──────────────┐
    │ ¿Tiene perfil? │  │ Ir a home    │
    └────┬──────┬────┘  └──────────────┘
         │SÍ    │NO
         ▼      ▼
    ┌────────┐  ┌──────────────┐
    │ Ir a   │  │ Ir a         │
    │ recommen║ │ RegistrationFlow │
    │ dation │  │ (completar)  │
    └────────┘  └──────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    PANTALLA HOME                             │
└──────────────┬───────────────────────────────────────────────┘
               │ isAuthenticated AND hasCompleteProfile?
        ┌──────┴──────────────┐
        │ SÍ                  │ NO
        ▼                     ▼
    ┌──────────────┐      ┌────────────────┐
    │ Botones:     │      │ Botones:       │
    │ - Entrar     │      │ - Empezar      │
    │ - Logout     │      │ - Entrar       │
    └──────┬───────┘      └────────┬───────┘
           │                       │
           │ Entrar (isAuth)       │ Entrar (noAuth)
           ▼                       ▼
       ┌────────────────┐     ┌─────────────────┐
       │ Recommendations│     │ Permissions     │
       │ (skip perms)   │     │ (show before)   │
       └────────────────┘     └────────┬────────┘
                                       │Accept
                                       ▼
                                 ┌──────────────────┐
                                 │ RegistrationMethod
                                 └─────────┬────────┘
                                           │Elegir
                                           ▼
                                     ┌──────────────┐
                                     │ RegistrationFlow
                                     └──────┬───────┘
                                            │Completar
                                            ▼
                                      ┌──────────────┐
                                      │ Recommendations
                                      │ + Tutorial    │
                                      └──────────────┘
```

---

## 🔧 PROBLEMAS EN CÓDIGO

### Problema A: App.tsx - PermissionsScreen

**Ubicación:** src/App.tsx línea 312-315

```typescript
❌ ACTUAL (INCORRECTO):
case "permissions":
  return (
    <PermissionsScreen
      onAccept={() => setCurrentScreen("registerMethod")}
      onGoHome={() => setCurrentScreen("home")}
    />
  );
```

**Por qué está mal:**
- Si usuario ya está autenticado y acepta permisos → debe ir a "recommendation"
- Si usuario NO está autenticado y acepta → debe ir a "registerMethod"
- NO hay lógica para diferenciar

---

### Problema B: App.tsx - onAuthStateChanged

**Ubicación:** src/App.tsx línea 218-233

```typescript
❌ ACTUAL (INCORRECTO):
unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) {
    // ... logging ...
    setUser(user);
    setCurrentScreen("recommendation");  // ⬅️ SIN VERIFICAR PERFIL!
  } else {
    setCurrentScreen("home");
  }
});
```

**Por qué está mal:**
- SIEMPRE va a "recommendation" aunque el usuario no tenga perfil
- No verifica si el usuario completó su registro

---

### Problema C: HomeScreen.tsx - hasSession Inconsistente

**Ubicación:** src/components/HomeScreen.tsx línea 25-26

```typescript
const { isAuthenticated, user } = useAuthStore();
const { data: profile, isLoading: profileLoading } = useUserProfile(user?.uid);

// ❌ INCORRECTO: No incluye el estado de carga
const hasSession = isAuthenticated || !!profile;

// ✅ CORRECTO:
const hasSession = isAuthenticated && !profileLoading;
```

**Por qué está mal:**
- Mientras se carga el perfil, `hasSession` puede cambiar
- Los botones pueden parpadear incorrectamente

---

### Problema D: RegistrationMethodScreen - Sin validación de usuario nuevo

**Ubicación:** src/components/RegistrationMethodScreen.tsx línea 24-50

```typescript
❌ ACTUAL (Parcialmente incorrecto):
const result = await signInWithGoogle();

if (!result.isNewUser) {
  setError("Esta cuenta ya está registrada...");
  return;  // ← Solo muestra error, no navega
}
```

**Por qué está mal:**
- Si es un usuario existente, debería ir a "recommendation" o "login"
- No debería mostrar solo error y quedarse ahí

---

## 🏗️ SOLUCIONES RECOMENDADAS

### Solución 1: Crear Pantalla de "CompleteProfile"

**Ubicación:** Nueva pantalla `src/components/CompleteProfileScreen.tsx`

**Propósito:** Mostrar cuando un usuario está autenticado pero sin perfil completo

```typescript
interface CompleteProfileScreenProps {
  hasPartialProfile: boolean;
  onRequestCompletation: () => void;
  onLogout: () => void;
}

// Mostrar botones:
// - "Completar Perfil" (va a RegistrationFlow)
// - "Cerrar Sesión" (logout)
```

---

### Solución 2: Validar Perfil Completo

**Ubicación:** Función auxiliar `src/utils/profileValidation.ts`

```typescript
export const isProfileComplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  
  // Campos obligatorios
  const required = [
    'gender',
    'age',
    'weight',
    'height',
    'country',
    'city',
    'activityLevel',
    'eatingHabit',
  ];
  
  return required.every(field => {
    const value = (profile as any)[field];
    return value && value !== "" && value !== "Sin especificar";
  });
};
```

---

### Solución 3: Rewrite de onAuthStateChanged

**Ubicación:** `src/App.tsx` línea 218-233

```typescript
unsubscribe = onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 1. Restaurar sesión
    markSessionRestored();
    recordTokenRefresh();
    saveUserDataForOffline(user);
    
    // 2. Obtener perfil
    try {
      const profileRef = doc(db, "users", user.uid);
      const profileSnap = await getDoc(profileRef);
      const hasProfile = profileSnap.exists();
      const profile = hasProfile ? profileSnap.data() : null;
      
      // 3. Decidir navegación
      if (isProfileComplete(profile)) {
        setCurrentScreen("recommendation");
      } else {
        setCurrentScreen("completeProfile");
      }
    } catch (error) {
      // Si no puede obtener perfil, mostrar pantalla de error
      setCurrentScreen("completeProfile");
    }
    
    setUser(user);
  } else {
    setCurrentScreen("home");
  }
});
```

---

### Solución 4: Actualizar HomeScreen

**Ubicación:** `src/components/HomeScreen.tsx`

```typescript
// 1. Esperar a que cargue el perfil
const { isAuthenticated, user } = useAuthStore();
const { data: profile, isLoading: profileLoading } = useUserProfile(user?.uid);

// 2. hasSession solo cuando está cargado
const hasCompleteProfile = !profileLoading && isProfileComplete(profile);
const hasSession = isAuthenticated && hasCompleteProfile;

// 3. Mostrar loading mientras se verifica
if (profileLoading) {
  return <LoadingScreen />;
}

// 4. Mostrar botones correctos
if (hasSession) {
  // Usuario autenticado CON perfil completo
  return (
    <>
      <button onClick={handleEnterApp}>Entrar</button>
      <button onClick={handleLogout}>Cerrar Sesión</button>
    </>
  );
} else if (isAuthenticated) {
  // Usuario autenticado PERO perfil incompleto
  return (
    <>
      <button onClick={handleCompleteProfile}>Completar Perfil</button>
      <button onClick={handleLogout}>Cerrar Sesión</button>
    </>
  );
} else {
  // Usuario NO autenticado
  return (
    <>
      <button onClick={handleStartRegistration}>Empezar</button>
      <button onClick={handleGoToLogin}>Entrar</button>
    </>
  );
}
```

---

### Solución 5: Actualizar PermissionsScreen

**Ubicación:** `src/App.tsx`

```typescript
// Reemplazar switch case para permissions:
case "permissions":
  return (
    <Suspense fallback={<ScreenLoadingFallback />}>
      <PermissionsScreen
        onAccept={() => {
          // Si está autenticado, va directo a recommendation
          // Si NO está autenticado, va a registerMethod
          if (isAuthenticated) {
            setCurrentScreen("recommendation");
          } else {
            setCurrentScreen("registerMethod");
          }
        }}
        onGoHome={() => setCurrentScreen("home")}
      />
    </Suspense>
  );
```

---

## 🧪 CASOS DE PRUEBA CRÍTICOS

```
┌─────────────────────────────────────────────────────────────────┐
│ CASO 1: Usuario nuevo sin autenticación
├─────────────────────────────────────────────────────────────────┤
│ 1. Home → Sin sesión
│ 2. Clic "Empezar"
│ 3. RegisterMethod (elegir Google/Email)
│ 4. RegistrationFlow (3 pasos)
│ 5. MainApp + Tutorial
│ RESULTADO: ✅ Usuario ve app con tutorial
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CASO 2: Usuario se registra con Google
├─────────────────────────────────────────────────────────────────┤
│ 1. Home → Sin sesión
│ 2. Clic "Empezar"
│ 3. RegisterMethod → Clic "Google"
│ 4. Google Auth popup → login exitoso
│ 5. RegistrationFlow si es nuevo, else error
│ 6. MainApp + Tutorial
│ RESULTADO: ✅ Usuario ve app
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CASO 3: Usuario existente inicia sesión
├─────────────────────────────────────────────────────────────────┤
│ 1. Home → Sin sesión
│ 2. Clic "Entrar"
│ 3. LoginScreen
│ 4. Email + Password
│ 5. MainApp (SIN tutorial)
│ RESULTADO: ✅ Usuario ve app sin tutorial
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CASO 4: Usuario cierra app y reabre (CRÍTICO)
├─────────────────────────────────────────────────────────────────┤
│ 1. onAuthStateChanged → Firebase restaura sesión
│ 2. getDoc(users/{uid}) → obtiene perfil
│ 3. ¿Perfil completo?
│    SÍ  → MainApp
│    NO  → CompleteProfileScreen
│ RESULTADO: ✅ Usuario puede continuar o completar perfil
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CASO 5: Usuario abandona registro a mitad
├─────────────────────────────────────────────────────────────────┤
│ 1. Home → Sin sesión
│ 2. Clic "Empezar"
│ 3. RegistrationFlow Step 1 → data guardada en store
│ 4. Cierra app
│ 5. Abre app nuevamente
│ RESULTADO: ¿Qué debe pasar?
│       OPCIÓN A: Mostrar "Completar registro" con draft guardado
│       OPCIÓN B: Mostrar Home nuevamente
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 RESUMEN DE CAMBIOS NECESARIOS

| # | Componente | Cambio | Prioridad |
|---|-----------|--------|-----------|
| 1 | App.tsx | Validar perfil en onAuthStateChanged | 🔴 CRÍTICA |
| 2 | App.tsx | Actualizar case "permissions" | 🔴 CRÍTICA |
| 3 | HomeScreen.tsx | Fix hasSession inconsistente | 🔴 CRÍTICA |
| 4 | Nuevo | Crear CompleteProfileScreen | 🟠 ALTA |
| 5 | Nuevo | Crear profileValidation.ts | 🟠 ALTA |
| 6 | RegistrationMethodScreen.tsx | Manejar usuario existente | 🟠 ALTA |
| 7 | authDebug.ts | Expandir diagnostics | 🟡 MEDIA |

---

## ✅ VERIFICACIÓN POST-IMPLEMENTACIÓN

Después de implementar los cambios:

```bash
# 1. Test: Usuario nuevo sin sesión
[ ] Home → "Empezar" → RegisterMethod → Register → MainApp

# 2. Test: Usuario logueado cierra/abre app
[ ] Registro → Logout → Reabre → MainApp (sin tutorial)

# 3. Test: Usuario sin perfil completo
[ ] Registra con Google → Abandona → Reabre → CompleteProfileScreen

# 4. Test: Permisos
[ ] Home (no auth) → "Entrar" → Permissions → RegisterMethod ✓
[ ] Home (auth) → "Entrar" → Permissions → MainApp ✓

# 5. Test: E2E con Playwright
[ ] npm run test:e2e
```

---

**Fin de Auditoría**
