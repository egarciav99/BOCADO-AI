#!/usr/bin/env node
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = '303f9da95c18809c8c22c3ff972df25a';
const DOCS_DIR = path.join(__dirname, '..', 'docs');

if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN no está configurado');
  console.error('Usa: export NOTION_TOKEN="tu_token_aqui"');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Mapear lenguajes no soportados por Notion a equivalentes
function mapLanguage(lang) {
  const languageMap = {
    'tsx': 'typescript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'js': 'javascript',
    'sh': 'bash',
    'yml': 'yaml',
    'env': 'plain text',
    'txt': 'plain text',
    'prisma': 'plain text',
    'graphql': 'graphql',
  };
  
  const normalized = lang.toLowerCase().trim();
  return languageMap[normalized] || normalized || 'plain text';
}

// Convertir markdown a bloques de Notion
function markdownToNotionBlocks(markdown) {
  const lines = markdown.split('\n');
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
    if (line.startsWith('```')) {
      flushListItems();
      if (currentCodeBlock) {
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: currentCodeBlock.content } }],
            language: mapLanguage(currentCodeBlock.language),
          },
        });
        currentCodeBlock = null;
      } else {
        currentCodeBlock = {
          language: line.slice(3).trim(),
          content: '',
        };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.content += (currentCodeBlock.content ? '\n' : '') + line;
      continue;
    }

    // Línea vacía
    if (line.trim() === '') {
      flushListItems();
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      flushListItems();
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] },
      });
    } else if (line.startsWith('## ')) {
      flushListItems();
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3) } }] },
      });
    } else if (line.startsWith('### ')) {
      flushListItems();
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4) } }] },
      });
    }
    // Listas con viñetas
    else if (line.match(/^[\*\-]\s/)) {
      const content = line.slice(2).trim();
      currentListItems.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content } }],
        },
      });
    }
    // Listas numeradas
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '').trim();
      currentListItems.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content } }],
        },
      });
    }
    // Párrafo normal
    else {
      flushListItems();
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line } }],
        },
      });
    }
  }

  flushListItems();

  // Limitar a 100 bloques por página (límite de la API)
  return blocks.slice(0, 100);
}

// Crear página en Notion
async function createNotionPage(title, blocks, parentId) {
  try {
    const response = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ type: 'text', text: { content: title } }],
        },
      },
      children: blocks,
    });
    return response;
  } catch (error) {
    console.error(`❌ Error creando página "${title}":`, error.message);
    throw error;
  }
}

// Procesar archivo markdown
async function processMarkdownFile(filePath, parentId) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');
  const relativePath = path.relative(DOCS_DIR, filePath);
  
  console.log(`📄 Procesando: ${relativePath}`);
  
  const blocks = markdownToNotionBlocks(content);
  const title = fileName.replace(/-/g, ' ').replace(/_/g, ' ');
  
  await createNotionPage(title, blocks, parentId);
  console.log(`✅ Migrado: ${relativePath}`);
}

// Procesar directorio recursivamente
async function processDirectory(dirPath, parentId) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Crear página para el directorio
      const dirTitle = entry.name.replace(/-/g, ' ').replace(/_/g, ' ');
      console.log(`📁 Creando sección: ${dirTitle}`);
      
      const dirPage = await notion.pages.create({
        parent: { page_id: parentId },
        properties: {
          title: { title: [{ type: 'text', text: { content: dirTitle } }] },
        },
      });
      
      console.log(`✅ Sección creada: ${dirTitle}`);
      
      // Procesar contenido del directorio
      await processDirectory(fullPath, dirPage.id);
    } else if (entry.name.endsWith('.md')) {
      await processMarkdownFile(fullPath, parentId);
      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

// Main
async function main() {
  console.log('🚀 Iniciando migración a Notion...');
  console.log(`📂 Directorio: ${DOCS_DIR}`);
  console.log(`📍 Página destino: ${PARENT_PAGE_ID}\n`);
  
  try {
    await processDirectory(DOCS_DIR, PARENT_PAGE_ID);
    console.log('\n✨ ¡Migración completada exitosamente!');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

main();
