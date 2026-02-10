#!/usr/bin/env node

/**
 * Script para exportar la documentación de /docs a Notion
 * 
 * Uso:
 * 1. Crear integración en https://www.notion.so/my-integrations
 * 2. Copiar el Internal Integration Token
 * 3. Crear una página en Notion y compartirla con la integración
 * 4. Copiar el ID de la página (de la URL)
 * 5. Crear archivo .env con:
 *    NOTION_TOKEN=secret_xxx
 *    NOTION_PAGE_ID=xxxxxxxxxx
 * 6. Ejecutar: node scripts/export-to-notion.js
 */

import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PAGE_ID) {
  console.error('❌ Error: NOTION_TOKEN y NOTION_PAGE_ID deben estar en variables de entorno');
  console.error('');
  console.error('Ejemplo de .env:');
  console.error('NOTION_TOKEN=secret_xxx');
  console.error('NOTION_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Mapeo de carpetas a emojis
const FOLDER_EMOJIS = {
  '01-producto': '📦',
  '02-disenio': '🎨',
  '03-tecnico': '⚙️',
  '04-features': '✨',
  '05-ops': '🚀',
  '06-recursos': '📚'
};

// Función para convertir markdown simple a bloques de Notion
function markdownToBlocks(content) {
  const blocks = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      continue; // Saltar líneas vacías
    }
    
    // Headers
    if (trimmed.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }]
        }
      });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: trimmed.slice(3) } }]
        }
      });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: trimmed.slice(4) } }]
        }
      });
    }
    // Checkboxes
    else if (trimmed.startsWith('- [ ] ')) {
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: trimmed.slice(6) } }],
          checked: false
        }
      });
    } else if (trimmed.startsWith('- [x] ')) {
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: trimmed.slice(6) } }],
          checked: true
        }
      });
    }
    // Listas
    else if (trimmed.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }]
        }
      });
    }
    // Números
    else if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: trimmed.replace(/^\d+\.\s/, '') } }]
        }
      });
    }
    // Código
    else if (trimmed.startsWith('```')) {
      // Simple: ignorar bloques de código complejos por ahora
      continue;
    }
    // Texto normal
    else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: trimmed } }]
        }
      });
    }
  }
  
  return blocks;
}

// Función para crear una base de datos de documentación
async function createDocsDatabase(parentPageId, title) {
  const response = await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [{ type: 'text', text: { content: title } }],
    properties: {
      'Nombre': { title: {} },
      'Categoría': { 
        select: {
          options: [
            { name: '📦 Producto', color: 'blue' },
            { name: '🎨 Diseño', color: 'purple' },
            { name: '⚙️ Técnico', color: 'gray' },
            { name: '✨ Features', color: 'green' },
            { name: '🚀 Ops', color: 'orange' },
            { name: '📚 Recursos', color: 'yellow' }
          ]
        }
      },
      'Estado': {
        select: {
          options: [
            { name: '📝 Borrador', color: 'gray' },
            { name: '✅ Completo', color: 'green' },
            { name: '🔄 Actualizando', color: 'yellow' }
          ]
        }
      },
      'Última actualización': { date: {} }
    }
  });
  
  return response.id;
}

// Función para crear una página en Notion
async function createNotionPage(parentId, title, content, category, emoji = '📄') {
  const blocks = markdownToBlocks(content);
  
  // Notion tiene límite de 100 bloques por request
  const chunkSize = 100;
  const blockChunks = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    blockChunks.push(blocks.slice(i, i + chunkSize));
  }
  
  // Crear página con primer chunk
  const page = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: 'emoji', emoji },
    properties: {
      'title': {
        title: [{ type: 'text', text: { content: title } }]
      }
    },
    children: blockChunks[0] || []
  });
  
  // Agregar bloques restantes
  for (let i = 1; i < blockChunks.length; i++) {
    await notion.blocks.children.append({
      block_id: page.id,
      children: blockChunks[i]
    });
  }
  
  return page.id;
}

// Función principal
async function exportToNotion() {
  console.log('🚀 Exportando documentación a Notion...\n');
  
  try {
    // Verificar que la página padre existe
    const parentPage = await notion.pages.retrieve({ page_id: NOTION_PAGE_ID });
    console.log(`📄 Página padre: ${parentPage.properties.title?.title?.[0]?.plain_text || 'Sin título'}\n`);
    
    // Leer estructura de docs
    const entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).sort();
    
    // Crear índice principal
    const readmePath = path.join(DOCS_DIR, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      await createNotionPage(NOTION_PAGE_ID, '📚 Documentación Bocado IA', readmeContent, null, '📚');
      console.log('✅ README exportado');
    }
    
    // Procesar cada carpeta
    for (const folder of folders) {
      const folderName = folder.name;
      const folderPath = path.join(DOCS_DIR, folderName);
      const emoji = FOLDER_EMOJIS[folderName] || '📁';
      
      console.log(`\n${emoji} Procesando: ${folderName}`);
      
      // Crear página de sección
      const sectionPage = await notion.pages.create({
        parent: { page_id: NOTION_PAGE_ID },
        icon: { type: 'emoji', emoji },
        properties: {
          'title': {
            title: [{ type: 'text', text: { content: folderName.replace(/^\d+-/, '') } }]
          }
        }
      });
      
      // Procesar archivos .md
      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.md'))
        .sort();
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const title = file.replace('.md', '');
        
        process.stdout.write(`  📝 ${title}... `);
        
        try {
          await createNotionPage(sectionPage.id, title, content, folderName);
          console.log('✅');
        } catch (err) {
          console.log(`❌ ${err.message}`);
        }
        
        // Rate limiting de Notion API (3 requests por segundo)
        await new Promise(r => setTimeout(r, 350));
      }
    }
    
    console.log('\n\n🎉 ¡Exportación completada!');
    console.log(`🔗 Ver en Notion: https://notion.so/${NOTION_PAGE_ID.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'unauthorized') {
      console.error('\n💡 Verifica que:');
      console.error('   1. El token es correcto');
      console.error('   2. La integración tiene acceso a la página');
    }
    process.exit(1);
  }
}

exportToNotion();
