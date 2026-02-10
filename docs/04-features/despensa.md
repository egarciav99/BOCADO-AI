# 🏪 Feature: Despensa Digital

## Descripción

Gestión de ingredientes disponibles en casa, organizados por zonas (nevera, congelador, despensa).

## Componentes

| Componente | Ubicación |
|------------|-----------|
| `PantryScreen` | `components/PantryScreen.tsx` |
| `PantryZoneSelector` | `components/pantry/PantryZoneSelector.tsx` |
| `PantryZoneDetail` | `components/pantry/PantryZoneDetail.tsx` |

## User Flow

```
Tab Despensa → Ver zonas → Seleccionar zona 
           → Ver items → Añadir / Editar / Eliminar
```

## Zonas

| Zona | Icono | Descripción |
|------|-------|-------------|
| Nevera | `Refrigerator` | Productos frescos, lácteos |
| Congelador | `Snowflake` | Congelados, helados |
| Despensa | `Package` | Secos, enlatados, especias |
| Encimera | `Home` | Frutas, pan, etc. |

## Categorías de Items

- 🥬 Vegetales
- 🍎 Frutas
- 🥩 Carnes
- 🐟 Mariscos
- 🥛 Lácteos
- 🌾 Granos
- 🫘 Legumbres
- 🌶️ Especias
- 🛢️ Aceites
- 🧂 Condimentos
- 🥤 Bebidas
- 📦 Otros

## Features

### Añadir Item
1. Seleccionar zona
2. Buscar/escribir nombre
3. Seleccionar categoría (autodetectar por nombre)
4. Cantidad y unidad
5. Fecha de caducidad (opcional)

### Smart Features (Futuro)
- [ ] Escáner de tickets de compra → auto-añadir
- [ ] Notificaciones de caducidad próxima
- [ ] Sugerir recetas basadas en items por caducar
- [ ] Lista de compras automática (lo que falta)

## Integración con Recetas

Al generar una receta:
1. Opción "Usar ingredientes de mi despensa"
2. Gemini prioriza esos ingredientes
3. Marcar ingredientes como "usados" al cocinar

## Modelo de Datos

Ver: [Modelo de Datos - Pantry](../03-tecnico/modelo-datos.md#pantry)

## UI/UX Notas

- Mostrar contador de items por zona
- Color coding por caducidad (verde/amarillo/rojo)
- Swipe para acciones rápidas (usado, caducado)
- Barra de búsqueda global en despensa
