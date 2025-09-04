import fs from 'fs';
import path from 'path';

const folders = ['app', 'components', 'lib', 'prisma', 'public', 'scripts'];
const outputFile = 'structure.txt';

function writeTree(dirPath: string, prefix = ''): void {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const connector = isLast ? '└─ ' : '├─ ';
    fs.appendFileSync(outputFile, `${prefix}${connector}${item.name}\n`);
    if (item.isDirectory()) {
      writeTree(path.join(dirPath, item.name), prefix + (isLast ? '   ' : '│  '));
    }
  });
}

// Hapus file lama jika ada
if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

// Loop folder utama
folders.forEach(folder => {
  if (fs.existsSync(folder)) {
    fs.appendFileSync(outputFile, folder + '\n');
    writeTree(folder, '  ');
    fs.appendFileSync(outputFile, '\n');
  }
});

console.log(`${outputFile} generated successfully.`);