import fs from 'fs';

const idPath = 'resources/js/locales/id.json';
const id = JSON.parse(fs.readFileSync(idPath, 'utf8'));
const translations = JSON.parse(
  fs.readFileSync('/tmp/i18n-snapshot/id-translations.json', 'utf8')
);

function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || typeof cur[p] !== 'object' || cur[p] === null || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

for (const [path, value] of Object.entries(translations)) {
  setPath(id, path, value);
}

fs.writeFileSync(idPath, JSON.stringify(id, null, 2) + '\n');
console.log('Merged', Object.keys(translations).length, 'keys into', idPath);
