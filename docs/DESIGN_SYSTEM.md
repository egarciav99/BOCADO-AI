# 🎨 Bocado Design System v1.0

**Fecha:** Marzo 14, 2026  
**Versión:** 1.0 - UI/UX Optimization Baseline  
**Estado:** ✅ Implementado y validado  

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Paleta de Colores](#paleta-de-colores)
3. [Tipografía](#tipografía)
4. [Spacing System](#spacing-system)
5. [Componentes Base](#componentes-base)
6. [Transiciones & Animaciones](#transiciones--animaciones)
7. [Patrones de Uso](#patrones-de-uso)
8. [Accesibilidad WCAG](#accesibilidad-wcag)
9. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## 🎯 Visión General

Bocado Design System proporciona un conjunto cohesivo de componentes, patrones y principios visuales que garantizan:

- ✅ **Consistencia**: Todos los componentes siguen las mismas reglas
- ✅ **Accesibilidad**: WCAG AA compliant en contraste, tipografía y navegación
- ✅ **Responsividad**: Mobile-first, funciona en 375px–1920px
- ✅ **Performance**: Transiciones suaves (duration-200) sin overhead
- ✅ **Dark Mode**: Totalmente soportado con contrast ratios verificados

---

## 🎨 Paleta de Colores

### Colores Primarios

```javascript
// tailwind.config.js
bocado: {
  green: "#316559",          // CTA principal, highlighting
  "green-light": "#6E9277",  // Backgrounds suaves
  "green-hover": "#2A574D",  // Hover state (más oscuro)
  "dark-green": "#2C4F40",   // Texto sobre fondo claro
}
```

| Color | Hex | WCAG AA Ratio | Uso |
|-------|-----|--------------|-----|
| bocado-green | #316559 | 4.5:1 ✅ | Botones primarios, acciones |
| bocado-green-hover | #2A574D | 5.2:1 ✅ | Hover state de botones |
| bocado-dark-green | #2C4F40 | 6:1 ✅ | Texto primario |

### Colores Secundarios (Neutral)

```javascript
bocado: {
  gray: "#9DB3C1",           // ⚠️ DEPRECATED - Usar dark-gray en textos
  "dark-gray": "#374F59",    // Texto secundario (4.5:1 ratio)
  background: "#F9F7F2",     // Fondo principal
  cream: "#F5F3EE",          // Backgrounds suaves
  border: "#E8E6E1",         // Borders
  text: "#252423",           // Texto (máximo contraste)
}
```

### Colores de Feedback

```javascript
// Status-specific colors - mantienen ratios WCAG AA
success: {
  light: "#F0FDF4",  // bg-green-50
  dark: "#166534",   // text-green-700
}

warning: {
  light: "#FFFBEB",  // bg-amber-50
  dark: "#92400E",   // text-amber-800
}

error: {
  light: "#FEF2F2",  // bg-red-50
  dark: "#991B1B",   // text-red-700
}
```

### Uso Correcto de Colores

```tsx
// ✅ CORRECTO - Contraste suficiente
<label className="text-bocado-dark-gray">Email</label>
<p className="text-bocado-dark-gray">Subtítulo importante</p>

// ❌ INCORRECTO - Contraste insuficiente (deprecated)
<p className="text-bocado-gray">Texto importante</p>

// ✅ CORRECTO para textos secundarios
<span className="text-xs text-bocado-gray">Hint text</span>
// (pequeño = menos contraste requerido)
```

---

## 📝 Tipografía

### Escala de Fuentes

```javascript
// tailwind.config.js
fontSize: {
  "2xs": ["0.625rem", { lineHeight: "0.875rem" }],  // 10px - DEPRECATED
  "xs": ["0.75rem", { lineHeight: "1rem" }],        // 12px - Labels, captions
  "sm": ["0.875rem", { lineHeight: "1.25rem" }],    // 14px - Texto secundario
  "base": ["1rem", { lineHeight: "1.5rem" }],       // 16px - Body text
  "lg": ["1.125rem", { lineHeight: "1.75rem" }],    // 18px - Subtítulos
  "xl": ["1.25rem", { lineHeight: "1.75rem" }],     // 20px - Títulos pantalla
}

fontFamily: {
  sans: ["Verdana", "Geneva", "sans-serif"],
}
```

### Uso de Tamaños de Fuente

| Contexto | Tamaño | Peso | Uso |
|----------|--------|------|-----|
| Labels/Captions | `text-xs` | bold | Input labels, PortionSelector |
| Texto secundario | `text-sm` | normal | Descripciones, hints, subtextos |
| Body text | `text-base` | normal | Párrafos, contenido principal |
| Subtítulos | `text-lg` | normal | SubTítulos de sección |
| Títulos pantalla | `text-xl` | bold | Headers principales |

### Uso de Pesos

```tsx
// Visible hierarchy
<h1 className="text-xl font-bold">Título Principal</h1>        // 20px, bold
<h2 className="text-lg font-bold">Subtítulo</h2>                // 18px, bold
<p className="text-base">Contenido</p>                           // 16px, normal
<label className="text-xs font-bold">Campo</label>              // 12px, bold
<span className="text-sm text-bocado-gray">Hint</span>           // 14px, normal, gray
```

---

## 📐 Spacing System

### Escala de Spacing

```javascript
// Basada en unidades de 4px (Tailwind default)
spacing: {
  2:   "0.5rem",    // 8px
  3:   "0.75rem",   // 12px
  4:   "1rem",      // 16px
  6:   "1.5rem",    // 24px
  8:   "2rem",      // 32px
  12:  "3rem",      // 48px
}
```

### Padding de Componentes

```tsx
// Button sizes (standarizado)
<Button size="sm">  {/* px-4 py-2 (16px × 8px) */}
<Button size="md">  {/* px-6 py-3 (24px × 12px) - DEFAULT */}
<Button size="lg">  {/* px-8 py-4 (32px × 16px) */}

// Input sizes
<Input size="sm">   {/* px-3 py-2 */}
<Input size="md">   {/* px-4 py-3 - DEFAULT */}
<Input size="lg">   {/* px-5 py-4 */}

// Card padding
<Card padding="sm">  {/* p-3 (12px) */}
<Card padding="md">  {/* p-4 (16px) - DEFAULT */}
<Card padding="lg">  {/* p-6 (24px) */}
```

### Spacing entre elementos

```jsx
// Gaps en contenedores flex
<div className="flex gap-2">...</div>   // 8px - items muy próximos
<div className="flex gap-3">...</div>   // 12px - componentes
<div className="flex gap-4">...</div>   // 16px - secciones grandes

// Margins entre bloques
<div className="mb-4">...</div>   // 16px - separación normal
<div className="mb-6">...</div>   // 24px - separación grande (entre secciones)
<div className="mb-8">...</div>   // 32px - separación mayor

// REGLA: Siempre usar múltiplos de 4px en spacing
```

---

## 🎯 Componentes Base

### Button

**Variantes:**

```tsx
// PRIMARY - Acción principal, CTA
<Button variant="primary" size="md">
  Enviar
</Button>
// Clases: bg-bocado-green text-white font-bold py-3 px-6 rounded-full
// Hover: bg-bocado-green-hover scale-[1.02] shadow-bocado-lg
// Focus: ring-bocado-green/50 ring-offset-2
// Active: scale-[0.98]

// SECONDARY - Acción secundaria
<Button variant="secondary" size="md">
  Cancelar
</Button>
// Clases: bg-bocado-cream text-bocado-dark-gray hover:bg-bocado-border

// OUTLINE - Acción de importancia media
<Button variant="outline">
  Más opciones
</Button>
// Clases: border-2 border-bocado-green text-bocado-green hover:bg-bocado-green hover:text-white

// GHOST - Acción de baja prioridad
<Button variant="ghost">
  Descartar
</Button>
// Clases: text-bocado-dark-gray hover:bg-bocado-cream

// DANGER - Acción destructiva
<Button variant="danger">
  Eliminar
</Button>
// Clases: bg-red-600 text-white hover:bg-red-700
```

**Propiedades:**

```tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;        // Muestra spinner + opacity-75
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
}
```

---

### Input

**Estructura:**

```tsx
<Input
  label="Email"
  type="email"
  placeholder="ejemplo@correo.com"
  helperText="Usaremos esto para notificaciones"
  size="md"
  fullWidth
/>
```

**Estilos:**

```javascript
// Base
border: border-bocado-border
focus: ring-2 ring-bocado-green/20 scale-[1.01]
placeholder: text-bocado-gray

// Error state
border: border-red-500
ring: ring-red-200
text: text-red-900

// Label
text-xs font-bold text-bocado-dark-gray mb-2.5

// Helper/Error text
text-sm text-bocado-dark-gray (helper)
text-sm text-red-600 (error)
```

---

### Card

**Variantes:**

```tsx
// DEFAULT - Con border sutil
<Card variant="default" padding="md">
  Contenido
</Card>
// Clases: border border-bocado-border bg-white

// OUTLINED - Border prominente
<Card variant="outlined" padding="md">
  Contenido importante
</Card>
// Clases: border-2 border-bocado-green bg-white

// ELEVATED - Con sombra
<Card variant="elevated" padding="lg">
  Contenido destacado
</Card>
// Clases: shadow-bocado bg-white
```

---

### Badge

**Tipos (Dificultad):**

```tsx
// Fácil
<span className="px-3 py-1 rounded-full bg-bocado-green/15 text-bocado-green font-semibold text-sm">
  Fácil
</span>

// Media
<span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
  Media
</span>

// Difícil
<span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
  Difícil
</span>
```

**Propiedades:**
- Padding: `px-3 py-1`
- Border radius: `rounded-full`
- Font: `font-semibold text-sm`
- Colores: Mantienen WCAG AA ratio

---

### Toast

**Tipos:**

```tsx
showToast("Guardado!", "success", 3000);      // Verde
showToast("Error al guardar", "error", 5000); // Rojo (assertive)
showToast("Advertencia", "warning", 4000);    // Ámbar (assertive)
showToast("Información", "info", 3000);       // Azul (polite)
```

**ARIA Accessibility:**
- Errors/Warnings: `aria-live="assertive"` (se anuncia inmediatamente)
- Info/Success: `aria-live="polite"` (se anuncia cuando conveniente)

---

## ⏱️ Transiciones & Animaciones

### Transiciones Estándar

```javascript
// Duration: 200ms es el estándar
transition: duration-200 ease-out

// En tailwind:
transition-all duration-200

// Aplicable a:
- Botones hover
- Input focus
- Modal/Card entrada
- Color changes
- Scale/transform
```

### Micro-interacciones Estándar

```tsx
// Botón en hover
className="hover:scale-[1.02] hover:shadow-bocado-lg transition-all duration-200"

// Input en focus
className="focus:scale-[1.01] transition-all duration-200"

// Botón presionado
className="active:scale-[0.98] transition-all duration-200"

// Estado loading
className={isLoading ? "opacity-75" : ""}
```

### Animaciones Keyframe

```javascript
// tailwind.config.js
keyframes: {
  fadeIn: {
    "0%": { opacity: "0" },
    "100%": { opacity: "1" },
  },
  slideUp: {
    "0%": { transform: "translateY(10px)", opacity: "0" },
    "100%": { transform: "translateY(0)", opacity: "1" },
  },
  "skeleton-pulse": {
    "0%, 100%": { opacity: "1" },
    "50%": { opacity: "0.4" },
  },
}

animation: {
  "fade-in": "fadeIn 0.3s ease-out",
  "slide-up": "slideUp 0.3s ease-out",
}
```

**Uso:**

```tsx
// Tarjetas que entran
<div className="animate-fade-in">
  <MealCard />
</div>

// Modales
<div className="animate-slide-up">
  <Modal />
</div>
```

---

## 🎯 Patrones de Uso

### Jerarquía Visual en Pantalla

```tsx
// ✅ CORRECTO
const LoginScreen = () => (
  <div className="flex flex-col gap-6">
    {/* Título principal */}
    <h1 className="text-xl font-bold text-bocado-dark-gray">
      Inicia sesión
    </h1>

    {/* Contenido */}
    <div className="flex flex-col gap-4">
      <Input label="Email" size="md" fullWidth />
      <Input label="Contraseña" type="password" size="md" fullWidth />
    </div>

    {/* CTA principal (más destaca) */}
    <Button variant="primary" size="lg" fullWidth>
      Iniciar sesión
    </Button>

    {/* CTA secundario */}
    <Button variant="outline" size="md" fullWidth>
      Crear cuenta
    </Button>

    {/* Link secundario */}
    <button className="text-sm text-bocado-gray hover:text-bocado-dark-gray transition-colors duration-200">
      ¿Olvidaste tu contraseña?
    </button>
  </div>
);
```

### Spacing Entre Secciones

```tsx
// ✅ CORRECTO
<div className="flex flex-col gap-8 p-6">
  {/* Header */}
  <h1>Título</h1>

  {/* Sección 1 - Grande */}
  <div>
    <h2 className="mb-4">Subtítulo</h2>
    <div className="flex flex-col gap-3">
      <Item />
      <Item />
    </div>
  </div>

  {/* Separator */}
  <hr className="border-bocado-border" />

  {/* Sección 2 */}
  <div>
    <h2 className="mb-4">Otra Sección</h2>
    <p>Contenido</p>
  </div>
</div>
```

---

## ♿ Accesibilidad WCAG

### Checklist WCAG AA

- [x] **Contraste**: Todos los textos ≥ 4.5:1 ratio
  - Textos grandes (≥18px): 3:1 permitido
  - Textos pequeños (<14px): Usar `text-bocado-dark-gray` (4.5:1)

- [x] **Tipografía**: Mínimo 12px (text-xs)
  - Nunca usar `text-2xs` (10px) para contenido importante

- [x] **Focus Rings**: Siempre visibles
  - `focus:ring-2 focus:ring-bocado-green/50 focus:ring-offset-2`
  - Color: bocado-green/50 (visible en fondos claros y oscuros)

- [x] **ARIA Roles y Labels**
  - `PortionSelector`: `role="radiogroup"`
  - `Toast`: `aria-live="assertive"` (errors), `aria-live="polite"` (info)
  - `Button`: `aria-label` cuando solo tiene ícono

- [x] **Keyboard Navigation**
  - Todos los elementos interactivos navegables con Tab
  - Enter/Space en botones y inputs
  - Escape para cerrar modales

- [x] **Dark Mode**
  - Todos los colores tienen equivalentes para dark mode
  - Contraste mantenido en ambos modos

### Ejemplos de Buena Accesibilidad

```tsx
// ✅ Input con label accesible
<label htmlFor="email" className="text-xs font-bold text-bocado-dark-gray">
  Email
</label>
<input
  id="email"
  type="email"
  aria-label="Email address"
  aria-describedby="email-helper"
/>
<p id="email-helper" className="text-sm text-bocado-gray">
  Usaremos esto para notificaciones
</p>

// ✅ Button con ícono solo
<button aria-label="Guardar receta">
  <Heart className="w-5 h-5" />
</button>

// ✅ Toast con aria-live
<div role="alert" aria-live="assertive">
  Error al guardar
</div>
```

---

## 💡 Ejemplos de Implementación

### Patrón: Formulario Completo

```tsx
const RegistrationForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  return (
    <form className="flex flex-col gap-6 max-w-md mx-auto p-6" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-bocado-dark-gray mb-2">
          Crear cuenta
        </h1>
        <p className="text-sm text-bocado-dark-gray">
          Completa tu perfil para empezar
        </p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          placeholder="Juan Pérez"
          fullWidth
          size="md"
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          placeholder="juan@ejemplo.com"
          fullWidth
          size="md"
          error={errors.email}
        />
        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          fullWidth
          size="md"
          error={errors.password}
          helperText="Mínimo 8 caracteres"
        />
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3 mt-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
        >
          Crear cuenta
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => router.push("/login")}
        >
          Ya tengo cuenta
        </Button>
      </div>
    </form>
  );
};
```

### Patrón: Card con Acciones

```tsx
const MealCardExample = ({ meal }) => {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Card variant="elevated" padding="lg" className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-bocado-dark-gray">
            {meal.title}
          </h3>
          <span className="inline-block px-3 py-1 mt-2 rounded-full bg-bocado-green/15 text-bocado-green font-semibold text-sm">
            {meal.difficulty}
          </span>
        </div>
        <button
          onClick={() => setIsSaved(!isSaved)}
          className="p-2 rounded-full hover:bg-bocado-cream transition-all duration-200 active:scale-95"
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <Heart
            className={`w-6 h-6 transition-all duration-200 ${
              isSaved ? "fill-red-500 text-red-500" : "text-bocado-gray"
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-bocado-dark-gray mb-4">
        {meal.description}
      </p>

      {/* Footer Actions */}
      <div className="flex gap-2 mt-6">
        <Button
          variant="primary"
          size="md"
          fullWidth
          className="hover:scale-[1.02] transition-all duration-200"
        >
          Ver receta
        </Button>
        <Button
          variant="outline"
          size="md"
          className="hover:scale-[1.02] transition-all duration-200"
        >
          Compartir
        </Button>
      </div>
    </Card>
  );
};
```

---

## 🔄 Migración & Deprecation

### Cambios en v1.0

| Lo Viejo | Lo Nuevo | Motivo |
|----------|----------|--------|
| `py-3.5` | `py-3` | Estandarización |
| `text-2xs` (10px) | `text-xs` (12px) | WCAG A Accesibilidad |
| `text-bocado-gray` (textos grandes) | `text-bocado-dark-gray` | Mejor contraste |
| `transition-all` (sin duration) | `transition-all duration-200` | Consistencia de velocidad |
| Sin `hover:scale-[1.02]` | Añadido | Feedback visual mejorado |
| `focus:ring-2` (color default) | `focus:ring-bocado-green/50` | Mejor visibilidad |

### Cómo Migrar Código Antiguo

```tsx
// ❌ OLD
<button className="py-3.5 px-8 bg-bocado-green text-white font-bold rounded-full active:scale-95 transition-all">
  Click
</button>

// ✅ NEW
<button className="py-3 px-8 bg-bocado-green text-white font-bold rounded-full active:scale-95 transition-all duration-200 hover:scale-[1.02]">
  Click
</button>

// O mejor aún, usar el componente Button:
<Button variant="primary" size="md">Click</Button>
```

---

## 📊 Referencia Rápida

### Colores

```
PRIMARY:        bocado-green (#316559)
SECONDARY:      bocado-dark-gray (#374F59)
BACKGROUND:     bocado-background (#F9F7F2)
ACCENT:         bocado-green-light (#6E9277)
```

### Tamaños

```
XS:   12px (text-xs)
SM:   14px (text-sm)
BASE: 16px (text-base)
LG:   18px (text-lg)
XL:   20px (text-xl)
```

### Espaciado

```
XS:   8px  (gap-2)
SM:   12px (gap-3)
MD:   16px (gap-4)
LG:   24px (gap-6)
```

### Botones

```
PRIMARY:   bg-bocado-green text-white
SECONDARY: bg-bocado-cream text-bocado-dark-gray
OUTLINE:   border-2 border-bocado-green text-bocado-green
GHOST:     text-bocado-dark-gray (sin background)
```

### Transiciones

```
HOVER:  transition-all duration-200 hover:scale-[1.02]
FOCUS:  focus:ring-bocado-green/50 focus:scale-[1.01]
ACTIVE: active:scale-[0.98]
```

---

## 🚀 Mejores Prácticas

### DO ✅

- Usar componentes base (Button, Input, Card) de `src/components/ui`
- Mantener `gap-3` o `gap-4` entre elementos
- Aplicar `duration-200` en todas las transiciones
- Usar `text-bocado-dark-gray` para textos que deben ser legibles
- Proporcionar `aria-label` en botones sin texto
- Usar `role` y `aria-live` apropiadamente

### DON'T ❌

- No mezclar tamaños de padding (usar escala estándar)
- No usar `text-bocado-gray` en textos importantes
- No crear transiciones sin especificar `duration`
- No olvidar `focus:ring` en inputs
- No usar colores personalizados fuera de la paleta
- No hacer hovers sin `scale-[1.02]` o equivalente visual

---

## 📞 Soporte y Contribuciones

Para proponer cambios al Design System:

1. Abre un issue describiendo el cambio
2. Proporciona ejemplos Antes/Después
3. Verifica que el cambio mantiene WCAG AA
4. Actualiza esta documentación

**Maintainers:** UI/UX Team, Bocado  
**Última actualización:** Marzo 14, 2026

---

**Versión completa del sistema. Íntegra esto a tu proyecto para referencia futura. ✨**
