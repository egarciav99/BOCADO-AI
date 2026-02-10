# 🔄 Exportar a Notion

Esta guía te ayuda a exportar toda la documentación de `/docs` a Notion.

---

## Opción 1: Script Automático (Recomendado)

### Paso 1: Crear integración de Notion

1. Ve a https://www.notion.so/my-integrations
2. Click en "New integration"
3. Nombre: "Bocado IA Docs"
4. Selecciona tu workspace
5. Copia el "Internal Integration Token" (empieza con `secret_`)

### Paso 2: Preparar la página destino

1. Crea una nueva página en Notion (ej: "📚 Bocado IA Wiki")
2. Click en "..." → "Add connections"
3. Busca "Bocado IA Docs" y selecciónala
4. Copia el ID de la página de la URL:
   - URL: `https://www.notion.so/workspace/1234567890abcdef...`
   - ID: `1234567890abcdef...` (32 caracteres)

### Paso 3: Configurar variables de entorno

```bash
# En la raíz del proyecto, crear archivo .env
NOTION_TOKEN=secret_tu_token_aqui
NOTION_PAGE_ID=tu_page_id_aqui
```

### Paso 4: Instalar dependencias y ejecutar

```bash
# Instalar cliente de Notion
npm install @notionhq/client

# Ejecutar exportación
node scripts/export-to-notion.js
```

El script creará:
- Una página principal con el README
- Una página por cada carpeta (Producto, Diseño, Técnico, etc.)
- Todas las páginas de documentación dentro de cada sección

---

## Opción 2: Importación Manual (Simple)

Si prefieres no usar el script:

### Método rápido

1. Ve a Notion y crea una nueva página
2. Escribe `/import` y selecciona "Markdown"
3. Selecciona todos los archivos `.md` de la carpeta `docs/`
4. Notion creará las páginas automáticamente

### Limitaciones del import manual
- No mantiene la estructura de carpetas exacta
- Los checkboxes (`- [ ]`) pueden no importarse perfectamente
- Los bloques de código pueden perder formato

---

## Opción 3: Notion Web Clipper

Para páginas individuales desde VS Code:

1. Instala "Markdown PDF" o "Markdown Preview Enhanced"
2. Exporta la vista previa como HTML/PDF
3. Usa el Web Clipper de Notion para guardarlo

---

## Estructura resultante en Notion

```
📚 Bocado IA Wiki (página principal)
├── 📚 Documentación Bocado IA
├── 📦 01-producto/
│   ├── 🎯 vision
│   ├── 🗺️ roadmap
│   └── 📊 metricas
├── 🎨 02-disenio/
│   └── 🎨 sistema-diseno
├── ⚙️ 03-tecnico/
│   ├── 🏗️ arquitectura
│   └── 💾 modelo-datos
├── ✨ 04-features/
│   ├── 👤 onboarding
│   ├── 🍳 generacion-recetas
│   └── 🏪 despensa
├── 🚀 05-ops/
│   ├── 🐛 bugs
│   └── ✅ deploy-checklist
└── 📚 06-recursos/
    ├── 📝 notas-diarias
    └── 🔗 links-utiles
```

---

## Mantener sincronizado

Para actualizar Notion después de cambios locales:

```bash
# Volver a ejecutar el script (actualiza páginas existentes)
node scripts/export-to-notion.js
```

**Nota:** El script actualmente crea páginas nuevas. Si quieres actualizar existentes, necesitarías:
1. Almacenar los IDs de páginas creadas
2. Usar `notion.pages.update()` en lugar de `create()`

---

## Troubleshooting

| Error | Solución |
|-------|----------|
| `unauthorized` | Verifica el token y que la integración tenga acceso a la página |
| `validation_error` | Algún bloque es muy largo o tiene formato inválido |
| Rate limit | El script tiene delays, pero si falla, espera 1 minuto y reintenta |
| Emojis no aparecen | Notion soporta emojis, pero algunos pueden no renderizar igual |

---

## Alternativa: Usar como base de datos

Si prefieres tener la doc en una base de datos de Notion para filtrar/buscar mejor, puedes:

1. Modificar el script para crear una database en lugar de páginas
2. Agregar propiedades: Categoría, Estado, Prioridad, etc.
3. Cada documento sería una entrada en la database

Ver `scripts/export-to-notion.js` - la función `createDocsDatabase()` ya está preparada para esto.
