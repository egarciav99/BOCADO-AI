#!/usr/bin/env node
import { Client } from "@notionhq/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = "303f9da95c18809c8c22c3ff972df25a";
const DOCS_DIR = path.join(__dirname, "..", "docs");

// Emojis por categoría
const CATEGORY_EMOJIS = {
  "01-producto": "📊",
  "02-disenio": "🎨",
  "03-tecnico": "💻",
  "04-features": "✨",
  "05-ops": "⚙️",
  "06-recursos": "📚",
};

const CATEGORY_NAMES = {
  "01-producto": "01 Producto",
  "02-disenio": "02 Diseño",
  "03-tecnico": "03 Técnico",
  "04-features": "04 Features",
  "05-ops": "05 Ops",
  "06-recursos": "06 Recursos",
};

if (!NOTION_TOKEN) {
  console.error("❌ Error: NOTION_TOKEN no está configurado");
  console.error('Usa: export NOTION_TOKEN="tu_token_aqui"');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Mapear lenguajes no soportados por Notion a equivalentes
function mapLanguage(lang) {
  const languageMap = {
    tsx: "typescript",
    ts: "typescript",
    jsx: "javascript",
    js: "javascript",
    sh: "bash",
    yml: "yaml",
    env: "plain text",
    txt: "plain text",
    prisma: "plain text",
  };

  const normalized = lang.toLowerCase().trim();
  return languageMap[normalized] || normalized || "plain text";
}

// Convertir markdown a bloques de Notion
function markdownToNotionBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let currentCodeBlock = null;
  let currentListItems = [];

  const flushListItems = () => {
    if (currentListItems.length > 0) {
      blocks.push(...currentListItems);
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Código de bloque
    if (line.startsWith("```")) {
      flushListItems();
      if (currentCodeBlock) {
        blocks.push({
          object: "block",
          type: "code",
          code: {
            rich_text: [
              { type: "text", text: { content: currentCodeBlock.content } },
            ],
            language: mapLanguage(currentCodeBlock.language),
          },
        });
        currentCodeBlock = null;
      } else {
        currentCodeBlock = {
          language: line.slice(3).trim(),
          content: "",
        };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.content += (currentCodeBlock.content ? "\n" : "") + line;
      continue;
    }

    // Línea vacía
    if (line.trim() === "") {
      flushListItems();
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      flushListItems();
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: line.slice(2) } }],
        },
      });
    } else if (line.startsWith("## ")) {
      flushListItems();
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: line.slice(3) } }],
        },
      });
    } else if (line.startsWith("### ")) {
      flushListItems();
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: line.slice(4) } }],
        },
      });
    }
    // Listas con viñetas
    else if (line.match(/^[\*\-]\s/)) {
      const content = line.slice(2).trim();
      currentListItems.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content } }],
        },
      });
    }
    // Listas numeradas
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, "").trim();
      currentListItems.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ type: "text", text: { content } }],
        },
      });
    }
    // Párrafo normal
    else {
      flushListItems();
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line } }],
        },
      });
    }
  }

  flushListItems();
  return blocks;
}

// Crear página en Notion con emoji y breadcrumb
async function createNotionPage(title, blocks, parentId, options = {}) {
  try {
    const { emoji, breadcrumb } = options;

    // Agregar breadcrumb al inicio si existe
    if (breadcrumb) {
      blocks.unshift(
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: breadcrumb },
                annotations: { color: "gray", italic: true },
              },
            ],
          },
        },
        {
          object: "block",
          type: "divider",
          divider: {},
        },
      );
    }

    const pageConfig = {
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: title } }],
        },
      },
      children: blocks.slice(0, 100), // Limitar a 100 bloques
    };

    // Agregar emoji si existe
    if (emoji) {
      pageConfig.icon = {
        type: "emoji",
        emoji: emoji,
      };
    }

    const response = await notion.pages.create(pageConfig);
    return response;
  } catch (error) {
    console.error(`❌ Error creando página "${title}":`, error.message);
    throw error;
  }
}

// Procesar archivo markdown
async function processMarkdownFile(filePath, parentId, categoryInfo = null) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath, ".md");
  const relativePath = path.relative(DOCS_DIR, filePath);

  console.log(`📄 Procesando: ${relativePath}`);

  const blocks = markdownToNotionBlocks(content);
  let title = fileName.replace(/-/g, " ").replace(/_/g, " ");

  // Opciones de la página
  const options = {};

  // Agregar breadcrumb si hay info de categoría
  if (categoryInfo) {
    const categoryEmoji = CATEGORY_EMOJIS[categoryInfo.id] || "📁";
    const categoryName = CATEGORY_NAMES[categoryInfo.id] || categoryInfo.name;
    options.breadcrumb = `🏠 BOCADO IA > ${categoryEmoji} ${categoryName} > 📄 ${title}`;
  }

  // Agregar emoji según el tipo de archivo
  if (fileName.includes("ROADMAP")) options.emoji = "🗺️";
  else if (fileName.includes("FINOPS")) options.emoji = "💰";
  else if (fileName.includes("bugs")) options.emoji = "🐛";
  else if (fileName.includes("deploy")) options.emoji = "🚀";
  else if (fileName.includes("FEATURE_FLAGS")) options.emoji = "🚩";
  else if (fileName.includes("PWA")) options.emoji = "📱";
  else if (fileName.includes("CACHE")) options.emoji = "💾";
  else if (fileName.includes("arquitectura")) options.emoji = "🏗️";
  else if (
    fileName.includes("UI_COMPONENTS") ||
    fileName.includes("sistema-diseno")
  )
    options.emoji = "🎨";
  else options.emoji = "📄";

  await createNotionPage(title, blocks, parentId, options);
  console.log(`✅ Migrado: ${relativePath}`);
}

// Procesar directorio recursivamente
async function processDirectory(dirPath, parentId, parentCategoryId = null) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Saltar directorio archived
      if (entry.name === "archived") {
        console.log(`⏭️  Saltando directorio: ${entry.name}`);
        continue;
      }

      // Crear página para el directorio
      const dirTitle =
        CATEGORY_NAMES[entry.name] ||
        entry.name.replace(/-/g, " ").replace(/_/g, " ");
      const dirEmoji = CATEGORY_EMOJIS[entry.name] || "📁";

      console.log(`📁 Creando sección: ${dirTitle}`);

      const dirPage = await notion.pages.create({
        parent: { page_id: parentId },
        icon: {
          type: "emoji",
          emoji: dirEmoji,
        },
        properties: {
          title: { title: [{ type: "text", text: { content: dirTitle } }] },
        },
      });

      console.log(`✅ Sección creada: ${dirTitle}`);

      // Procesar contenido del directorio
      await processDirectory(fullPath, dirPage.id, entry.name);
    } else if (entry.name.endsWith(".md") && entry.name !== "README.md") {
      const categoryInfo = parentCategoryId
        ? { id: parentCategoryId, name: entry.name }
        : null;
      await processMarkdownFile(fullPath, parentId, categoryInfo);
      // Pequeña pausa para no sobrecargar la API
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

// Crear página principal mejorada
async function createMainPage(parentId) {
  console.log("🎨 Creando página principal mejorada...");

  const blocks = [
    // Hero section
    {
      object: "block",
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text", text: { content: "🍽️ BOCADO IA" } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Plataforma inteligente de recomendaciones gastronómicas con IA generativa y personalización avanzada",
            },
            annotations: { italic: true },
          },
        ],
      },
    },
    {
      object: "block",
      type: "divider",
      divider: {},
    },

    // Accesos Rápidos
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🚀 Accesos Rápidos" } }],
      },
    },
    {
      object: "block",
      type: "callout",
      callout: {
        icon: { type: "emoji", emoji: "💡" },
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Links directos a los documentos más importantes. Navega por las secciones abajo para ver toda la documentación.",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "column_list",
      column_list: {},
    },

    // Dashboard de estado
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "📊 Estado del Proyecto" } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "✅ PWA: Implementado y funcionando" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "✅ Feature Flags: Sistema activo" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "✅ Iconos: Migrados a Lucide React" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "💰 FinOps: Optimizaciones implementadas" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "💾 Cache: Arquitectura implementada" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "divider",
      divider: {},
    },

    // Navegación principal
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "📂 Estructura del Proyecto" } },
        ],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "La documentación está organizada en las siguientes secciones:",
            },
          },
        ],
      },
    },
  ];

  try {
    await notion.pages.update({
      page_id: parentId,
      icon: {
        type: "emoji",
        emoji: "🍽️",
      },
    });

    // Agregar bloques a la página existente (append)
    for (let i = 0; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: parentId,
        children: chunk,
      });
    }

    console.log("✅ Página principal actualizada");
  } catch (error) {
    console.error("❌ Error actualizando página principal:", error.message);
  }
}

// Main
async function main() {
  console.log("🚀 Iniciando migración mejorada a Notion...");
  console.log(`📂 Directorio: ${DOCS_DIR}`);
  console.log(`📍 Página destino: ${PARENT_PAGE_ID}\n`);

  try {
    // Crear/actualizar página principal
    await createMainPage(PARENT_PAGE_ID);

    // Procesar todos los directorios
    await processDirectory(DOCS_DIR, PARENT_PAGE_ID);

    console.log("\n✨ ¡Migración completada exitosamente!");
    console.log(
      '💡 Tip: Organiza los "Accesos Rápidos" manualmente usando @mentions en Notion',
    );
  } catch (error) {
    console.error("\n❌ Error durante la migración:", error);
    process.exit(1);
  }
}

main();
