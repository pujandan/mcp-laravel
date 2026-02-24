#!/usr/bin/env node

/**
 * Simple Documentation Server for Laravel AI
 * Serves documentation files via HTTP for easy access
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DOCS_PATH = process.env.DOCS_PATH || path.join(__dirname, 'docs');

const MIME_TYPES = {
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.html': 'text/html',
};

// Create server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API endpoint for getting doc structure
    if (pathname === '/api/docs') {
      const files = getDocFiles(DOCS_PATH);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        documentation_root: DOCS_PATH,
        files: files.map(f => ({
          path: f.path,
          name: f.name,
        })),
        summary: {
          total_files: files.length,
          categories: {
            ai: files.filter(f => f.path.startsWith('ai/')).length,
            patterns: files.filter(f => f.path.startsWith('patterns/')).length,
            domains: files.filter(f => f.path.startsWith('domains/')).length,
          },
        },
      }, null, 2));
      return;
    }

    // API endpoint for reading a file
    if (pathname.startsWith('/api/docs/read')) {
      const filePath = url.searchParams.get('file');

      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'file parameter required' }));
        return;
      }

      const fullPath = path.join(DOCS_PATH, filePath);

      if (!fs.existsSync(fullPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found', path: filePath }));
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
      return;
    }

    // API endpoint for searching
    if (pathname.startsWith('/api/docs/search')) {
      const query = url.searchParams.get('q');

      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'q parameter required' }));
        return;
      }

      const files = getDocFiles(DOCS_PATH);
      const results = [];
      const queryLower = query.toLowerCase();

      for (const file of files) {
        const content = fs.readFileSync(file.full_path, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(queryLower)) {
            results.push({
              file: file.path,
              line: index + 1,
              content: line.trim(),
            });
          }
        });

        if (results.length >= 50) break;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        query,
        matches: results.length,
        results: results.slice(0, 50),
      }, null, 2));
      return;
    }

    // Special endpoint for quick reference
    if (pathname === '/api/docs/quick-reference') {
      const filePath = path.join(DOCS_PATH, 'ai/quick-reference.md');

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Quick reference not found' }));
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
      return;
    }

    // Special endpoint for templates
    if (pathname.startsWith('/api/docs/templates')) {
      const templateType = url.searchParams.get('type');
      const templatesPath = path.join(DOCS_PATH, 'ai/templates.md');

      if (!fs.existsSync(templatesPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Templates not found' }));
        return;
      }

      let content = fs.readFileSync(templatesPath, 'utf-8');

      // Filter by template type if specified
      if (templateType && templateType !== 'all') {
        const sections = {
          controller: '1. Controller Template',
          service: '3. Service Implementation Template',
          service_interface: '2. Service Interface Template',
          model: '4. Model Template',
          request: '5. Index Request Template',
          resource: '7. Resource Template',
          migration: '9. Migration Template',
        };

        const sectionStart = content.indexOf(sections[templateType]);

        if (sectionStart === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Template type '${templateType}' not found` }));
          return;
        }

        const sectionEnd = content.indexOf('\n---', sectionStart + 1);
        content = content.slice(sectionStart, sectionEnd === -1 ? content.length : sectionEnd);
      }

      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
      return;
    }

    // Special endpoint for checklist
    if (pathname.startsWith('/api/docs/checklist')) {
      const layer = url.searchParams.get('layer');
      const checklistPath = path.join(DOCS_PATH, 'ai/checklist.md');

      if (!fs.existsSync(checklistPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Checklist not found' }));
        return;
      }

      let content = fs.readFileSync(checklistPath, 'utf-8');

      // Filter by layer if specified
      if (layer && layer !== 'all') {
        const sections = {
          service: '1. Service Layer Checklist',
          controller: '2. Controller Checklist',
          model: '3. Model Checklist',
          request: '4. Request Validation Checklist',
          resource: '5. Resource Checklist',
          migration: '6. Migration Checklist',
        };

        const sectionStart = content.indexOf(sections[layer]);
        const nextSectionStart = content.indexOf('\n##', sectionStart + 1);

        if (sectionStart === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Layer '${layer}' not found` }));
          return;
        }

        content = content.slice(sectionStart, nextSectionStart === -1 ? content.length : nextSectionStart);
      }

      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
      return;
    }

    // Special endpoint for domain examples
    if (pathname.startsWith('/api/docs/domains')) {
      const domain = url.searchParams.get('domain');
      const domainsPath = path.join(DOCS_PATH, 'domains');

      if (domain && domain !== 'all') {
        const domainPath = path.join(domainsPath, domain, 'readme.md');

        if (!fs.existsSync(domainPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Domain '${domain}' not found` }));
          return;
        }

        const content = fs.readFileSync(domainPath, 'utf-8');

        res.writeHead(200, { 'Content-Type': 'text/markdown' });
        res.end(content);
        return;
      }

      // Return all domains overview
      const indexPath = path.join(domainsPath, 'readme.md');

      if (!fs.existsSync(indexPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Domains index not found' }));
        return;
      }

      const content = fs.readFileSync(indexPath, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
      return;
    }

    // Special endpoint for design system
    if (pathname === '/api/docs/design-system') {
      const designPath = path.join(DOCS_PATH, 'design-system.md');

      if (!fs.existsSync(designPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Design system not found' }));
        return;
      }

      const content = fs.readFileSync(designPath, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
      return;
    }

    // Default - serve markdown files directly
    let filePath = path.join(DOCS_PATH, pathname);

    // If directory, try to serve readme.md
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const readmePath = path.join(filePath, 'readme.md');
      if (fs.existsSync(readmePath)) {
        filePath = readmePath;
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - File Not Found');
      return;
    }

    // Get content type
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    // Serve file
    const content = fs.readFileSync(filePath, 'utf-8');

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);

  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

function getDocFiles(dir, basePath = dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...getDocFiles(fullPath, basePath));
      }
    } else if (entry.name.endsWith('.md')) {
      files.push({
        path: relativePath,
        full_path: fullPath,
        name: entry.name,
      });
    }
  }

  return files;
}

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 Laravel AI Documentation Server running!`);
  console.log(`\n📁 Docs path: ${DOCS_PATH}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`\n📖 Available endpoints:`);
  console.log(`   GET /api/docs                      - List all documentation files`);
  console.log(`   GET /api/docs/read?file=path/to/file  - Read specific file`);
  console.log(`   GET /api/docs/search?q=query         - Search documentation`);
  console.log(`   GET /api/docs/quick-reference      - Get quick reference`);
  console.log(`   GET /api/docs/templates?type=type     - Get templates`);
  console.log(`   GET /api/docs/checklist?layer=layer   - Get checklist`);
  console.log(`   GET /api/docs/domains?domain=domain    - Get domain examples`);
  console.log(`   GET /api/docs/design-system          - Get design system`);
  console.log(`   GET /*                            - Serve markdown files directly`);
  console.log(`\n💡 For AI Assistant Usage:`);
  console.log(`   When user says "pelajari docs":`);
  console.log(`   1. GET http://localhost:${PORT}/api/docs/quick-reference`);
  console.log(`   2. GET http://localhost:${PORT}/api/docs/templates`);
  console.log(`   3. GET http://localhost:${PORT}/api/docs/checklist`);
  console.log(`   4. Confirm ready\n`);
  console.log(`\n✅ Server ready! Press Ctrl+C to stop.\n`);
});