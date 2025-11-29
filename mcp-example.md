# MCP (Model Context Protocol) - Konfigurace pro AdHUB

Tento dokument ukazuje priklad konfigurace MCP serveru pro praci s projektem AdHUB.

## Co je MCP?

MCP (Model Context Protocol) je protokol od Anthropic umoznujici AI asistentum pristupovat k externim nastrojum a sluzbam. Claude Code muze pouzivat MCP servery pro rozsireni svych schopnosti.

## Priklad konfigurace

### ~/.config/claude-code/mcp.json (Linux/macOS)
### %APPDATA%\claude-code\mcp.json (Windows)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-filesystem",
        "/home/user/adhub"
      ],
      "description": "Pristup k souborum projektu AdHUB"
    },
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-git",
        "--repository",
        "/home/user/adhub"
      ],
      "description": "Git operace pro AdHUB repository"
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-github"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      },
      "description": "GitHub API pro issues a PRs"
    },
    "web-search": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-brave-search"
      ],
      "env": {
        "BRAVE_API_KEY": "your_brave_api_key"
      },
      "description": "Webove vyhledavani"
    }
  }
}
```

## Dostupne MCP servery

### Oficialni od Anthropic

| Server | Popis | Instalace |
|--------|-------|-----------|
| `@anthropic-ai/mcp-server-filesystem` | Cteni/zapis souboru | `npx -y @anthropic-ai/mcp-server-filesystem /path` |
| `@anthropic-ai/mcp-server-git` | Git operace | `npx -y @anthropic-ai/mcp-server-git --repository /path` |
| `@anthropic-ai/mcp-server-github` | GitHub API | Vyzaduje GITHUB_TOKEN |
| `@anthropic-ai/mcp-server-postgres` | PostgreSQL databaze | Vyzaduje connection string |
| `@anthropic-ai/mcp-server-sqlite` | SQLite databaze | `npx -y @anthropic-ai/mcp-server-sqlite /path/to/db.sqlite` |
| `@anthropic-ai/mcp-server-brave-search` | Brave Search | Vyzaduje BRAVE_API_KEY |

### Komunitni

| Server | Popis |
|--------|-------|
| `mcp-server-docker` | Docker operace |
| `mcp-server-kubernetes` | K8s operace |
| `mcp-server-slack` | Slack integrace |
| `mcp-server-notion` | Notion API |

## Pouziti v Claude Code

Po konfiguraci MCP serveru muze Claude Code pouzivat jeho nastroje:

```
User: Pouzij MCP filesystem k precteni package.json

Claude: [Pouzije mcp__filesystem__read_file]
```

Vsechny MCP nastroje maji prefix `mcp__nazev_serveru__nazev_nastroje`.

## Vlastni MCP server pro AdHUB

Priklad jednoducheho MCP serveru v Pythonu:

### adhub-mcp-server.py

```python
#!/usr/bin/env python3
"""
AdHUB MCP Server - Vlastni nastroje pro praci s projektem
"""

import json
import sys
import os
from typing import Any

# MCP protocol
def send_response(id: str, result: Any):
    response = {
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    }
    print(json.dumps(response))
    sys.stdout.flush()

def send_error(id: str, code: int, message: str):
    response = {
        "jsonrpc": "2.0",
        "id": id,
        "error": {"code": code, "message": message}
    }
    print(json.dumps(response))
    sys.stdout.flush()

# Vlastni nastroje
def get_project_info():
    """Vrati informace o projektech v AdHUB"""
    projects_dir = os.path.join(os.path.dirname(__file__), 'projects')
    projects = []

    for name in os.listdir(projects_dir):
        path = os.path.join(projects_dir, name)
        if os.path.isdir(path):
            has_index = os.path.exists(os.path.join(path, 'index.html'))
            projects.append({
                'name': name,
                'path': path,
                'has_index': has_index
            })

    return projects

def get_extension_version():
    """Vrati verzi YouTube Downloader extension"""
    manifest_path = os.path.join(
        os.path.dirname(__file__),
        'projects/youtube-downloader/plugin/manifest.json'
    )

    with open(manifest_path) as f:
        manifest = json.load(f)

    return manifest.get('version', 'unknown')

# Definice nastroju
TOOLS = {
    "list_projects": {
        "description": "Vrati seznam vsech projektu v AdHUB",
        "handler": get_project_info
    },
    "extension_version": {
        "description": "Vrati aktualni verzi YouTube Downloader extension",
        "handler": get_extension_version
    }
}

def handle_request(request: dict):
    method = request.get('method')
    id = request.get('id')
    params = request.get('params', {})

    if method == 'initialize':
        send_response(id, {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "adhub-mcp",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {}
            }
        })

    elif method == 'tools/list':
        tools = []
        for name, info in TOOLS.items():
            tools.append({
                "name": name,
                "description": info["description"],
                "inputSchema": {"type": "object", "properties": {}}
            })
        send_response(id, {"tools": tools})

    elif method == 'tools/call':
        tool_name = params.get('name')
        if tool_name in TOOLS:
            try:
                result = TOOLS[tool_name]["handler"]()
                send_response(id, {
                    "content": [{"type": "text", "text": json.dumps(result, indent=2)}]
                })
            except Exception as e:
                send_error(id, -32000, str(e))
        else:
            send_error(id, -32601, f"Unknown tool: {tool_name}")

    else:
        send_error(id, -32601, f"Unknown method: {method}")

def main():
    for line in sys.stdin:
        try:
            request = json.loads(line)
            handle_request(request)
        except json.JSONDecodeError:
            pass

if __name__ == '__main__':
    main()
```

### Registrace vlastniho serveru

```json
{
  "mcpServers": {
    "adhub": {
      "command": "python3",
      "args": ["/home/user/adhub/adhub-mcp-server.py"],
      "description": "Vlastni AdHUB nastroje"
    }
  }
}
```

## Uzitecne odkazy

- [MCP Dokumentace](https://docs.anthropic.com/en/docs/mcp)
- [MCP GitHub Repository](https://github.com/anthropics/mcp)
- [Oficialni MCP Servery](https://github.com/anthropics/mcp-servers)
- [Claude Code Dokumentace](https://docs.anthropic.com/en/docs/claude-code)

## Tipy

1. **Testovani** - Pred pouzitim otestuj MCP server rucne:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | python3 adhub-mcp-server.py
   ```

2. **Logovani** - Pro debugging pridej logovani do souboru (ne stdout!)

3. **Bezpecnost** - Nikdy neukladej tokeny primo do konfigurace, pouzij environment variables

4. **Restart** - Po zmene konfigurace restartuj Claude Code
