#!/usr/bin/env node

/**
 * Laravel AI Documentation MCP Server
 * Provides access to Laravel coding standards, templates, and patterns via MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DOCS_PATH = process.env.DOCS_PATH || path.join(__dirname, 'docs');

// Helper function to get all markdown files recursively
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

// Create MCP server instance
const server = new McpServer(
  {
    name: 'laravel-ai-docs',
    version: '2.0.0',
  },
  { capabilities: {} }
);

// Register tool: Get documentation structure
server.registerTool(
  'get_doc_structure',
  {
    description: 'Get the structure of all available documentation files',
    inputSchema: {},
  },
  async () => {
    const files = getDocFiles(DOCS_PATH);

    const structure = {
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
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(structure, null, 2),
      }],
    };
  }
);

// Register tool: Read specific documentation file
server.registerTool(
  'read_doc',
  {
    description: 'Read a specific documentation file',
    inputSchema: {
      file_path: z.string().describe('Path to the documentation file relative to docs root'),
    },
  },
  async ({ file_path }) => {
    const filePath = path.join(DOCS_PATH, file_path);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Documentation file not found: ${file_path}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }
);

// Register tool: Search documentation
server.registerTool(
  'search_docs',
  {
    description: 'Search for content across all documentation files',
    inputSchema: {
      query: z.string().describe('Search query'),
    },
  },
  async ({ query }) => {
    const files = getDocFiles(DOCS_PATH);
    const queryLower = query.toLowerCase();
    const results = [];

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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          matches: results.length,
          results: results.slice(0, 50),
        }, null, 2),
      }],
    };
  }
);

// Register tool: Get quick reference
server.registerTool(
  'get_quick_reference',
  {
    description: 'Get the quick reference documentation (all coding rules)',
    inputSchema: {},
  },
  async () => {
    const filePath = path.join(DOCS_PATH, 'ai/quick-reference.md');

    if (!fs.existsSync(filePath)) {
      throw new Error('Quick reference documentation not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }
);

// Register tool: Get templates
server.registerTool(
  'get_templates',
  {
    description: 'Get implementation templates for CRUD operations',
    inputSchema: {
      template_type: z.enum(['all', 'controller', 'service', 'service_interface', 'model', 'request', 'resource', 'migration']).optional().describe('Template type to get, or "all" for everything'),
    },
  },
  async ({ template_type = 'all' }) => {
    const templatesPath = path.join(DOCS_PATH, 'ai/templates.md');

    if (!fs.existsSync(templatesPath)) {
      throw new Error('Templates documentation not found');
    }

    let content = fs.readFileSync(templatesPath, 'utf-8');

    if (template_type !== 'all') {
      const sections = {
        controller: '1. Controller Template',
        service: '3. Service Implementation Template',
        service_interface: '2. Service Interface Template',
        model: '4. Model Template',
        request: '5. Index Request Template',
        resource: '7. Resource Template',
        migration: '9. Migration Template',
      };

      const sectionStart = content.indexOf(sections[template_type]);
      const sectionEnd = content.indexOf('\n---', sectionStart + 1);

      if (sectionStart === -1) {
        throw new Error(`Template type '${template_type}' not found`);
      }

      content = content.slice(sectionStart, sectionEnd === -1 ? content.length : sectionEnd);
    }

    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }
);

// Register tool: Get checklist
server.registerTool(
  'get_checklist',
  {
    description: 'Get code validation checklist',
    inputSchema: {
      layer: z.enum(['all', 'service', 'controller', 'model', 'request', 'resource', 'migration']).optional().describe('Layer to get checklist for, or "all" for everything'),
    },
  },
  async ({ layer = 'all' }) => {
    const checklistPath = path.join(DOCS_PATH, 'ai/checklist.md');

    if (!fs.existsSync(checklistPath)) {
      throw new Error('Checklist documentation not found');
    }

    let content = fs.readFileSync(checklistPath, 'utf-8');

    if (layer !== 'all') {
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
        throw new Error(`Layer '${layer}' checklist not found`);
      }

      content = content.slice(sectionStart, nextSectionStart === -1 ? content.length : nextSectionStart);
    }

    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }
);

// Register tool: Get domain examples
server.registerTool(
  'get_domain_examples',
  {
    description: 'Get domain-specific implementation examples',
    inputSchema: {
      domain: z.enum(['all', 'ecommerce', 'hr', 'tourism', 'satiket']).optional().describe('Domain to get examples for, or "all" for overview'),
    },
  },
  async ({ domain = 'all' }) => {
    const domainsPath = path.join(DOCS_PATH, 'domains');

    if (domain !== 'all') {
      const domainPath = path.join(domainsPath, domain, 'readme.md');

      if (!fs.existsSync(domainPath)) {
        throw new Error(`Domain '${domain}' examples not found`);
      }

      const content = fs.readFileSync(domainPath, 'utf-8');

      return {
        content: [{
          type: 'text',
          text: content,
        }],
      };
    }

    // Return all domains overview
    const indexContent = fs.readFileSync(path.join(domainsPath, 'readme.md'), 'utf-8');

    return {
      content: [{
        type: 'text',
        text: indexContent,
      }],
    };
  }
);

// Register tool: Get design system
server.registerTool(
  'get_design_system',
  {
    description: 'Get design system documentation',
    inputSchema: {},
  },
  async () => {
    const designPath = path.join(DOCS_PATH, 'design-system.md');

    if (!fs.existsSync(designPath)) {
      throw new Error('Design system documentation not found');
    }

    const content = fs.readFileSync(designPath, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: content,
      }],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Laravel AI Docs MCP server running on stdio');
  console.error(`Docs path: ${DOCS_PATH}`);
  console.error('\nAvailable tools:');
  console.error('  - get_doc_structure: List all documentation files');
  console.error('  - read_doc: Read a specific file');
  console.error('  - search_docs: Search documentation');
  console.error('  - get_quick_reference: Get coding rules');
  console.error('  - get_templates: Get CRUD templates');
  console.error('  - get_checklist: Get validation checklist');
  console.error('  - get_domain_examples: Get domain examples');
  console.error('  - get_design_system: Get design system docs\n');
}

main().catch(console.error);