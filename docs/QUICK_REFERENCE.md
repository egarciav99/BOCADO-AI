# 🎨 Bocado Design System - Guía Rápida

**Para desarrolladores nuevos y referencias rápidas**

---

## Componentes Base (Úsalos en lugar de CSS inline)

```tsx
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// BUTTON
<Button variant="primary" size="md" fullWidth>
  Acción Principal
</Button>

<Button variant="secondary" size="sm">
  Acción Secundaria
</Button>

<Button variant="outline" isLoading>
  Procesando...
</Button>

// INPUT
<Input
  label="Correo"
  type="email"
  placeholder="usuario@ejemplo.com"
  helperText="Usaremos esto para notificaciones"
  fullWidth
/>

// CARD
<Card variant="elevated" padding="lg">
  <h3>Contenido importante</h3>
  <p>Descripción</p>
</Card>
```

---

## Colores - Regla de Oro

| Contexto | Color a Usar |
|----------|-------------|
| Botones principales | `bg-bocado-green` |
| Texto que debe ser legible | `text-bocado-dark-gray` ✅ |
| Texto menor (hints, captions) | `text-bocado-gray` (solo pequeño) |
| Backgrounds suaves | `bg-bocado-cream` |
| Borders | `border-bocado-border` |

```tsx
// ✅ CORRECTO
<h2 className="text-lg font-bold text-bocado-dark-gray">Título</h2>
<p className="text-sm text-bocado-dark-gray">Descripción importante</p>
<span className="text-xs text-bocado-gray">Hint secundario</span>

// ❌ INCORRECTO
<p className="text-lg text-bocado-gray">Muy pálido, difícil de leer</p>
```

---

## Spacing - Cuarentena de Números

```
Úsalos así. Nada más.

gap-2  = 8px   (muy cercano)
gap-3  = 12px  (componentes)
gap-4  = 16px  (bloques)
gap-6  = 24px  (secciones grandes)

mb-2   = 8px
mb-4   = 16px
mb-6   = 24px
p-3    = 12px
p-4    = 16px
p-6    = 24px
```

```tsx
// ✅ CORRECTO
<div className="flex flex-col gap-4">
  <Input label="Nombre" />
  <Input label="Email" />
  <Button>Enviar</Button>
</div>

// ❌ INCORRECTO (números aleatorios)
<div className="flex flex-col gap-5 mb-7 p-11">
```

---

## Transiciones - Duration 200 Always

```tsx
// ✅ CORRECTO - Siempre con duration-200
<button className="transition-all duration-200 hover:scale-[1.02]">
  Hover effect suave
</button>

<input className="transition-all duration-200 focus:scale-[1.01]" />

// ❌ INCORRECTO - Sin duration (muy rápido o invisible)
<button className="transition-all hover:scale-[1.05]">
```

---

## Tamaños de Fuente - Mínimo 12px

```jsx
// ✅ CORRECTO
<label className="text-xs">  {/* 12px */}
<p className="text-sm">      {/* 14px */}
<h2 className="text-lg">     {/* 18px */}

// ❌ DEPRECATED
<span className="text-2xs">  {/* 10px - muy pequeño */}
```

---

## Hover & Focus - Micro-interacciones

```tsx
// Regla simple: Todo debe dar feedback visual

// Botones
className="transition-all duration-200 hover:scale-[1.02] hover:shadow-bocado-lg"

// Inputs
className="transition-all duration-200 focus:scale-[1.01] focus:ring-bocado-green/50"

// Links
className="transition-colors duration-200 hover:text-bocado-dark-gray"

// Cards
className="transition-all duration-200 hover:shadow-bocado-lg cursor-pointer"
```

---

## Accesibilidad - 5 Minutos Checklist

```tsx
// 1. Input tiene label?
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// 2. Botón sin texto tiene aria-label?
<button aria-label="Guardar">
  <Heart />
</button>

// 3. Colores tienen suficiente contraste?
// Usar text-bocado-dark-gray, no text-bocado-gray para textos grandes

// 4. Todo es navegable con Tab?
// Si es clickeable, debe ser <button> o role="button"

// 5. Focus ring es visible?
// focus:ring-2 focus:ring-bocado-green/50 (o hereda de Button/Input)
```

---

## Dark Mode - Automático

No necesitas hacer nada especial. Los componentes base ya tienen:

```tsx
// Input ejemplo
<input className="dark:focus:ring-bocado-green/50" />

// Si usas colores custom:
<p className="text-bocado-dark-gray dark:text-gray-200">
  Automáticamente claro en dark mode
</p>
```

---

## Toast / Notificaciones

```tsx
import { showToast } from "@/components/ui/Toast";

// Success
showToast("Guardado correctamente!", "success");

// Error (usa aria-live="assertive")
showToast("Error al guardar", "error");

// Warning
showToast("Esto no se puede deshacer", "warning");

// Info
showToast("Nueva actualización disponible", "info");
```

---

## Patrones Comunes

### Form
```tsx
<form className="flex flex-col gap-6">
  <h1 className="text-xl font-bold">Título</h1>
  
  <div className="flex flex-col gap-4">
    <Input label="Campo 1" />
    <Input label="Campo 2" />
  </div>
  
  <Button variant="primary" fullWidth size="lg">
    Enviar
  </Button>
</form>
```

### Card List
```tsx
<div className="flex flex-col gap-4">
  {items.map((item) => (
    <Card key={item.id} variant="elevated">
      <h3 className="font-bold">{item.title}</h3>
      <p className="text-sm text-bocado-dark-gray">{item.desc}</p>
    </Card>
  ))}
</div>
```

### Buttons Group
```tsx
<div className="flex gap-3">
  <Button variant="primary">Acción principal</Button>
  <Button variant="outline">Acción secundaria</Button>
</div>
```

---

## Errores Comunes

```tsx
// ❌ Padding inconsistente
<button className="py-2 px-8">  // no estandarizado
<button className="py-3.5 px-6"> // antiguo

// ✅ Padding correcto
<Button size="md" />  // py-3 px-6 automático

// ❌ Sin hover effect
<button>Click</button>

// ✅ Con hover effect
<button className="transition-all duration-200 hover:scale-[1.02]">

// ❌ Texto ilegible
<p className="text-lg text-bocado-gray">  // contraste bajo

// ✅ Texto legible
<p className="text-lg text-bocado-dark-gray">

// ❌ Sin duración en transición
<div className="transition-all hover:scale-105">

// ✅ Con duración correcta
<div className="transition-all duration-200 hover:scale-[1.02]">
```

---

## Cuando Necesites Custom Styles

```tsx
// ✅ CORRECTO - Usar clases Tailwind
<div className="p-6 rounded-2xl bg-white shadow-bocado">

// ❌ INCORRECTO - CSS inline
<div style={{ padding: "24px", borderRadius: "16px" }}>

// ✅ CORRECTO - Ampliar componente
<Button className="my-custom-class">Botón</Button>

// ❌ INCORRECTO - Duplicar CSS
<button className="py-3 px-6 rounded-full bg-green">
```

---

## Lighthouse Accessibility Checklist

Cuando hacer cambios, verifica:

```bash
# En Chrome DevTools:
DevTools → Lighthouse → Accesibilidad

# Target: Score ≥ 95

# Busca especialmente:
- Background and foreground colors are sufficiently contrasted
- Form elements have associated labels
- Buttons have accessible names
- Elements don't use keyboard traps
```

---

## Recursos

- **Colores:** `tailwind.config.js` (paleta bocado-*)
- **Componentes:** `src/components/ui/`
- **Design System Completo:** `docs/DESIGN_SYSTEM.md`
- **Configuración Global:** `src/index.css` y `src/styles/utilities.css`

---

**Última actualización:** Marzo 14, 2026  
**¿Preguntas?** Revisa `docs/DESIGN_SYSTEM.md` para detalles completos
