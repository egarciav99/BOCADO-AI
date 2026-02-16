# Escalado Inteligente de Recetas

<aside>
🎯

**Qué es**: Bocado ahora permite escalar recetas de forma inteligente según el número de personas, **optimizando cantidades para evitar desperdicio**.

En lugar de multiplicar todo ×2, el sistema analiza cada tipo de ingrediente y aplica un factor de escala apropiado.

</aside>

---

## 📊 Factores de Escalado por Tipo de Ingrediente

| **Tipo de Ingrediente** | **Factor** | **Ejemplo 2→4 pers.** |
| --- | --- | --- |
| **Proteínas** (pollo, huevos) | 100% | 2 pechugas → 4 pechugas |
| **Carbohidratos** (arroz, pasta) | 90% | 2 tazas → 3.5 tazas |
| **Vegetales** (tomate, lechuga) | 75% | 2 tomates → 3 tomates |
| **Aromáticos** (cebolla, ajo) | 50% | 1 cebolla → 1 cebolla (mínimo) |
| **Especias/Condimentos** | 30% | 1 cucharada → 1 cucharada |
| **Líquidos** (caldo, aceite) | 85% | 2 tazas → 3.5 tazas |

---

## 🎮 ¿Cómo Funciona?

1. **Genera una receta** normalmente
2. **Expande la receta** tocando la tarjeta
3. **Selecciona el número de personas** con el selector visual
4. Los **ingredientes se recalculan inteligentemente**

### Selector de Porciones

| **Icono** | **Personas** | **Uso típico** |
| --- | --- | --- |
| 👤 | 1 | Solo |
| 👥 | 2 | Pareja |
| 👨‍👩‍👧 | 3 | Familia pequeña |
| 👨‍👩‍👧‍👦 | 4 | Familia estándar |
| 👨‍👩‍👧‍👧 | 5 | Familia grande |
| 🏠 | 6 | Reunión familiar |
| 🎉 | 8 | Fiesta/Reunión |

---

## 💡 Ejemplos de Escalado Inteligente

<aside>
👥

**Receta base (2 personas)**

- 2 pechugas de pollo
- 2 tazas de arroz
- 1 cebolla grande
- 2 dientes de ajo
- 1 cucharada de comino
- Sal al gusto
</aside>

<aside>
👨‍👩‍👧‍👦

**Para 4 personas (escalado inteligente)**

- 4 pechugas de pollo *(100% - necesitas más proteína)*
- 3 ½ tazas de arroz *(90% - menos proporcional)*
- 1 ½ cebollas *(75% - no desperdicies)*
- 2 dientes de ajo *(50% - sabor suficiente)*
- 1 cucharada de comino *(30% - se concentra)*
- Sal al gusto *(sin cambio)*
</aside>

---

## ⚙️ Detalles Técnicos

### Categorías de Ingredientes

El sistema clasifica automáticamente ingredientes en categorías:

```tsx
type IngredientCategory =
| 'protein'      // Carnes, pescados, huevos, legumbres
| 'carb'         // Arroz, pasta, papas, cereales
| 'vegetable'    // Vegetales frescos
| 'aromatic'     // Cebolla, ajo, hierbas frescas
| 'spice'        // Especias, condimentos, sal
| 'liquid'       // Caldos, agua, leche, aceite
| 'dairy'        // Quesos, yogur, crema
| 'other';       // Otros ingredientes
```

### Factores de Escala

```tsx
const SCALING_CONFIG = {
protein:   { factor: 1.0,  minIncrement: 0.5 },  // Lineal
carb:      { factor: 0.9,  minIncrement: 0.25 }, // Casi lineal
vegetable: { factor: 0.75, minIncrement: 0.5 },  // Optimizado
aromatic:  { factor: 0.5,  minIncrement: 0.5 },  // Conservador
spice:     { factor: 0.3,  minIncrement: 0.25 }, // Mínimo
liquid:    { factor: 0.85, minIncrement: 0.25 }, // Moderado
dairy:     { factor: 0.85, minIncrement: 0.25 }, // Moderado
other:     { factor: 0.8,  minIncrement: 0.25 }, // Default
};
```

### Mínimos Prácticos

Algunos ingredientes tienen mínimos lógicos:

- **Huevos**: mínimo 1 (no puedes usar media huevo)
- **Cebollas**: mínimo ½ (puedes guardar la mitad)
- **Dientes de ajo**: mínimo 1
- **Limones**: mínimo ½

### Casos de Cálculo

| **Original** | **Tipo** | **2→4 pers.** | **Factor Real** |
| --- | --- | --- | --- |
| `2 pechugas` | protein | `4 pechugas` | 2.0× |
| `2 tazas arroz` | carb | `3 ½ tazas` | 1.8× |
| `1 cebolla` | vegetable | `1 ½ cebollas` | 1.5× |
| `1 diente ajo` | aromatic | `2 dientes` | 1.5× (mínimo) |
| `2 cucharadas comino` | spice | `2 ½ cucharadas` | 1.3× |
| `Sal al gusto` | - | `Sal al gusto` | - |

---

## ⚠️ Limitaciones

> **Instrucciones**: Los pasos de preparación no se modifican automáticamente
> 

> **Equipo**: Se asume que tienes ollas/sartenes suficientemente grandes
> 

> **Temperatura**: No se ajustan temperaturas del horno/estufa
> 

> **Tiempo de cocción**: Puede variar ligeramente con cantidades mayores
> 

---

## 🎨 UX Consideraciones

<aside>
💡

- El selector solo aparece en **recetas** (no en restaurantes)
- La escala se **reinicia a 2 personas** al cerrar la receta
- Se muestra indicador "Optimizado para evitar desperdicio" cuando aplica
- Analytics trackean cambios de porciones para entender uso
</aside>

---

## 💻 Implementación

### Archivos

```
src/
├── components/
│   ├── MealCard.tsx          # Integración del selector
│   └── PortionSelector.tsx   # Componente selector
├── utils/
│   └── portionScaler.ts      # Lógica de escalado inteligente
└── RECIPE_SCALING.md         # Esta documentación
```

### Uso del API

```tsx
import { scaleIngredient, scaleIngredientsSimple } from '../utils/portionScaler';

// Escalar un solo ingrediente
const result = scaleIngredient('2 cebollas', {
baseServings: 2,
targetServings: 4
});
// Resultado: { scaled: '3 cebollas', category: 'vegetable', factor: 1.5 }

// Escalar array de ingredientes
const scaled = scaleIngredientsSimple(
['2 pechugas', '1 cebolla', 'Sal al gusto'],
{ baseServings: 2, targetServings: 6 }
);
// Resultado: ['5 pechugas', '2 cebollas', 'Sal al gusto']
```

---

## 🧪 Testing

<aside>
✓

**Para probar el escalado inteligente:**

1. Generar una receta de "En casa"
2. Expandir la tarjeta
3. Cambiar el número de personas
4. Verificar que:
    - Las proteínas escalan proporcionalmente
    - Los vegetales escalan menos que las proteínas
    - Los condimentos casi no cambian
    - No hay cantidades absurdas (ej: 0.3 cebollas)
</aside>

### Casos de Prueba Recomendados

| **Escenario** | **Input** | **Expected Output** |
| --- | --- | --- |
| Proteína | `2 huevos` para 6 pers. | `5 huevos` (factor 0.9) |
| Vegetal | `1 cebolla` para 4 pers. | `1 ½ cebollas` (factor 0.75) |
| Especia | `1 cucharada` para 4 pers. | `1 cucharada` (factor 0.3 + mínimo) |
| Mixto | `2 ½ tazas` para 3 pers. | `3 tazas` (factor 0.9) |
| Sin número | `Sal` para 8 pers. | `Sal` (sin cambio) |