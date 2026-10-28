import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
for (const file of ['index.html', 'login.html', 'ripbozo.html', 'style.css', 'app.js', 'prank.js', 'assets']) {
  cpSync(file, `dist/${file}`, { recursive: true });
}
console.log('Static site built in dist/');
