#!/usr/bin/env node

/**
 * migrate-skills.js — Script one-shot para migrar skills SDD legadas para .agents/archive/skills/
 * 
 * ESTE SCRIPT JÁ FOI EXECUTADO DURANTE A FASE 1 (T1.14).
 * Mantido como stub documentado para referência histórica.
 * 
 * Uso: node .agents/scripts/migrate-skills.js
 */

import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join(process.cwd(), '.agents', 'skills');
const DEST_DIR = path.join(process.cwd(), '.agents', 'archive', 'skills');

function migrate() {
  console.log('🔄 Migrando skills SDD legadas...');
  
  if (!fs.existsSync(SOURCE_DIR)) {
    console.log('ℹ️  Diretório .agents/skills/ não existe. Migração já realizada ou não necessária.');
    return;
  }

  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  const skills = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const skill of skills) {
    const src = path.join(SOURCE_DIR, skill);
    const dest = path.join(DEST_DIR, skill);
    
    if (fs.existsSync(dest)) {
      console.log(`⚠️  ${skill} já existe em archive. Pulando.`);
      continue;
    }
    
    fs.renameSync(src, dest);
    console.log(`✅ Movido: ${skill} → archive/skills/`);
  }

  // Remove diretório original se vazio
  const remaining = fs.readdirSync(SOURCE_DIR);
  if (remaining.length === 0) {
    fs.rmdirSync(SOURCE_DIR);
    console.log('✅ Diretório .agents/skills/ original removido.');
  }

  console.log('🎉 Migração concluída. Skills legadas preservadas em .agents/archive/skills/');
}

// Executa se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };