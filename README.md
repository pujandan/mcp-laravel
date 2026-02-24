# Laravel AI - MCP Server

MCP (Model Context Protocol) server for providing Laravel AI documentation to Claude Code and other AI assistants.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Clone or navigate to the project directory
cd laravel-ai
npm install
```

### 2. Start MCP Server

```bash
npm start
```

Documentation is expected to be in: `./docs` (relative to project root)

## ⚙️ Claude Code Configuration

Add to your Claude Code settings (`~/.config/claude-code/config.json`):

```json
{
  "mcpServers": {
    "laravel-ai": {
      "command": "node",
      "args": ["path/to/laravel-ai/index.js"]
    }
  }
}
```

### Alternative: With Custom Docs Path

If your documentation is in a different location:

```json
{
  "mcpServers": {
    "laravel-ai": {
      "command": "node",
      "args": ["path/to/laravel-ai/index.js"],
      "env": {
        "DOCS_PATH": "/path/to/your/docs"
      }
    }
  }
}
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `get_doc_structure` | Get all documentation files structure |
| `read_doc` | Read a specific documentation file |
| `search_docs` | Search across all documentation |
| `get_quick_reference` | Get all coding rules (quick-reference.md) |
| `get_templates` | Get CRUD templates (specific or all) |
| `get_checklist` | Get validation checklist (specific layer or all) |
| `get_domain_examples` | Get domain-specific examples |
| `get_design_system` | Get design system documentation |

## 📁 Documentation Structure

```
laravel-ai/
├── docs/                          # Documentation folder
│   ├── ai/
│   │   ├── quick-reference.md    # All coding rules
│   │   ├── templates.md           # Implementation templates
│   │   └── checklist.md           # Validation checklist
│   ├── domains/
│   │   ├── ecommerce/             # E-commerce examples
│   │   ├── hr/                    # HR examples
│   │   └── tourism/               # Tourism examples
│   ├── patterns/                  # Pattern documentation
│   └── design-system.md          # Design system (configurable)
├── index.js                       # MCP server
├── package.json                   # Dependencies
└── README.md                      # This file
```

## 💡 Usage Examples

### For AI Assistant

When user says "pelajari docs", AI should:

```javascript
// 1. Get quick reference
mcp.call_tool('get_quick_reference')

// 2. Get templates
mcp.call_tool('get_templates', { template_type: 'all' })

// 3. Get checklist
mcp.call_tool('get_checklist', { layer: 'all' })

// 4. Confirm ready
```

### Search Documentation

```javascript
// Search for "transaction"
mcp.call_tool('search_docs', { query: 'transaction' })
```

### Get Domain Examples

```javascript
// Get e-commerce examples
mcp.call_tool('get_domain_examples', { domain: 'ecommerce' })

// Get all domains overview
mcp.call_tool('get_domain_examples', { domain: 'all' })
```

## 🔧 Development

### Watch Mode

```bash
npm run dev
```

### Testing

Test the MCP server manually:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node index.js
```

## 📝 Notes

- This server uses **stdio** transport for communication
- All documentation is read from the file system
- No caching - always reads latest documentation
- Supports incremental updates to documentation

## 🔄 Updates

When documentation is updated, just restart the MCP server:

```bash
# Stop current server (Ctrl+C)
npm start
```

---

**Version:** 1.0.0
**Last Updated:** 2026-02-23