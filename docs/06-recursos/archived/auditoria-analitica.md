# Auditoría de Analítica

<aside>
📋

**Reporte Técnico: Auditoría de Analítica - Bocado AI**

- **Fecha:** 2026-02-08
- **Plataforma:** Firebase Analytics (Google Analytics 4)
- **Framework:** React + TypeScript + Firebase
</aside>

---

## 1. Estado Actual

### Configuración Base Implementada ✅

La aplicación cuenta con una implementación sólida de Firebase Analytics distribuida en los siguientes archivos clave:

| **Archivo** | **Responsabilidad** |
| --- | --- |
| `src/firebaseConfig.ts` | Inicialización de Analytics, helpers `trackEvent`, `setAnalyticsUser`, `setAnalyticsProperties` |
| `src/hooks/useAnalyticsProperties.ts` | Sincronización automática de propiedades de usuario desde el perfil |
| `src/App.tsx` | Eventos globales: `screen_view`, errores JS, `unhandledrejection` |

### Propiedades de Usuario Sincronizadas

<aside>
👤

El hook `useAnalyticsProperties` sincroniza automáticamente las siguientes propiedades cuando el perfil cambia:

`nutritional_goal` • `allergies` • `other_allergies` • `country` • `city` • `activity_level` • `eating_habit` • `cooking_affinity` • `diseases` • `gender` • `age_range`

</aside>

### Cobertura Actual

<aside>
✅

**Completo**

- Flujo de Autenticación
- Flujo de Registro
- Recomendaciones
- Pantalla de Plan
- Perfil de Usuario
- Restaurantes Guardados
</aside>

<aside>
⚠️

**Parcial**

- Despensa
- Tutorial (básico)
</aside>

<aside>
❌

**Sin Implementar**

- Recetas Guardadas
</aside>

---

## 2. Eventos Implementados

### 🔐 Autenticación (`LoginScreen.tsx`)

| **Evento** | **Descripción** | **Parámetros** |
| --- | --- | --- |
| `login_success` | Login exitoso | `userId` |
| `login_error` | Error en login | `error_code`, `email_provided` |
| `login_missing_profile` | Login OK pero sin perfil en Firestore | `userId` |
| `login_unverified_attempt` | Intento con correo no verificado | `userId` |
| `password_reset_requested` | Solicitud de reset de password | `success`, `error` |

### 📝 Registro (`RegistrationFlow.tsx`)

| **Evento** | **Descripción** | **Parámetros** |
| --- | --- | --- |
| `registration_step_view` | Vista de paso del registro | `step_number`, `step_name` |
| `registration_abandoned` | Usuario abandona el registro | `step_number`, `step_name`, `total_steps` |
| `registration_complete` | Registro completado exitosamente | `nutritional_goal`, `country` |
| `registration_failed` | Fallo en el registro | `error_code`, `step` |

### 🍽️ Recomendaciones (`RecommendationScreen.tsx`)

| **Evento** | **Descripción** | **Parámetros** |
| --- | --- | --- |
| `recommendation_type_selected` | Selección "En casa" / "Fuera" | `type` |
| `recommendation_meal_selected` | Selección de comida (desayuno, etc.) | `meal` |
| `recommendation_generation_start` | Inicio de generación | `type`, `meal`, `budget`, `cravings_count` |
| `recommendation_api_success` | Éxito en API de recomendación | `type` |
| `recommendation_generation_error` | Error en generación | `error`, `type` |

### 📋 Plan Generado (`PlanScreen.tsx`)

| **Evento** | **Descripción** | **Parámetros** |
| --- | --- | --- |
| `plan_viewed` | Plan visualizado | `plan_id`, `plan_type`, `userId` |
| `plan_error` | Error al cargar plan | `plan_id`, `error_message` |
| `plan_item_saved` | Item guardado desde plan | `item_title`, `type` |

### 👤 Perfil de Usuario (`ProfileScreen.tsx`)

| **Evento** | **Descripción** | **Parámetros** |
| --- | --- | --- |
| `profile_screen_view` | Vista de perfil | `userId` |
| `profile_update_success` | Perfil actualizado | `goals`, `has_allergies` |
| `profile_security_password_changed` | Contraseña cambiada | - |
| `profile_logout_click` | Click en cerrar sesión | - |

### 🍴 MealCard Interacciones (`MealCard.tsx`)

| **Evento** | **Descripción** | **Parámetros** |
| --- | --- | --- |
| `recipe_saved` | Receta/restaurante guardado | `item_title`, `type`, `userId` |
| `recipe_unsaved` | Receta/restaurante eliminado | `item_title`, `type`, `userId` |
| `recipe_expanded` | Card expandida | `item_title`, `type`, `is_restaurant` |
| `restaurant_maps_clicked` | Click en link de Maps | `restaurant`, `url` |

---

## 3. Eventos Faltantes

### 🔴 Prioridad Alta

| **Evento** | **Ubicación Sugerida** | **Justificación** |
| --- | --- | --- |
| `saved_recipes_screen_viewed` | `SavedRecipesScreen.tsx` | Paridad con restaurantes guardados; necesario para entender engagement |
| `saved_recipe_deleted` | `SavedRecipesScreen.tsx` | Confirmación de eliminación |
| `pantry_item_added` | `usePantry.ts` | Tracking de uso de la despensa |
| `feedback_submitted` | `FeedbackModal.tsx` | Crítico para métricas de satisfacción |
| `tutorial_step_viewed` | `TutorialModal.tsx` | Entender dónde abandonan el tutorial |
| `tutorial_completed` | `TutorialModal.tsx` | Tasa de finalización del onboarding |

### 🟡 Prioridad Media

| **Evento** | **Ubicación Sugerida** | **Justificación** |
| --- | --- | --- |
| `home_screen_cta_click` | `HomeScreen.tsx` | Tracking de conversión desde landing |
| `permissions_accepted` | `PermissionsScreen.tsx` | Tasa de aceptación de permisos |
| `registration_step_complete` | `RegistrationFlow.tsx` | Funnel de conversión por paso |
| `search_city_performed` | `Step1.tsx` / `ProfileScreen.tsx` | Uso del buscador de ciudades |

---

## 4. Sugerencias de Código

### 4.1 Implementación en `SavedRecipesScreen.tsx`

```tsx
import { trackEvent } from '../firebaseConfig';

// En el useEffect principal
useEffect(() => {
if (user) {
trackEvent('saved_recipes_screen_viewed', {
count: recipes.length,
userId: user.uid
});
}
}, [user, recipes.length]);

// En handleDeleteRequest
const handleDeleteRequest = (meal: Meal) => {
trackEvent('saved_recipe_delete_initiated', {
recipe: meal.recipe.title
});
setMealToConfirmDelete(meal);
};

// En confirmDelete
const confirmDelete = () => {
if (!mealToConfirmDelete || !user) return;
trackEvent('saved_recipe_deleted', {
recipe: mealToConfirmDelete.recipe.title
});
toggleMutation.mutate({
userId: user.uid,
type: 'recipe',
recipe: mealToConfirmDelete.recipe,
mealType: mealToConfirmDelete.mealType,
isSaved: true,
});
setMealToConfirmDelete(null);
};
```

### 4.2 Implementación en `usePantry.ts`

```tsx
import { trackEvent } from '../firebaseConfig';

// En la función addItem
const addItem = useCallback((item: KitchenItem) => {
trackEvent('pantry_item_added', {
item_name: item.name,
zone: item.zone,
category: item.category
});
setLocalInventory(prev => [...prev, item]);
debouncedSync([...localInventory, item]);
}, [localInventory, debouncedSync]);

// En la función deleteItem
const deleteItem = useCallback((id: string) => {
const item = localInventory.find(i => i.id === id);
if (item) {
trackEvent('pantry_item_deleted', {
item_name: item.name,
zone: item.zone
});
}
const updated = localInventory.filter(i => i.id !== id);
setLocalInventory(updated);
debouncedSync(updated);
}, [localInventory, debouncedSync]);
```

### 4.3 Implementación en `FeedbackModal.tsx`

```tsx
import { trackEvent } from '../firebaseConfig';

// Al enviar el feedback
const handleSubmit = async () => {
if (!rating) return;
setIsSubmitting(true);
try {
// ... lógica de envío ...
trackEvent('feedback_submitted', {
item_title: itemTitle,
type: type,
rating: rating,
has_comment: comment.length > 0,
userId: user?.uid
});
setIsSuccess(true);
} catch (error) {
trackEvent('feedback_submit_error', {
error: String(error)
});
} finally {
setIsSubmitting(false);
}
};
```

### 4.4 Implementación en `TutorialModal.tsx`

```tsx
import { trackEvent } from '../firebaseConfig';

// Trackear paso actual
useEffect(() => {
trackEvent('tutorial_step_viewed', {
step_number: currentStep + 1,
total_steps: TOTAL_STEPS
});
}, [currentStep]);

// Al completar
const handleComplete = () => {
trackEvent('tutorial_completed', {
total_steps_viewed: currentStep + 1
});
onClose();
};
```

### 4.5 Implementación en `HomeScreen.tsx`

```tsx
import { trackEvent } from '../firebaseConfig';

// En el botón de inicio
const handleStartClick = () => {
trackEvent('home_screen_cta_click', {
cta_type: 'start_registration'
});
onStartRegistration();
};
```

### 4.6 Implementación en `PermissionsScreen.tsx`

```tsx
import { trackEvent } from '../firebaseConfig';

useEffect(() => {
trackEvent('permissions_screen_viewed');
}, []);

const handleAccept = () => {
trackEvent('permissions_accepted');
onAccept();
};
```

---

## 5. Métricas Recomendadas en GA4

### Funnels Personalizados

<aside>
🔄

**1. Registro Completo**

- Paso 1: `registration_step_view` (step_1)
- Paso 2: `registration_step_view` (step_2)
- Paso 3: `registration_step_view` (step_3)
- Conversión: `registration_complete`
</aside>

<aside>
🎓

**2. Onboarding**

- Paso 1: `tutorial_step_viewed` (step_1)
- Paso 2: `tutorial_step_viewed` (step_2)
- Conversión: `tutorial_completed`
</aside>

<aside>
🍽️

**3. Generación de Recomendación**

- Paso 1: `recommendation_type_selected`
- Paso 2: `recommendation_meal_selected`
- Paso 3: `recommendation_generation_start`
- Conversión: `recommendation_api_success`
</aside>

### Audiencias Personalizadas

- **Usuarios Activos:** `login_success` en los últimos 7 días
- **Nuevos Registros:** `registration_complete` en los últimos 1 día
- **Power Users:** `recipe_saved` >= 3 veces en 7 días
- **Usuarios en Riesgo:** `registration_abandoned` + sin `login_success` en 7 días
- **Usuarios con Despensa Activa:** `pantry_item_added` en los últimos 7 días

---

## 6. Resumen de Implementación

| **Componente** | **Eventos Implementados** | **Cobertura** |
| --- | --- | --- |
| Autenticación | 11 | ✅ 100% |
| Registro | 5 | ✅ 100% |
| Recomendaciones | 9 | ✅ 100% |
| Plan | 4 | ✅ 100% |
| Perfil | 11 | ✅ 100% |
| Despensa | 3 | ⚠️ 50% |
| MealCard | 7 | ✅ 100% |
| Restaurantes Guardados | 4 | ✅ 100% |
| Recetas Guardadas | 0 | ❌ 0% |
| Tutorial | 1 | ⚠️ 25% |
| Home | 0 | ❌ 0% |
| Feedback | 0 | ❌ 0% |

<aside>
📈

**Cobertura Global Estimada:** ~75%

</aside>

---

## 7. Próximos Pasos Recomendados

<aside>
✅

**Inmediato**

Implementar eventos faltantes en `SavedRecipesScreen.tsx`

</aside>

<aside>
📅

**Esta Semana**

Agregar tracking en `FeedbackModal.tsx` para métricas de satisfacción

</aside>

<aside>
🔜

**Próximo Sprint**

Implementar funnel completo del tutorial

</aside>

<aside>
📋

**Backlog**

Agregar eventos de búsqueda de ciudad para optimizar UX

</aside>