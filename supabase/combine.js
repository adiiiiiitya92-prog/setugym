const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const outputFile = path.join(__dirname, 'combined_schema.sql');

console.log('Reading migrations directory:', migrationsDir);

try {
  // Read all files in migrations directory
  const files = fs.readdirSync(migrationsDir);
  
  // Sort files numerically by prefix (e.g. 0001, 0002)
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      return numA - numB;
    });

  let combinedSql = '';

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Appending: ${file}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    combinedSql += `-- ==========================================\n`;
    combinedSql += `-- MIGRATION: ${file}\n`;
    combinedSql += `-- ==========================================\n\n`;
    combinedSql += content;
    combinedSql += `\n\n`;
  }

  fs.writeFileSync(outputFile, combinedSql, 'utf-8');
  console.log(`Successfully compiled all migrations into: ${outputFile}`);
} catch (error) {
  console.error('Error combining migrations:', error);
  process.exit(1);
}
