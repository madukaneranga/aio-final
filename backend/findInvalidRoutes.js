import fs from 'fs';
import path from 'path';

const ROUTE_METHODS = ['use', 'get', 'post', 'put', 'delete', 'patch', 'all'];

const isUrl = (str) => /^https?:\/\//.test(str.trim());

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const invalidLines = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Check for route method calls like app.use('/path', ...), router.get('/path', ...)
    for (const method of ROUTE_METHODS) {
      const regex = new RegExp(`\\.${method}\\(([^)]+)`);
      const match = trimmed.match(regex);
      if (match) {
        // Extract the first argument
        let arg = match[1].trim();

        // Handle quotes around path
        if (arg.startsWith("'") || arg.startsWith('"') || arg.startsWith('`')) {
          arg = arg.slice(1, -1);
        } else {
          // Not a string literal - skip (might be a variable)
          continue;
        }

        if (isUrl(arg)) {
          invalidLines.push({
            lineNumber: i + 1,
            line: trimmed,
            routePath: arg,
            method,
          });
        }
      }
    }
  });

  return invalidLines;
}

function scanDir(dir) {
  let results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else if (file.isFile() && fullPath.endsWith('.js')) {
      const invalids = scanFile(fullPath);
      if (invalids.length > 0) {
        results.push({
          file: fullPath,
          invalids,
        });
      }
    }
  }

  return results;
}

// Run scanner in current directory or you can change this to your backend src folder
const baseDir = process.argv[2] || './';

const results = scanDir(baseDir);

if (results.length === 0) {
  console.log('No invalid route paths found!');
} else {
  console.log('Invalid route paths detected:');
  results.forEach(({ file, invalids }) => {
    console.log(`\nIn file: ${file}`);
    invalids.forEach(({ lineNumber, line, routePath, method }) => {
      console.log(`  Line ${lineNumber}: [.${method}()] route path is a URL: "${routePath}"`);
      console.log(`    -> ${line}`);
    });
  });
}
