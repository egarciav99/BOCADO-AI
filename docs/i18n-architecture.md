# 🌐 Arquitectura de Internacionalización - BOCADO AI

## ⚠️ REGLA FUNDAMENTAL: Separación UI vs Datos

### 🔴 NUNCA traducir datos en Firebase

Los datos en Firebase **SIEMPRE** deben estar en **ESPAÑOL** (idioma original del sistema).

### ✅ Solo traducir la interfaz de usuario (UI)

Las traducciones solo afectan lo que el usuario **ve**, nunca lo que se **guarda**.

---

## 📊 Arquitectura de 3 Capas

```
┌─────────────────────────────────────┐
│   CAPA 1: UI (Traducible)           │
│   - Títulos, botones, labels        │
│   - Mensajes de error               │
│   - Instrucciones, placeholders     │
│   └─> usa: t('key.path')            │
└─────────────────────────────────────┘
           ↕️ (solo presentación)
┌─────────────────────────────────────┐
│   CAPA 2: CONSTANTES (Español)      │
│   - DISEASES, ALLERGIES, GOALS      │
│   - ACTIVITY_LEVELS, CRAVINGS       │
│   - FOOD_CATEGORIES                 │
│   └─> src/constants.ts              │
└─────────────────────────────────────┘
           ↕️ (se guardan tal cual)
┌─────────────────────────────────────┐
│   CAPA 3: Firebase (Solo Español)   │
│   - Firestore collections           │
│   - User profiles, saved items      │
│   - Plans, pantry, ratings          │
│   └─> NUNCA usar t() aquí           │
└─────────────────────────────────────┘
```

---

## ✅ Casos de Uso CORRECTOS

### 1. Mostrar opciones de un select

```tsx
// ❌ MAL - Traducir las opciones guardadas
const { t } = useTranslation();
const diseases = DISEASES.map((d) => t(`diseases.${d}`)); // ❌ NO!

// ✅ BIEN - Mostrar etiqueta traducida, valor en español
<select>
  {DISEASES.map((disease) => (
    <option key={disease} value={disease}>
      {t(`options.diseases.${disease}`)} {/* Solo UI */}
    </option>
  ))}
</select>;
```

### 2. Guardar datos de formulario

```tsx
// ❌ MAL - Guardar valor traducido
const handleSubmit = async () => {
  await setDoc(doc(db, "users", uid), {
    goal: t("goals.muscle"), // ❌ NO! Guardará "Build Muscle" en inglés
  });
};

// ✅ BIEN - Guardar valor original
const handleSubmit = async () => {
  await setDoc(doc(db, "users", uid), {
    goal: "Generar músculo", // ✅ Siempre en español
  });
};
```

### 3. Mostrar datos guardados

```tsx
// ✅ BIEN - Leer español, mostrar traducido
const profile = await getDoc(doc(db, "users", uid));
const goalInSpanish = profile.data().goal; // "Generar músculo"

return (
  <div>
    {t(`profile.goals.${goalInSpanish}`)}{" "}
    {/* UI: "Build Muscle" o "Generar músculo" */}
  </div>
);
```

---

## 🔍 Archivos Críticos (NO traducir datos)

### ✅ Ya seguros (datos en español):

- `src/constants.ts` - Todas las constantes en español ✅
- `src/components/form-steps/*.tsx` - Usan constantes directamente ✅
- `src/components/RegistrationFlow.tsx` - Guarda formData sin traducir ✅
- `src/components/ProfileScreen.tsx` - Lee/escribe español ✅

### ⚠️ Verificar al implementar traducciones:

- `src/components/RecommendationScreen.tsx`
- `src/components/PlanScreen.tsx`
- `src/hooks/usePantry.ts`
- `src/hooks/useSavedItems.ts`

---

## 📝 Checklist al Agregar Traducciones

Antes de usar `t()` en un componente, pregúntate:

1. ✅ **¿Es un texto de UI?** → Sí, usa `t('key')`
   - Botones, títulos, mensajes
   - Placeholders, tooltips
   - Errores, validaciones

2. ❌ **¿Es un dato que se guarda?** → NO uses `t()`
   - Valores de formularios
   - Opciones seleccionadas
   - Nombres de categorías
   - Estados guardados en Firebase

3. 🤔 **¿Es un dato que se muestra?** → Lee español, muestra traducido
   - Perfil del usuario
   - Recetas guardadas
   - Historial

---

## 🧪 Ejemplos Prácticos

### Formulario de Registro - Step2

```tsx
import { useTranslation } from "../contexts/I18nContext";
import { DISEASES, ALLERGIES } from "../constants";

const Step2 = () => {
  const { t } = useTranslation();
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  return (
    <div>
      {/* ✅ Título traducido (UI) */}
      <h2>{t("registration.step2.title")}</h2>

      {/* ✅ Opciones: valor español, texto traducido */}
      {DISEASES.map((disease) => (
        <button
          key={disease}
          onClick={() => {
            // ✅ Guardar en español
            setSelectedDiseases([...selectedDiseases, disease]);
          }}
        >
          {/* ✅ Solo la etiqueta se traduce */}
          {t(`options.diseases.${disease}`)}
        </button>
      ))}
    </div>
  );
};
```

### Mostrar Perfil

```tsx
const ProfileScreen = () => {
  const { t } = useTranslation();
  const profile = useUserProfile(uid); // Data en español de Firebase

  return (
    <div>
      {/* ✅ Label traducido */}
      <span>{t("profile.goal.label")}: </span>

      {/* ✅ Valor traducido desde español */}
      <strong>
        {profile.nutritionalGoal.map(
          (goal) => t(`options.goals.${goal}`), // "Generar músculo" → "Build Muscle"
        )}
      </strong>
    </div>
  );
};
```

---

## 🎯 Beneficios de esta Arquitectura

1. **Consistencia**: Base de datos unificada en un solo idioma
2. **Retrocompatibilidad**: Datos existentes siguen funcionando
3. **Simplicidad**: No necesitas migrar datos al cambiar idiomas
4. **Escalabilidad**: Fácil agregar nuevos idiomas (solo traducciones UI)
5. **Debugging**: Más fácil buscar valores específicos en Firestore

---

## 🚨 Errores Comunes a Evitar

### ❌ Error 1: Traducir al guardar

```tsx
const saveProfile = async () => {
  await setDoc(doc(db, "users", uid), {
    disease: t("diseases.diabetes"), // ❌ Guarda "Diabetes" o "Diabetes" según idioma
  });
};
```

### ❌ Error 2: Comparar traducido vs español

```tsx
if (profile.goal === t("goals.muscle")) {
  // ❌ Nunca coincidirá
  // ...
}
```

### ❌ Error 3: Enviar traducción a Firebase Functions

```tsx
const recommendation = await callFunction({
  craving: t("cravings.italian"), // ❌ La función espera español
});
```

---

## ✅ Resumen

| Elemento                      | Idioma      | Usa `t()`?         |
| ----------------------------- | ----------- | ------------------ |
| Botones, títulos              | Variable    | ✅ Sí              |
| Mensajes de error             | Variable    | ✅ Sí              |
| Placeholders                  | Variable    | ✅ Sí              |
| **DATOS en Firebase**         | **Español** | **❌ NO**          |
| **Constantes (constants.ts)** | **Español** | **❌ NO**          |
| **Valores de formulario**     | **Español** | **❌ NO**          |
| Etiquetas de datos            | Variable    | ✅ Sí (al mostrar) |

---

**Última actualización**: 2026-02-16  
**Responsable**: Copilot & Team Bocado
