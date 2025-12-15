# PaintNook Architecture Documentation

## Project Overview

PaintNook is a professional offline-first digital painting application with layers, brushes, pressure sensitivity, and real-time collaboration support.

## Directory Structure

```
projects/paintnook/
├── index.html              # Main HTML entry point
├── styles.css              # Global styles
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker for offline support
├── ARCHITECTURE.md         # This file
├── app/
│   ├── main.js             # Application entry point
│   ├── core/
│   │   ├── PaintApp.js           # Main application controller
│   │   ├── CanvasManager.js      # Canvas rendering, zoom, pan, input
│   │   ├── LayerManager.js       # Layer management with blend modes
│   │   ├── HistoryManager.js     # Undo/redo functionality
│   │   └── CollaborationManager.js # P2P collaboration via PeerJS
│   ├── tools/
│   │   ├── ToolManager.js        # Tool switching and management
│   │   ├── BrushEngine.js        # Core brush drawing functionality
│   │   ├── QuickShape.js         # Shape detection from strokes
│   │   ├── StreamLine.js         # Stroke smoothing
│   │   ├── SelectionManager.js   # Selection tools
│   │   └── tools/                # Individual tool implementations
│   │       ├── BrushTool.js
│   │       ├── PencilTool.js
│   │       ├── EraserTool.js
│   │       ├── FillTool.js
│   │       ├── LineTool.js
│   │       ├── RectangleTool.js
│   │       ├── EllipseTool.js
│   │       └── ...
│   ├── pixelart/
│   │   ├── PixelArtManager.js    # Pixel art mode controller
│   │   ├── AnimationManager.js   # Frame animation support
│   │   └── ColorAdjustments.js   # Color manipulation
│   ├── ui/
│   │   ├── UIController.js       # Main UI controller
│   │   ├── ColorPicker.js        # Color selection
│   │   └── PixelArtUI.js         # Pixel art specific UI
│   └── utils/
│       ├── StorageManager.js     # IndexedDB storage
│       ├── BackgroundRemover.js  # AI background removal
│       └── GoogleFontsManager.js # Font management
└── sync/                   # NEW: Synchronization system
    ├── types.js            # Universal Action Format (UAF)
    ├── SyncEngine.js       # Main sync engine with retry logic
    ├── ConflictResolver.js # Host priority conflict resolution
    ├── ActionQueue.js      # Action batching and queuing
    ├── RenderAdapter.js    # View-mode aware rendering
    └── PaintNookSync.js    # Integration wrapper
```

## Core Components

### PaintApp (`app/core/PaintApp.js`)
- Main application controller
- Coordinates all managers and tools
- Handles project lifecycle (new, save, load, export)
- Key properties:
  - `canvas` - CanvasManager instance
  - `layers` - LayerManager instance
  - `tools` - ToolManager instance
  - `brush` - BrushEngine instance
  - `pixelArt` - PixelArtManager instance
  - `collab` - CollaborationManager instance

### CanvasManager (`app/core/CanvasManager.js`)
- Manages canvas rendering and input
- Handles zoom, pan, and coordinate transformation
- Key methods:
  - `screenToCanvas(x, y)` - Convert screen to canvas coordinates
  - `render()` - Composite all layers to main canvas
  - `startRemoteStroke()`, `continueRemoteStroke()`, `endRemoteStroke()` - Remote collaboration

### LayerManager (`app/core/LayerManager.js`)
- Layer management with blend modes and folders
- Maximum 32 layers (similar to Procreate)
- Key properties:
  - `layers[]` - Array of layer objects
  - `activeLayerIndex` - Currently selected layer
- Layer object structure:
  ```javascript
  {
    id: string,
    name: string,
    type: 'layer' | 'folder' | 'text',
    canvas: HTMLCanvasElement,
    visible: boolean,
    locked: boolean,
    opacity: number (0-1),
    blendMode: string,
    parentId: string | null
  }
  ```

### BrushEngine (`app/core/tools/BrushEngine.js`)
- Core brush rendering with multiple brush types
- **CRITICAL**: Has two distinct rendering paths:
  1. **Normal mode** (`drawPoint`, `drawStroke`): Uses brush stamps with gradients
  2. **Pixel art mode** (`drawPixelArtPoint`, `drawPixelArtStroke`): Grid-snapped discrete pixels
- Key properties:
  - `size`, `opacity`, `hardness`, `spacing`
  - `currentBrushType` - 'round', 'soft', 'pixel', etc.

### PixelArtManager (`app/pixelart/PixelArtManager.js`)
- Controls pixel art mode
- Key properties:
  - `enabled` - Boolean toggle
  - `grid.size` - Pixel/cell size (1-64)
  - `snap.enabled` - Grid snapping
  - `pixelPerfect.enabled` - Pixel perfect rendering
  - `palette.colors` - Active color palette

### CollaborationManager (`app/core/CollaborationManager.js`)
- P2P collaboration using PeerJS (WebRTC)
- Host/guest model
- **Current limitations** (to be fixed by sync system):
  - No coordinate normalization
  - No view-mode aware rendering
  - No conflict resolution

## Event Flow

### Drawing Flow
```
User Input (pointer events)
    ↓
CanvasManager.handlePointerDown/Move/Up()
    ↓
screenToCanvas() → canvas coordinates
    ↓
ToolManager.currentToolInstance.onStart/onMove/onEnd()
    ↓
BrushEngine.drawStroke() or BrushEngine.drawPixelArtStroke()
    ↓
LayerManager.getActiveContext() → render to layer canvas
    ↓
CanvasManager.render() → composite to main canvas
    ↓
CollaborationManager.broadcastStroke*() → send to peers
```

### Collaboration Flow (Current)
```
Host draws stroke
    ↓
CollaborationManager.broadcastStrokeStart/Move/End()
    ↓
PeerJS DataChannel → Guest
    ↓
CollaborationManager.handleRemoteStroke*()
    ↓
CanvasManager.startRemoteStroke() [PROBLEM: Uses same rendering regardless of mode]
```

## The Cross-Mode Rendering Problem

**Problem**: When host draws in digital mode and client is in pixel art mode (or vice versa), they see different results.

**Root Cause**:
1. Host sends raw canvas coordinates: `{ x: 100.5, y: 200.3, pressure: 0.7 }`
2. Guest receives and renders using their local view mode
3. Digital mode renders smooth strokes with brush stamps
4. Pixel art mode renders grid-snapped discrete pixels

**Example**:
- Host (digital mode): Draws smooth curved line at coordinates (100, 200) to (150, 220)
- Client (pixel art, grid=8): Same coordinates snap to different grid cells
- Result: Completely different visual output

**Solution**: Universal Action Format (UAF) with RenderAdapter
1. Normalize all coordinates to 0-1 range
2. Send normalized UAF actions
3. Each client renders using RenderAdapter based on their local view mode
4. Result: Semantically equivalent output adapted to view mode

## Data Formats

### Stroke Data (Current)
```javascript
{
  type: 'stroke-start' | 'stroke-move' | 'stroke-end',
  point: { x: number, y: number, pressure: number },
  tool: string,
  settings: { size, opacity, color, ... }
}
```

### Universal Action Format (UAF) - New
```javascript
{
  id: string (UUID),
  type: 'stroke' | 'shape' | 'fill' | 'erase' | 'layer_*',
  authorId: string,
  timestamp: number,
  vectorClock: number,
  layerId: string,
  priority: 0 | 1, // 0=normal, 1=host
  data: {
    // Coordinates normalized to 0-1
    points: [{ x: 0-1, y: 0-1, pressure: 0-1, timestamp: ms }],
    brushSize: 0-1 (relative to canvas width),
    color: { r, g, b, a },
    brushType: string,
    blendMode: string,
    opacity: 0-1
  }
}
```

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES Modules)
- **Rendering**: Canvas 2D API
- **Networking**: PeerJS (WebRTC) for P2P collaboration
- **Storage**: IndexedDB via StorageManager
- **PWA**: Service Worker for offline support

## Sync System Architecture

### Components

1. **SyncEngine** (`sync/SyncEngine.js`)
   - Main synchronization controller
   - Manages session lifecycle (create, join, leave)
   - Handles action sending with retry logic
   - Normalizes actions to UAF format

2. **ConflictResolver** (`sync/ConflictResolver.js`)
   - Resolves conflicts when multiple users draw simultaneously
   - Strategies: 'host-override', 'crdt', 'last-write-wins'
   - Uses vector clocks for ordering

3. **ActionQueue** (`sync/ActionQueue.js`)
   - Batches actions for efficient network transmission
   - Configurable max size and flush interval

4. **RenderAdapter** (`sync/RenderAdapter.js`)
   - **KEY COMPONENT** for solving the cross-mode problem
   - Renders UAF actions according to local view mode
   - Digital mode: Smooth strokes with pressure
   - Pixel art mode: Bresenham lines with grid snapping

5. **PaintNookSync** (`sync/PaintNookSync.js`)
   - Integration wrapper
   - Bridges existing CollaborationManager with new sync system
   - Handles tool events and converts to UAF actions

### Data Flow with Sync System

```
Host draws stroke (digital mode)
    ↓
PaintNookSync.sendStroke()
    ↓
SyncEngine.normalizeAction() → UAF (coordinates 0-1)
    ↓
SyncEngine.sendWithRetry() → PeerJS
    ↓
Client receives UAF action
    ↓
ConflictResolver.resolve() → check host priority
    ↓
RenderAdapter.render() → adapts to local view mode (pixel art)
    ↓
Result: Semantically equivalent output in pixel art style
```
