# 🎨 Sistema de Diseño

## Paleta de Colores

```css
/* Primarios */
--color-primary: #10B981;      /* Emerald 500 - Verde saludable */
--color-primary-dark: #059669; /* Emerald 600 */
--color-primary-light: #6EE7B7;/* Emerald 300 */

/* Secundarios */
--color-secondary: #F59E0B;    /* Amber 500 - Comida/calidez */
--color-accent: #8B5CF6;       /* Violet 500 - IA/magia */

/* Neutros */
--color-bg: #FFFFFF;
--color-surface: #F9FAFB;      /* Gray 50 */
--color-border: #E5E7EB;       /* Gray 200 */
--color-text: #111827;         /* Gray 900 */
--color-text-secondary: #6B7280; /* Gray 500 */

/* Semánticos */
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

## Tipografía

- **Familia**: Inter (Google Fonts)
- **Tamaños**:
  - H1: 24px / bold
  - H2: 20px / semibold
  - H3: 18px / semibold
  - Body: 16px / regular
  - Small: 14px / regular
  - Caption: 12px / medium

## Componentes Base

### Botones

| Variante | Uso |
|----------|-----|
| Primary | Acción principal (CTA) |
| Secondary | Acción alternativa |
| Ghost | Acciones terciarias |
| Icon | Acciones compactas |

### Inputs

- Bordes redondeados: 8px
- Focus: ring-2 ring-primary
- Estados: default, focus, error, disabled

### Cards

- Border radius: 12px
- Sombra: shadow-sm
- Padding: 16px

## Iconografía

Usamos **Lucide React** para consistencia.

Iconos clave:
- 🏠 `Home` - Inicio
- 🍽️ `UtensilsCrossed` - Recetas
- 📅 `Calendar` - Plan
- 🏪 `Store` - Despensa
- 👤 `User` - Perfil
- ✨ `Sparkles` - IA/Generar
- ❤️ `Heart` - Guardar

## Layout

### Breakpoints

| Nombre | Ancho | Uso |
|--------|-------|-----|
| Mobile | < 640px | Default (mobile-first) |
| Tablet | 640px - 1024px | Ajustes menores |
| Desktop | > 1024px | Sidebar + main content |

### Espaciado

Base: 4px (0.25rem)

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

## Flujos de Usuario Principales

1. **Onboarding** (3 pasos)
   - Paso 1: Datos básicos (edad, género, peso, altura)
   - Paso 2: Condiciones médicas y alergias
   - Paso 3: Objetivos y preferencias

2. **Generar Receta**
   - Seleccionar tipo de comida
   - Elegir ingredientes disponibles
   - Generar con IA
   - Ver/Guardar receta

3. **Gestión Despensa**
   - Ver zonas (Nevera, Congelador, Despensa)
   - Añadir ítem
   - Marcar como usado/caducado

---

*Ver mocks en Figma: [link aquí cuando lo tengas]*
