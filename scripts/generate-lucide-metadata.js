const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../lucide-icons'); // You will clone/copy the icons dir here
const OUTPUT_FILE = path.join(__dirname, '../src/lib/lucide-icons-metadata.json');

function toPascalCase(str) {
  return str
    .replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function main() {
  const files = fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.json'));
  const metadata = {};

  for (const file of files) {
    const iconName = toPascalCase(file.replace('.json', ''));
    const data = JSON.parse(fs.readFileSync(path.join(ICONS_DIR, file), 'utf8'));
    metadata[iconName] = {
      tags: data.tags || [],
      categories: data.categories || [],
      contributors: data.contributors || [],
    };
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
  console.log(`Wrote metadata for ${Object.keys(metadata).length} icons to ${OUTPUT_FILE}`);
}

main(); 