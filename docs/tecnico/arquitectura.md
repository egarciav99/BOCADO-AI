# 🏗️ Arquitectura

## Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   React 19  │  │   Next.js   │  │  Tailwind CSS       │ │
│  │  TypeScript │  │  (Build)    │  │  (Estilos)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                            │
│  Estado: Zustand  |  Query: TanStack Query  |  Forms: RHF │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP / REST
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Vercel Edge Functions (Node.js)                    │   │
│  │  ├── /api/generate-recipe        → Gemini API       │   │
│  │  ├── /api/recommend-restaurants → Google Places     │   │
│  │  └── /api/sync-data              → Firestore        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │Google Gemini │  │Google Places │      │
│  │  Auth + DB   │  │   (IA)       │  │  (Maps API)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Estructura de Carpetas

```
src/
├── components/           # Componentes React
│   ├── form-steps/      # Pasos del onboarding
│   ├── icons/           # Iconos custom
│   └── pantry/          # Componentes de despensa
├── hooks/               # Custom hooks
├── lib/                 # Utilidades y configuraciones
├── store/               # Zustand stores
├── types/               # TypeScript types
└── services/            # Llamadas a APIs
```

## Flujo de Datos

```
1. Usuario interactúa → Componente React
2. Acción → Zustand Store (estado local)
3. Datos persistentes → TanStack Query → Firebase
4. IA/External → Vercel Function → Servicio externo
```

## Seguridad

- **Auth**: Firebase Authentication (Email/Google)
- **Reglas Firestore**: Reglas por usuario (`request.auth.uid == userId`)
- **API Keys**: Variables de entorno en Vercel
- **CORS**: Configurado en Vercel Functions

## Performance Targets

| Métrica                | Objetivo |
| ---------------------- | -------- |
| First Contentful Paint | < 1.5s   |
| Time to Interactive    | < 3s     |
| Lighthouse Score       | > 90     |
| Bundle size inicial    | < 200KB  |

## Monitoreo

- Vercel Analytics (Web Vitals)
- Firebase Analytics (eventos de usuario)
- Console.error → Logging básico

---

## Decisiones Técnicas Clave

| Decisión         | Alternativa        | Razón                         |
| ---------------- | ------------------ | ----------------------------- |
| Vercel Functions | Firebase Functions | Edge network, menor latencia  |
| Zustand          | Redux              | Más simple, menos boilerplate |
| TanStack Query   | SWR                | Mejor integración React 19    |
| Gemini Flash     | GPT-4              | Más rápido, costo eficiente   |
