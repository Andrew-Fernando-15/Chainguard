import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'Demo_Evidence');
const destDir = path.join(process.cwd(), 'Demo_Evidence_Files');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      copyFilesRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.pdf')) {
      const destPath = path.join(destDir, entry.name);
      fs.copyFileSync(fullPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

copyFilesRecursively(srcDir);

const files = fs.readdirSync(destDir);
console.log(`\nAll ${files.length} PDF files gathered directly in: ${destDir}`);
files.forEach((f, idx) => console.log(`${idx + 1}. ${f}`));
