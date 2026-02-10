# 🎨 Sistema de Diseño - Bocado AI

Guía de diseño para mantener consistencia visual en todos los componentes de la aplicación.

---

## 📐 Espaciado y Layout

### Contenedores Principales
```
- max-w-app (480px) - Ancho máximo de la app mobile
- max-w-mobile (480px) - Alias de max-w-app
- px-4 - Padding horizontal estándar en pantallas
- py-4 / py-6 - Padding vertical estándar
```

### Espaciado entre Elementos
```
- gap-4 (16px) - Espaciado estándar entre elementos
- space-y-4 - Espaciado vertical estándar
- mb-6 (24px) - Margen inferior para secciones
```

---

## 🔤 Tipografía

### Jerarquía de Textos

| Token | Tamaño | Uso |
|-------|--------|-----|
| `text-2xs` | 10px | Labels de formulario, badges pequeños |
| `text-xs` | 12px | Captions, texto secundario, emails |
| `text-sm` | 14px | Descripciones, texto de apoyo |
| `text-base` | 16px | Texto body principal |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 20px | Títulos de pantalla |

### Estilos de Labels de Formulario
```tsx
// SIEMPRE usar este patrón para labels:
<label className="block text-2xs font-bold text-bocado-dark-gray mb-1.5 uppercase tracking-wider">
  Label Text *
</label>
```

### Estilos de Títulos de Pantalla
```tsx
// Header consistente en todas las pantallas:
<h1 className="text-xl font-bold text-bocado-dark-green">Título</h1>
<p className="text-base text-bocado-gray mt-1">Descripción</p>
```

---

## 🎨 Colores

### Tokens de Color (SIEMPRE usar estos)

| Uso | Token | Valor |
|-----|-------|-------|
| Primario | `bocado-green` | #316559 |
| Primario Hover | `bocado-dark-green` | #2C4F40 |
| Fondo App | `bocado-background` | #F9F7F2 |
| Fondo Crema | `bocado-cream` | #F5F3EE |
| Borde | `bocado-border` | #E8E6E1 |
| Texto Principal | `bocado-text` | #252423 |
| Texto Secundario | `bocado-dark-gray` | #374F59 |
| Texto Terciario | `bocado-gray` | #9DB3C1 |

### Colores Semánticos
```
- Éxito: bg-green-50 / text-green-600
- Error: bg-red-50 / text-red-500
- Advertencia: bg-amber-50 / text-amber-700
- Info: bg-blue-50 / text-blue-600
```

---

## 🔘 Botones

### Botón Primario
```tsx
<button className="w-full bg-bocado-green text-white font-bold py-3.5 px-8 rounded-full text-base shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all">
  Texto
</button>
```

### Botón Secundario (Outline)
```tsx
<button className="w-full bg-white text-bocado-green border-2 border-bocado-green font-bold py-3.5 px-8 rounded-full text-base hover:bg-bocado-background active:scale-95 transition-all">
  Texto
</button>
```

### Botón Terciario
```tsx
<button className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all">
  Texto
</button>
```

---

## 📦 Cards y Contenedores

### Card Estándar
```tsx
<div className="bg-white p-6 rounded-3xl shadow-bocado">
  {/* Contenido */}
</div>
```

### Card con Borde
```tsx
<div className="bg-white p-4 rounded-2xl border border-bocado-border">
  {/* Contenido */}
</div>
```

### Sección de Formulario
```tsx
<div className="bg-bocado-background p-3 rounded-xl border border-bocado-border">
  <p className="text-2xs font-bold text-bocado-gray mb-2 uppercase tracking-wider">Título</p>
  {/* Contenido */}
</div>
```

---

## 🏷️ Badges

### Badge Estándar
```tsx
<span className="px-2.5 py-1 text-xs font-medium rounded-full bg-bocado-background text-bocado-dark-gray">
  Texto
</span>
```

### Badge de Dificultad
```tsx
// Fácil
<span className="px-2 py-1 rounded-lg font-medium bg-bocado-green/10 text-bocado-green">
  Fácil
</span>

// Media  
<span className="px-2 py-1 rounded-lg font-medium bg-amber-100 text-amber-700">
  Media
</span>

// Difícil
<span className="px-2 py-1 rounded-lg font-medium bg-red-100 text-red-600">
  Difícil
</span>
```

---

## ⚠️ Qué NO Hacer

### ❌ No usar valores arbitrarios
```tsx
// MAL:
<div className="max-w-[480px]">
<div className="text-[10px]">
<div className="rounded-[2.5rem]">

// BIEN:
<div className="max-w-app">
<div className="text-2xs">
<div className="rounded-4xl">
```

### ❌ No mezclar estilos de labels
```tsx
// MAL:
<label className="text-xs font-medium">
<label className="text-[11px] uppercase">

// BIEN:
<label className="text-2xs font-bold uppercase tracking-wider">
```

### ❌ No usar colores hardcodeados
```tsx
// MAL:
<span className="bg-green-100 text-green-700">

// BIEN:
<span className="bg-bocado-green/10 text-bocado-green">
```

---

## 📱 Responsividad

La app está optimizada para mobile-first (max-width: 480px).

### Breakpoints
```
- Default: Mobile (< 640px)
- sm: 640px+
- md: 768px+ (vista desktop del simulador de teléfono)
```

### Patrón Responsive
```tsx
// Mobile primero, luego desktop
<div className="text-center sm:text-left">
<div className="w-full sm:w-24">
```

---

## ✅ Checklist de Revisión

Antes de commit, verificar:

- [ ] Labels usan `text-2xs font-bold uppercase tracking-wider`
- [ ] Títulos de pantalla usan `text-xl font-bold text-bocado-dark-green`
- [ ] Botones primarios usan `py-3.5 rounded-full`
- [ ] No hay valores arbitrarios `[480px]`, `[10px]`, etc.
- [ ] Colores usan tokens del sistema `bocado-*`
- [ ] Espaciado consistente `gap-4`, `space-y-4`, `mb-6`
- [ ] Bordes redondeados usan tokens: `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl`

---

## 🔄 Actualización de Componentes Legacy

Si encuentras componentes con estilos antiguos, actualizar:

1. `text-[10px]` → `text-2xs`
2. `max-w-[480px]` → `max-w-app`
3. `rounded-[2.5rem]` → `rounded-4xl`
4. Labels inconsistentes → `text-2xs font-bold uppercase tracking-wider`
5. Colores hardcodeados → tokens `bocado-*`

---

*Última actualización: Febrero 2026*
