const fs = require('fs');
const path = require('path');

const domain = 'originbeyond.homes';
const rootDir = path.resolve(__dirname, '..');
const publicCname = path.join(rootDir, 'public', 'CNAME');
const buildDir = path.join(rootDir, 'build');
const buildCname = path.join(buildDir, 'CNAME');
const content = `${domain}\n`;

fs.writeFileSync(publicCname, content, 'utf8');

if (fs.existsSync(buildDir)) {
  fs.writeFileSync(buildCname, content, 'utf8');
  console.log(`CNAME ready for GitHub Pages: ${domain}`);
} else {
  console.log('Build directory not found yet; public/CNAME was refreshed.');
}