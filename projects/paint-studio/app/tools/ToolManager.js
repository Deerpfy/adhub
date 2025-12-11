/**
 * ToolManager - Manages all drawing tools
 */

import { BrushTool } from './tools/BrushTool.js';
import { PencilTool } from './tools/PencilTool.js';
import { EraserTool } from './tools/EraserTool.js';
import { FillTool } from './tools/FillTool.js';
import { EyedropperTool } from './tools/EyedropperTool.js';
import { LineTool } from './tools/LineTool.js';
import { RectangleTool } from './tools/RectangleTool.js';
import { EllipseTool } from './tools/EllipseTool.js';
import { MoveTool } from './tools/MoveTool.js';

export class ToolManager {
    constructor(app) {
        this.app = app;
        this.tools = {};
        this.currentTool = 'brush';
        this.currentToolInstance = null;
    }

    /**
     * Initialize all tools
     */
    init() {
        // Register tools
        this.tools = {
            brush: new BrushTool(this.app),
            pencil: new PencilTool(this.app),
            eraser: new EraserTool(this.app),
            fill: new FillTool(this.app),
            eyedropper: new EyedropperTool(this.app),
            line: new LineTool(this.app),
            rectangle: new RectangleTool(this.app),
            ellipse: new EllipseTool(this.app),
            move: new MoveTool(this.app)
        };

        // Set default tool
        this.setTool('brush');

        // Setup tool button listeners
        this.setupToolButtons();
    }

    /**
     * Setup tool button click handlers
     */
    setupToolButtons() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.setTool(tool);
            });
        });
    }

    /**
     * Set active tool
     */
    setTool(toolName) {
        if (!this.tools[toolName]) {
            console.warn(`Tool "${toolName}" not found`);
            return;
        }

        // Deactivate current tool
        if (this.currentToolInstance && this.currentToolInstance.deactivate) {
            this.currentToolInstance.deactivate();
        }

        // Set new tool
        this.currentTool = toolName;
        this.currentToolInstance = this.tools[toolName];

        // Activate new tool
        if (this.currentToolInstance.activate) {
            this.currentToolInstance.activate();
        }

        // Update UI
        this.updateToolUI();
        this.app.ui?.updateToolInfo(this.getToolDisplayName(toolName));
    }

    /**
     * Get tool by name
     */
    getTool(name) {
        return this.tools[name] || null;
    }

    /**
     * Update tool UI
     */
    updateToolUI() {
        // Update button active states
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });

        // Update cursor
        this.updateCursor();
    }

    /**
     * Update cursor based on current tool
     */
    updateCursor() {
        const container = this.app.canvas?.container;
        if (!container) return;

        const cursors = {
            brush: 'crosshair',
            pencil: 'crosshair',
            eraser: 'crosshair',
            fill: 'crosshair',
            eyedropper: 'crosshair',
            line: 'crosshair',
            rectangle: 'crosshair',
            ellipse: 'crosshair',
            move: 'move'
        };

        container.style.cursor = cursors[this.currentTool] || 'default';
    }

    /**
     * Get display name for tool
     */
    getToolDisplayName(toolName) {
        const names = {
            brush: 'Štětec',
            pencil: 'Tužka',
            eraser: 'Guma',
            fill: 'Výplň',
            eyedropper: 'Kapátko',
            line: 'Čára',
            rectangle: 'Obdélník',
            ellipse: 'Elipsa',
            move: 'Přesun'
        };
        return names[toolName] || toolName;
    }
}
