#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const APP_DIR = path.join(process.cwd(), 'app');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (!/\.(tsx?|jsx?)$/.test(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function normalizeRoutePath(routePath) {
  if (!routePath || routePath === '/') {
    return '/';
  }

  let normalized = routePath.split(/[?#]/)[0] || '/';
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized;
}

function toRouteFromFile(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/');
  const noExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  const segments = noExt.split('/');

  const filtered = segments.filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) {
      return false;
    }

    if (segment === '_layout') {
      return false;
    }

    if (segment.startsWith('+')) {
      return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    return '/';
  }

  if (filtered[filtered.length - 1] === 'index') {
    filtered.pop();
  }

  if (filtered.length === 0) {
    return '/';
  }

  return `/${filtered.join('/')}`;
}

function collectPushCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /router\.push\(\s*(['"`])([^'"`]+?)\1\s*\)/g;
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const rawPath = match[2];
    if (!rawPath.startsWith('/')) {
      continue;
    }

    const index = match.index;
    const line = content.slice(0, index).split('\n').length;

    matches.push({
      filePath,
      line,
      rawPath,
      normalizedPath: normalizeRoutePath(rawPath),
    });
  }

  return matches;
}

if (!fs.existsSync(APP_DIR)) {
  console.error('app directory not found');
  process.exit(1);
}

const appFiles = walk(APP_DIR);
const routes = new Set(appFiles.map(toRouteFromFile));
const pushCalls = appFiles.flatMap(collectPushCalls);

const missing = pushCalls.filter((call) => {
  if (call.normalizedPath.includes('[') || call.normalizedPath.includes(']')) {
    return false;
  }

  return !routes.has(call.normalizedPath);
});

if (missing.length > 0) {
  console.error('Found router.push calls with non-existent routes:');
  for (const call of missing) {
    const rel = path.relative(process.cwd(), call.filePath).replace(/\\/g, '/');
    console.error(`- ${call.rawPath} -> ${call.normalizedPath} at ${rel}:${call.line}`);
  }
  process.exit(1);
}

console.log(`Validated ${pushCalls.length} router.push calls across ${routes.size} routes.`);
