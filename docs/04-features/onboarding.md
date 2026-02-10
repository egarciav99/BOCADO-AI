# 👤 Feature: Onboarding

## Descripción

Flujo de 3 pasos para capturar el perfil completo del usuario antes de usar la app.

## Componentes

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `RegistrationFlow` | `components/RegistrationFlow.tsx` | Container del wizard |
| `Step1` | `components/form-steps/Step1.tsx` | Datos básicos |
| `Step2` | `components/form-steps/Step2.tsx` | Alergias y condiciones |
| `Step3` | `components/form-steps/Step3.tsx` | Objetivos y preferencias |
| `ProgressBar` | `components/ProgressBar.tsx` | Indicador de progreso |

## Flow

```
Login/Registro → Step1 → Step2 → Step3 → Home
                     ↓      ↓      ↓
                  (validación en cada paso, puede volver atrás)
```

## Datos Recolectados

### Step 1: Datos Básicos
- Fecha de nacimiento
- Género (male/female/other)
- Altura (cm)
- Peso actual (kg)
- Nivel de actividad física

### Step 2: Salud y Restricciones
- Condiciones médicas (multi-select)
  - Diabetes
  - Hipertensión
  - Colesterol alto
  - Enfermedad celíaca
  - Otras
- Alergias alimentarias (multi-select)
  - Frutos secos
  - Lácteos
  - Gluten
  - Mariscos
  - Huevos
  - Soja
  - Otras

### Step 3: Objetivos y Preferencias
- Objetivo principal
  - Perder peso
  - Mantener peso
  - Ganar músculo
  - Mejorar salud general
- Peso objetivo (si aplica)
- Preferencias de cocina
- Alimentos que no le gustan
- Tiempo disponible para cocinar
- Presupuesto estimado

## Validaciones

| Campo | Regla |
|-------|-------|
| Edad | 13-120 años |
| Altura | 100-250 cm |
| Peso | 30-300 kg |
| Peso objetivo | Dentro de rango saludable |

## Estados

```typescript
interface OnboardingState {
  step: 1 | 2 | 3;
  data: Partial<UserProfile>;
  isSubmitting: boolean;
  error: string | null;
}
```

## API Integration

```typescript
// Al completar step 3
await updateUserProfile(userId, {
  ...step1Data,
  ...step2Data,
  ...step3Data,
  onboardingCompleted: true,
  updatedAt: new Date()
});
```

## Notas de Implementación

- Usar `react-hook-form` + Zod para validaciones
- Guardar progreso en localStorage por si cierra la app
- Animaciones entre pasos con Framer Motion (futuro)
- Skip opcional? No, es obligatorio para personalización
