# 📊 Métricas y KPIs

## North Star Metric

**Recetas generadas que fueron guardadas por el usuario**

Indica que la IA está generando contenido valioso y personalizado.

---

## Métricas de Adquisición

| Métrica | Definición | Meta Q1 | Meta Q2 |
|---------|------------|---------|---------|
| Usuarios registrados | Total de sign ups | 100 | 500 |
| Instalaciones PWA | Usuarios que instalaron la app | 30 | 150 |
| Costo por usuario | Marketing spend / nuevos users | - | < $5 |

---

## Métricas de Activación

| Métrica | Definición | Meta Q1 | Meta Q2 |
|---------|------------|---------|---------|
| Onboarding completion | % que completan los 3 pasos | 60% | 75% |
| Time to first recipe | Tiempo desde registro a 1ª receta | < 5 min | < 3 min |
| Profile completeness | % de perfil llenado | 80% | 90% |

**Funnel de Onboarding:**
```
Registro → Step 1 → Step 2 → Step 3 → Primera receta
  100%     85%      75%      60%      40%
```

---

## Métricas de Engagement

| Métrica | Definición | Meta Q1 | Meta Q2 |
|---------|------------|---------|---------|
| Recetas generadas/semana | Promedio por usuario activo | 3 | 5 |
| Recetas guardadas/generadas | % que guardan tras generar | 40% | 50% |
| DAU/MAU | Daily Active / Monthly Active | 20% | 30% |
| Sesiones por día | Promedio por DAU | 1.5 | 2.0 |
| Duración sesión | Tiempo promedio | 4 min | 5 min |

**Eventos a trackear (Firebase Analytics):**
- `recipe_generated`
- `recipe_saved`
- `recipe_cooked` (marcar como hecha)
- `pantry_item_added`
- `pantry_item_used`
- `profile_updated`
- `restaurant_saved`

---

## Métricas de Retención

| Métrica | Definición | Meta Q1 | Meta Q2 |
|---------|------------|---------|---------|
| Retención D1 | % que vuelven día siguiente | 50% | 60% |
| Retención D7 | % activos a los 7 días | 30% | 40% |
| Retención D30 | % activos a los 30 días | 15% | 25% |
| Churn rate | % que dejan de usar/mes | < 20% | < 15% |

**Cohort Analysis:**
| Semana | Sem 0 | Sem 1 | Sem 2 | Sem 3 | Sem 4 |
|--------|-------|-------|-------|-------|-------|
| 2026-W06 | 100% | 45% | 35% | 28% | 22% |
| 2026-W07 | 100% | ... | ... | ... | ... |

---

## Métricas de Revenue (Futuro)

| Métrica | Definición | Meta Q3 |
|---------|------------|---------|
| Conversion free→paid | % que pagan | 3% |
| ARPU | Average revenue per user | $5/mes |
| LTV | Lifetime value | $50 |
| MRR | Monthly recurring revenue | $500 |

---

## Métricas Técnicas

| Métrica | Definición | Meta |
|---------|------------|------|
| App load time | Tiempo hasta interactivo | < 3s |
| Crash rate | % de sesiones con crash | < 1% |
| API error rate | % de requests fallidos | < 2% |
| Gemini latency | Tiempo de respuesta promedio | < 8s |
| Firebase reads/day | Documentos leídos | < 50K (free tier) |

---

## Dashboards

### Firebase Analytics
- Events: `recipe_*`, `pantry_*`, `profile_*`
- User properties: `completed_onboarding`, `recipe_count`

### Vercel Analytics
- Web Vitals: LCP, FID, CLS
- Core Web Vitals score > 90

### Custom Dashboard (futuro)
- Mixpanel o Amplitude para análisis más profundo
- Retención por cohorte
- Funnel de conversión

---

## Revisión Semanal

**Cada lunes revisar:**
1. Métricas de la semana anterior
2. Comparación vs semana previa
3. Identificar tendencias
4. Ajustar tácticas según datos

**Template:**
```
Semana: 2026-WXX

📈 Lo que subió:
- 

📉 Lo que bajó:
- 

🎯 Acciones esta semana:
- 

💡 Insights:
- 
```
