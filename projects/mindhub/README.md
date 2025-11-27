# MindHub - Personal Coordination Platform

## 🚀 Quick Start

**Simply double-click `index.html`** to open the application in your browser!

The application runs **100% locally** without any server:
- ✅ All data stored in browser localStorage
- ✅ All scripts local or via CDN
- ✅ Design is local (CSS in HTML)
- ✅ Works offline
- ✅ No installation needed

## 📋 Features Implemented

### Core Features (from spec)
- ✅ **Task Management** - Create, update, complete, delete tasks
- ✅ **Quick Capture** - Fast task entry with tags (#tag)
- ✅ **Projects** - Organize tasks into projects
- ✅ **Tags** - Tag tasks for organization
- ✅ **Inbox** - Untriaged task stream
- ✅ **Today View** - Tasks due today and high priority
- ✅ **Command Palette** - Global search (Cmd/Ctrl+K)
- ✅ **Light/Dark/High-Contrast Themes**
- ✅ **LocalStorage** - All data stored locally
- ✅ **Agent Integration** - AI suggestions system (simulated)

### UI Components (Section 5)
- ✅ QuickCapture - Fast task entry
- ✅ TaskCard - Task display with completion
- ✅ CommandPalette - Global search and actions
- ✅ ConfirmationDialog - Destructive action confirmation

### Pages (Section 4)
- ✅ Inbox - Quick capture stream
- ✅ Today - Today's tasks and high priority
- ✅ Projects - Project list and detail views
- ✅ Calendar - Placeholder (coming soon)
- ✅ Habits - Placeholder (coming soon)
- ✅ Settings - Theme and agent settings
- ✅ Search - Full-text task search

### Visual System (Section 3)
- ✅ Design tokens (CSS variables)
- ✅ Light theme
- ✅ Dark theme
- ✅ High-contrast theme
- ✅ Proper color palette
- ✅ Typography system
- ✅ Spacing and radii tokens

### Data Model (Section 7)
- ✅ Tasks (with all fields from spec)
- ✅ Projects
- ✅ Tags
- ✅ Subtasks
- ✅ Task-Tag relationships
- ✅ Attachments (structure)
- ✅ Agent Actions
- ✅ User management

### Agent Integration (Section 9)
- ✅ Agent suggestion system
- ✅ Triage inbox suggestions
- ✅ Task suggestions
- ✅ Apply suggestions functionality

## 📁 Project Structure

```
mindhub/
├── index.html          # Main HTML file (double-click this!)
├── css/
│   └── styles.css     # Visual system and design tokens
└── js/
    ├── storage.js      # LocalStorage service (replaces PostgreSQL)
    ├── utils.js        # Utility functions
    ├── contexts.js     # React contexts (Theme, Auth, Refresh)
    ├── components.js   # UI components
    ├── pages.js        # Page components
    ├── agent.js        # Agent integration
    ├── app.js          # Main app and layout
    └── main.js         # Entry point
```

## 🎨 Design System

The application follows the spec's visual system:
- Primary color: `#2563EB` (blue)
- Accent color: `#06B6D4` (teal)
- All design tokens as CSS variables
- WCAG AA compliant contrast ratios

## 💾 Data Storage

All data is stored in browser localStorage:
- `mindhub_tasks` - Tasks
- `mindhub_projects` - Projects
- `mindhub_tags` - Tags
- `mindhub_subtasks` - Subtasks
- `mindhub_task_tags` - Task-Tag relationships
- `mindhub_attachments` - Attachments
- `mindhub_agent_actions` - Agent actions
- `mindhub_user` - Current user
- `mindhub_theme` - Theme preference
- `mindhub_settings` - User settings

## ⌨️ Keyboard Shortcuts

- `Cmd/Ctrl + K` - Open command palette
- `Space` - Toggle task completion (when focused)
- `Enter` - Open task details (when focused)
- `Tab` - Navigate between elements

## 🔧 Technical Stack

- **React 18** (via CDN)
- **Babel Standalone** (for JSX)
- **LocalStorage API** (for data)
- **Vanilla CSS** (design tokens)

## 📝 Usage

1. **Open** `index.html` in your browser
2. **Login** - Enter your email (or register)
3. **Start using** - Add tasks, create projects, organize!

## 🆚 Differences from Full Spec

This is a **local-only** implementation:
- Uses localStorage instead of PostgreSQL
- No backend server (all client-side)
- Agent suggestions are rule-based (not real AI)
- No WebSocket real-time (simulated with refresh)
- No file attachments upload (structure ready)
- Calendar and Habits are placeholders

## 🚧 Future Enhancements

- Calendar view with drag & drop
- Habit tracker with streaks
- Task detail sidebar
- Kanban board view
- Subtask management
- File attachments
- Export/import data
- Real AI agent integration

## 📄 License

MIT

---

**Created according to the MindHub Technical Specification**
