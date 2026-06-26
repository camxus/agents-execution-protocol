const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Usage: node scripts/bump-version.js <version>');
  process.exit(1);
}

const packages = ['core', 'next-agents', 'express-agents', 'react-agents'];

for (const pkg of packages) {
  const pkgPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkgJson.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
  console.log(`Bumped packages/${pkg} to ${newVersion}`);
}
