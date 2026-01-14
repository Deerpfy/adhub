#!/usr/bin/env python3
"""
AdHUB Project Analysis Generator

This script analyzes projects in the AdHUB repository and generates
comprehensive ANALYSIS.md files for each project.

Usage:
    python analyze-projects.py "project1,project2,project3"
    python analyze-projects.py "ai-prompting"
"""

import os
import sys
import re
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Base path for projects
BASE_PATH = Path(__file__).parent.parent.parent / "projects"

# Project metadata and analysis configurations
PROJECT_CONFIGS = {
    "ai-prompting": {
        "name": "AI Prompt Formatter",
        "type": "Web App (SPA)",
        "version": "2.1",
        "status": "Active Development",
        "technologies": ["React 18", "Tailwind CSS", "Babel", "Lucide Icons", "LZ-String"],
        "category": "AI Tools",
        "description": "Research-backed AI prompt formatting tool with multi-model support",
        "main_file": "index.html",
        "features": [
            "15 task categories (coding, creative, analysis, etc.)",
            "9 AI model optimizations (Claude, GPT, Gemini, etc.)",
            "15 research-backed prompting methods",
            "Free AI verification via Pollinations.ai",
            "Auto-save and draft system",
            "Token counter and quality scoring",
            "Share codes and URL sharing",
            "Folder and tag organization",
            "Interactive tutorial",
            "Bilingual support (EN/CS)"
        ]
    },
    "youtube-downloader": {
        "name": "YouTube Downloader",
        "type": "Chrome Extension + Native Host",
        "version": "5.5.0",
        "status": "Active Development",
        "technologies": ["Chrome Extension API (Manifest V3)", "Python", "yt-dlp", "FFmpeg"],
        "category": "Media Tools",
        "description": "Chrome extension for downloading YouTube videos with native host support",
        "main_file": "plugin/manifest.json",
        "features": [
            "Basic mode: Up to 720p direct download",
            "Extended mode: HD/4K/MP3 via yt-dlp",
            "Automatic cookies for age-restricted videos",
            "YouTube Music support",
            "YouTube Shorts support"
        ]
    },
    "chat-panel": {
        "name": "Chat Panel",
        "type": "Web App + WebSocket Server",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS", "Node.js", "WebSocket"],
        "category": "Communication",
        "description": "Multi-stream chat aggregator with real-time WebSocket support",
        "main_file": "index.html",
        "features": [
            "Real-time chat aggregation",
            "Multiple stream sources",
            "WebSocket-based updates"
        ]
    },
    "pdf-editor": {
        "name": "PDF Editor",
        "type": "Web App (Client-Side)",
        "version": "1.0",
        "status": "Active",
        "technologies": ["pdf-lib", "pdf.js", "HTML/CSS/JS"],
        "category": "Document Tools",
        "description": "Client-side PDF editing tool",
        "main_file": "index.html",
        "features": [
            "Edit PDF documents",
            "100% client-side processing",
            "No server upload required"
        ]
    },
    "pdf-merge": {
        "name": "PDF Merge",
        "type": "Web App (Client-Side)",
        "version": "1.0",
        "status": "Active",
        "technologies": ["pdf-lib", "pdf.js", "HTML/CSS/JS"],
        "category": "Document Tools",
        "description": "Client-side PDF merging tool",
        "main_file": "index.html",
        "features": [
            "Merge multiple PDFs",
            "Reorder pages",
            "100% client-side processing"
        ]
    },
    "print3d-calc": {
        "name": "3D Print Calculator",
        "type": "PWA (Offline-First)",
        "version": "1.0",
        "status": "Active",
        "technologies": ["Three.js", "IndexedDB", "Service Worker", "HTML/CSS/JS"],
        "category": "Tools",
        "description": "Offline 3D printing cost calculator with STL analysis",
        "main_file": "index.html",
        "features": [
            "STL file upload and 3D preview",
            "Volume and weight calculation",
            "Configurable pricing engine",
            "Printer and material profiles",
            "100% offline PWA",
            "Export quotes to PDF/JSON"
        ]
    },
    "goalix": {
        "name": "Goalix",
        "type": "Web App (SPA)",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS", "localStorage"],
        "category": "Productivity",
        "description": "Task manager application (formerly MindHub)",
        "main_file": "index.html",
        "features": [
            "Task management",
            "Goal tracking",
            "100% localStorage-based"
        ]
    },
    "cardharvest": {
        "name": "CardHarvest",
        "type": "Chrome Extension + Native Host + Web UI",
        "version": "2.0.0",
        "status": "Active",
        "technologies": ["Chrome Extension API", "Node.js", "steam-user", "steam-totp"],
        "category": "Gaming Tools",
        "description": "Steam trading card farming tool (formerly Steam Farm)",
        "main_file": "plugin/manifest.json",
        "features": [
            "Farm up to 32 games simultaneously",
            "Display remaining trading cards",
            "Automatic 2FA with shared_secret",
            "Local session storage (refresh token)",
            "100% local processing"
        ]
    },
    "scribblix": {
        "name": "Scribblix",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS", "localStorage"],
        "category": "Documentation",
        "description": "Offline documentation tool (formerly DocBook)",
        "main_file": "index.html",
        "features": [
            "Offline documentation",
            "Local storage"
        ]
    },
    "paintnook": {
        "name": "PaintNook",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML Canvas", "CSS", "JavaScript"],
        "category": "Creative Tools",
        "description": "Digital painting application (formerly Paint Studio)",
        "main_file": "index.html",
        "features": [
            "Digital painting canvas",
            "Various brush tools",
            "Vector cursor preview"
        ]
    },
    "slidersnap": {
        "name": "SliderSnap",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS"],
        "category": "Media Tools",
        "description": "Before/after image comparison tool (formerly Juxtapose)",
        "main_file": "index.html",
        "features": [
            "Before/after image comparison",
            "Slider-based interface"
        ]
    },
    "spinning-wheel-giveaway": {
        "name": "Spinning Wheel Giveaway",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS", "Canvas"],
        "category": "Entertainment",
        "description": "Spinning wheel for giveaways and random selection",
        "main_file": "index.html",
        "features": [
            "Customizable wheel segments",
            "Animation effects",
            "Random selection"
        ]
    },
    "resignation-bets": {
        "name": "Resignation Bets",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS"],
        "category": "Entertainment",
        "description": "Betting pool application",
        "main_file": "index.html",
        "features": [
            "Create betting pools",
            "Track participants"
        ]
    },
    "komopizza": {
        "name": "KomoPizza",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS"],
        "category": "Business",
        "description": "Pizza ordering application",
        "main_file": "index.html",
        "features": [
            "Menu display",
            "Order management"
        ]
    },
    "claude-rcs": {
        "name": "Claude RCS Workspace",
        "type": "PWA (Offline-First)",
        "version": "1.0.0",
        "status": "Active",
        "technologies": ["WebRTC", "IndexedDB", "Service Worker", "HTML/CSS/JS"],
        "category": "Collaboration Tools",
        "description": "Offline-first P2P collaboration workspace for AI prompt sharing",
        "main_file": "index.html",
        "features": [
            "Peer-to-peer WebRTC communication",
            "Host/Client role system",
            "Prompt relay with approval workflow",
            "Real-time output streaming",
            "Shared workspace editor",
            "100% offline PWA with IndexedDB storage",
            "Session history and persistence",
            "Manual invite code signaling"
        ]
    }
}


def get_file_stats(project_path: Path) -> Dict[str, Any]:
    """Get file statistics for a project."""
    stats = {
        "total_files": 0,
        "total_size": 0,
        "file_types": {},
        "main_files": []
    }

    if not project_path.exists():
        return stats

    for file_path in project_path.rglob("*"):
        if file_path.is_file() and not file_path.name.startswith("."):
            stats["total_files"] += 1
            stats["total_size"] += file_path.stat().st_size

            ext = file_path.suffix.lower() or "no extension"
            stats["file_types"][ext] = stats["file_types"].get(ext, 0) + 1

            # Track main files
            if file_path.name in ["index.html", "manifest.json", "package.json"]:
                stats["main_files"].append(str(file_path.relative_to(project_path)))

    return stats


def format_size(size_bytes: int) -> str:
    """Format bytes to human-readable size."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def analyze_html_file(file_path: Path) -> Dict[str, Any]:
    """Analyze an HTML file for technologies and patterns."""
    analysis = {
        "libraries": [],
        "frameworks": [],
        "apis": [],
        "features": []
    }

    if not file_path.exists():
        return analysis

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")

        # Detect libraries from CDN links
        library_patterns = {
            "react": r"react[/@\-]",
            "react-dom": r"react-dom",
            "tailwindcss": r"tailwindcss|tailwind\.config",
            "babel": r"babel",
            "lucide": r"lucide",
            "lz-string": r"lz-string",
            "pdf-lib": r"pdf-lib",
            "pdf.js": r"pdf\.js|pdfjs",
            "firebase": r"firebase",
            "chart.js": r"chart\.js|chartjs",
            "jquery": r"jquery",
            "vue": r"vue[/@\-]",
            "angular": r"angular[/@\-]",
            "bootstrap": r"bootstrap"
        }

        for lib, pattern in library_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                analysis["libraries"].append(lib)

        # Detect features
        feature_patterns = {
            "localStorage": r"localStorage\.",
            "sessionStorage": r"sessionStorage\.",
            "IndexedDB": r"indexedDB|IDBDatabase",
            "WebSocket": r"WebSocket",
            "Service Worker": r"serviceWorker|navigator\.serviceWorker",
            "Canvas": r"<canvas|getContext\(['\"]2d",
            "Geolocation": r"navigator\.geolocation",
            "Notifications": r"Notification\.|notification",
            "Clipboard API": r"navigator\.clipboard",
            "File API": r"FileReader|Blob\(",
            "Drag & Drop": r"ondrag|dragstart|dragover",
            "Web Audio": r"AudioContext|webkitAudioContext",
            "WebRTC": r"RTCPeerConnection|getUserMedia",
            "PWA": r"manifest\.json|serviceWorker"
        }

        for feature, pattern in feature_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                analysis["features"].append(feature)

        # Detect external APIs
        api_patterns = {
            "Pollinations.ai": r"pollinations\.ai",
            "Firebase": r"firebaseapp\.com|firebase\.google\.com",
            "Google APIs": r"googleapis\.com",
            "YouTube API": r"youtube\.com/api|ytInitialPlayerResponse",
            "GitHub API": r"api\.github\.com",
            "IP Geolocation": r"ipapi\.co|ip-api\.com"
        }

        for api, pattern in api_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                analysis["apis"].append(api)

    except Exception as e:
        print(f"  Warning: Could not analyze {file_path}: {e}")

    return analysis


def detect_project_type(project_path: Path) -> str:
    """Detect the type of project based on files present."""
    files = [f.name for f in project_path.iterdir()] if project_path.exists() else []

    if "manifest.json" in files or (project_path / "plugin" / "manifest.json").exists():
        return "Chrome Extension"
    elif "package.json" in files:
        pkg_path = project_path / "package.json"
        if pkg_path.exists():
            try:
                pkg = json.loads(pkg_path.read_text())
                if "electron" in str(pkg.get("dependencies", {})):
                    return "Electron App"
                elif any(x in str(pkg.get("dependencies", {})) for x in ["express", "fastify", "koa"]):
                    return "Node.js Server"
            except:
                pass
        return "Node.js App"
    elif "index.html" in files:
        return "Web App"
    elif any(f.endswith(".py") for f in files):
        return "Python Script"
    else:
        return "Unknown"


def generate_analysis_content(project_id: str, project_path: Path) -> str:
    """Generate the ANALYSIS.md content for a project."""
    config = PROJECT_CONFIGS.get(project_id, {})
    stats = get_file_stats(project_path)

    # Get project info or use defaults
    name = config.get("name", project_id.replace("-", " ").title())
    version = config.get("version", "1.0")
    status = config.get("status", "Active")
    project_type = config.get("type", detect_project_type(project_path))
    technologies = config.get("technologies", [])
    category = config.get("category", "General")
    description = config.get("description", f"{name} project")
    features = config.get("features", [])

    # Analyze main HTML file if exists
    main_file = config.get("main_file", "index.html")
    main_path = project_path / main_file
    html_analysis = analyze_html_file(main_path)

    # Merge detected technologies (deduplicate by lowercase)
    all_technologies = {}
    for tech in technologies:
        all_technologies[tech.lower()] = tech
    for lib in html_analysis.get("libraries", []):
        if lib.lower() not in all_technologies:
            all_technologies[lib.lower()] = lib
    technologies_list = sorted(list(all_technologies.values()))

    # Current timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d")

    # Generate markdown content
    content = f"""# {name} - Project Analysis

> **Version:** {version}
> **Last Updated:** {timestamp}
> **Status:** {status}
> **Category:** {category}
> **Type:** {project_type}
> **Repository:** Deerpfy/adhub

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technical Stack](#2-technical-stack)
3. [Project Structure](#3-project-structure)
4. [Features](#4-features)
5. [Dependencies & APIs](#5-dependencies--apis)
6. [Privacy & Security](#6-privacy--security)
7. [Recommendations](#7-recommendations)

---

## 1. Overview

### Description
{description}

### Key Metrics
| Metric | Value |
|--------|-------|
| Total Files | {stats["total_files"]} |
| Total Size | {format_size(stats["total_size"])} |
| Main Entry | `{main_file}` |

---

## 2. Technical Stack

### Technologies
| Technology | Purpose |
|------------|---------|
"""

    # Add technologies table
    for tech in technologies_list:
        purpose = get_technology_purpose(tech)
        content += f"| {tech} | {purpose} |\n"

    content += """
### Browser Features Used
"""
    if html_analysis.get("features"):
        for feature in html_analysis["features"]:
            content += f"- {feature}\n"
    else:
        content += "- Standard web APIs\n"

    content += """
---

## 3. Project Structure

### File Types
| Extension | Count |
|-----------|-------|
"""

    # Add file types
    for ext, count in sorted(stats["file_types"].items(), key=lambda x: -x[1]):
        content += f"| `{ext}` | {count} |\n"

    content += """
### Directory Layout
```
"""
    content += f"{project_id}/\n"
    if project_path.exists():
        for item in sorted(project_path.iterdir()):
            if not item.name.startswith(".") and item.name != "ANALYSIS.md":
                prefix = "├── " if item != list(project_path.iterdir())[-1] else "└── "
                if item.is_dir():
                    content += f"{prefix}{item.name}/\n"
                else:
                    content += f"{prefix}{item.name}\n"
    content += "```\n"

    content += """
---

## 4. Features

"""
    if features:
        for feature in features:
            content += f"- {feature}\n"
    else:
        content += "- Core functionality as described\n"

    content += """
---

## 5. Dependencies & APIs

### External APIs
"""
    if html_analysis.get("apis"):
        content += "| API | Purpose |\n|-----|--------|\n"
        for api in html_analysis["apis"]:
            purpose = get_api_purpose(api)
            content += f"| {api} | {purpose} |\n"
    else:
        content += "No external APIs detected.\n"

    content += """
### Third-Party Libraries
"""
    if html_analysis.get("libraries"):
        for lib in html_analysis["libraries"]:
            content += f"- {lib}\n"
    else:
        content += "- Vanilla JavaScript (no external libraries)\n"

    content += """
---

## 6. Privacy & Security

### Data Storage
| Storage Type | Data Stored |
|--------------|-------------|
"""
    if "localStorage" in html_analysis.get("features", []):
        content += "| localStorage | User preferences, saved data |\n"
    if "sessionStorage" in html_analysis.get("features", []):
        content += "| sessionStorage | Session data |\n"
    if "IndexedDB" in html_analysis.get("features", []):
        content += "| IndexedDB | Structured data |\n"
    if not any(f in html_analysis.get("features", []) for f in ["localStorage", "sessionStorage", "IndexedDB"]):
        content += "| None | No persistent storage |\n"

    content += """
### Privacy Considerations
- 100% client-side processing (where applicable)
- No user accounts required
- Data stays in browser

---

## 7. Recommendations

### Priority: HIGH
- Ensure error handling for all user interactions
- Add loading states for async operations
- Implement input validation

### Priority: MEDIUM
- Add accessibility features (ARIA labels, keyboard navigation)
- Optimize for mobile devices
- Add user documentation

### Priority: LOW
- Consider adding analytics (privacy-friendly)
- Implement dark/light theme toggle
- Add social sharing features

---

*This analysis was auto-generated by the AdHUB Project Analysis System on """ + timestamp + """.*
"""

    return content


def get_technology_purpose(tech: str) -> str:
    """Get the purpose description for a technology."""
    purposes = {
        "react": "UI Component Framework",
        "react-dom": "React DOM Rendering",
        "tailwindcss": "Utility-first CSS Framework",
        "babel": "JavaScript Compiler/Transpiler",
        "lucide": "SVG Icon Library",
        "lz-string": "String Compression",
        "pdf-lib": "PDF Manipulation",
        "pdf.js": "PDF Rendering",
        "firebase": "Backend Services",
        "chart.js": "Data Visualization",
        "jquery": "DOM Manipulation",
        "vue": "UI Framework",
        "angular": "UI Framework",
        "bootstrap": "CSS Framework",
        "Chrome Extension API": "Browser Extension Features",
        "Chrome Extension API (Manifest V3)": "Browser Extension Features",
        "Node.js": "Server-side JavaScript",
        "WebSocket": "Real-time Communication",
        "Python": "Native Host Scripting",
        "yt-dlp": "Video Download Library",
        "FFmpeg": "Media Processing",
        "steam-user": "Steam Protocol Client",
        "steam-totp": "Steam 2FA Support",
        "HTML/CSS/JS": "Core Web Technologies",
        "HTML Canvas": "2D Graphics Rendering",
        "localStorage": "Client-side Storage"
    }
    return purposes.get(tech.lower(), purposes.get(tech, "Core functionality"))


def get_api_purpose(api: str) -> str:
    """Get the purpose description for an API."""
    purposes = {
        "Pollinations.ai": "Free AI text generation",
        "Firebase": "Real-time database and authentication",
        "Google APIs": "Various Google services",
        "YouTube API": "Video metadata and playback",
        "GitHub API": "Repository information",
        "IP Geolocation": "User location detection"
    }
    return purposes.get(api, "External service integration")


def analyze_project(project_id: str) -> bool:
    """Analyze a single project and generate/update ANALYSIS.md."""
    project_path = BASE_PATH / project_id

    if not project_path.exists():
        print(f"  Warning: Project '{project_id}' not found at {project_path}")
        return False

    print(f"  Analyzing: {project_id}")

    try:
        # Generate analysis content
        content = generate_analysis_content(project_id, project_path)

        # Write to ANALYSIS.md
        analysis_path = project_path / "ANALYSIS.md"
        analysis_path.write_text(content, encoding="utf-8")

        print(f"  ✓ Generated: {analysis_path}")
        return True

    except Exception as e:
        print(f"  ✗ Error analyzing {project_id}: {e}")
        return False


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python analyze-projects.py 'project1,project2,...'")
        print("       python analyze-projects.py 'ai-prompting'")
        sys.exit(1)

    projects_arg = sys.argv[1]

    if not projects_arg:
        print("No projects specified")
        sys.exit(0)

    # Parse comma-separated project list
    projects = [p.strip() for p in projects_arg.split(",") if p.strip()]

    print(f"AdHUB Project Analysis")
    print(f"=" * 50)
    print(f"Projects to analyze: {', '.join(projects)}")
    print()

    success_count = 0
    for project_id in projects:
        if analyze_project(project_id):
            success_count += 1

    print()
    print(f"Analysis complete: {success_count}/{len(projects)} projects analyzed")


if __name__ == "__main__":
    main()
