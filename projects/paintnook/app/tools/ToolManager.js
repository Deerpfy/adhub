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
import { GradientTool } from './tools/GradientTool.js';
import { SelectRectangleTool } from './tools/SelectRectangleTool.js';
import { SelectLassoTool } from './tools/SelectLassoTool.js';
import { MagicWandTool } from './tools/MagicWandTool.js';
import { TransformTool } from './tools/TransformTool.js';
import { TextTool } from './tools/TextTool.js';

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
            move: new MoveTool(this.app),
            gradient: new GradientTool(this.app),
            'select-rectangle': new SelectRectangleTool(this.app),
            'select-lasso': new SelectLassoTool(this.app),
            'magic-wand': new MagicWandTool(this.app),
            transform: new TransformTool(this.app),
            text: new TextTool(this.app)
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

        // Sync with VectorManager if active
        if (this.app.vector?.enabled) {
            const vectorToolMap = {
                brush: 'brush',
                pencil: 'pen',
                line: 'line',
                rectangle: 'rectangle',
                ellipse: 'ellipse',
                text: 'text',
                move: 'select'
            };
            const vectorTool = vectorToolMap[toolName] || 'brush';
            this.app.vector.setTool(vectorTool);
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

        // Tools that use brush cursor preview - hide system cursor
        const brushCursorTools = ['brush', 'pencil', 'eraser'];

        if (brushCursorTools.includes(this.currentTool)) {
            // Let CSS .brush-cursor-active handle cursor: none
            container.style.cursor = '';
            return;
        }

        const cursors = {
            fill: 'crosshair',
            eyedropper: 'crosshair',
            line: 'crosshair',
            rectangle: 'crosshair',
            ellipse: 'crosshair',
            move: 'move',
            gradient: 'crosshair',
            'select-rectangle': 'crosshair',
            'select-lasso': 'crosshair',
            'magic-wand': 'crosshair',
            transform: 'default',
            text: 'text'
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
            move: 'Přesun',
            gradient: 'Přechod',
            'select-rectangle': 'Obdélníkový výběr',
            'select-lasso': 'Lasso',
            'magic-wand': 'Kouzelná hůlka',
            transform: 'Transformace',
            text: 'Text'
        };
        return names[toolName] || toolName;
    }
}
