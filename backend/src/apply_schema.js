const fs = require('fs');
const path = require('path');
const prisma = require('./config/prisma');

async function applySchema() {
  const sqlPath = path.resolve(__dirname, '../../thai_please_schema.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Split SQL statements by semicolon, ignoring comments
  const lines = sqlContent.split('\n');
  let currentStatement = '';
  const statements = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.length === 0) {
      continue;
    }
    currentStatement += line + '\n';
    if (trimmed.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  console.log(`Executing ${statements.length} SQL statements...`);

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  for (const stmt of statements) {
    // Skip CREATE DATABASE or USE statements since Prisma is already connected to thai_please
    if (stmt.toUpperCase().startsWith('CREATE DATABASE') || stmt.toUpperCase().startsWith('USE ')) {
      continue;
    }
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.error(`Error on statement:\n${stmt.substring(0, 100)}...\nMessage: ${err.message}`);
    }
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✅ All statements executed successfully!');

  // Verify tables
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
  console.log('Remaining Tables:', tables.map((t) => Object.values(t)[0]));
  await prisma.$disconnect();
}

applySchema().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
