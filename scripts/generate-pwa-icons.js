#!/usr/bin/env node

/**
 * Script para generar iconos PWA para Bocado
 * Uso: node scripts/generate-pwa-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Color de fondo de Bocado
const bgColor = '#4A7C59';

// Asegurar que el directorio existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcon(size) {
  const iconSize = Math.round(size * 0.5);
  
  // Crear SVG con el emoji de ensalada
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="${bgColor}"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="${iconSize}" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Android Emoji, EmojiSymbols, EmojiOne Mozilla">
        🥗
      </text>
    </svg>
  `;

  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  
  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  } catch (error) {
    console.error(`❌ Error generating ${size}x${size}:`, error.message);
  }
}

async function generateAllIcons() {
  console.log('🥗 Generating Bocado PWA icons...\n');
  
  for (const size of sizes) {
    await generateIcon(size);
  }
  
  console.log('\n✨ All icons generated!');
  console.log(`📁 Location: ${outputDir}`);
}

generateAllIcons().catch(console.error);
