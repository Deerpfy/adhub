/**
 * GIF.js - Client-side GIF encoder
 * Based on gif.js library (MIT License)
 * https://github.com/jnordberg/gif.js
 *
 * Enhanced version with Octree quantization for SliderSnap Offline
 * Octree provides much more stable color mapping than NeuQuant
 */

(function(root) {
    'use strict';

    // GIF Encoder Class
    function GIF(options) {
        this.options = Object.assign({
            workers: 2,
            quality: 10,
            width: null,
            height: null,
            workerScript: 'gif.worker.js',
            repeat: 0,
            background: '#fff',
            transparent: null,
            dither: false
        }, options);

        this.frames = [];
        this.freeWorkers = [];
        this.activeWorkers = [];
        this.running = false;
        this.finishedFrames = 0;

        this._events = {};
    }

    GIF.prototype.on = function(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);
        return this;
    };

    GIF.prototype.emit = function(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(function(callback) {
                callback(data);
            });
        }
        return this;
    };

    GIF.prototype.addFrame = function(image, options) {
        options = Object.assign({
            delay: 500,
            copy: false,
            dispose: -1
        }, options);

        var frame = {
            delay: options.delay,
            dispose: options.dispose,
            data: null
        };

        if (image instanceof CanvasRenderingContext2D) {
            if (options.copy) {
                var canvas = document.createElement('canvas');
                canvas.width = image.canvas.width;
                canvas.height = image.canvas.height;
                var ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image.canvas, 0, 0);
                frame.data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } else {
                frame.data = image.getImageData(0, 0, image.canvas.width, image.canvas.height);
            }
        } else if (image instanceof ImageData) {
            frame.data = image;
        } else if (image instanceof HTMLCanvasElement) {
            frame.data = image.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, image.width, image.height);
        }

        if (!this.options.width) {
            this.options.width = frame.data.width;
        }
        if (!this.options.height) {
            this.options.height = frame.data.height;
        }

        this.frames.push(frame);
        return this;
    };

    GIF.prototype.render = function() {
        if (this.running) {
            return;
        }
        this.running = true;

        var self = this;

        // Use inline worker approach for better offline support
        this._renderInline();
    };

    GIF.prototype._renderInline = function() {
        var self = this;

        try {
            if (!this.frames || this.frames.length === 0) {
                throw new Error('No frames to encode');
            }

            console.log('[GIF] Starting GIF generation with', this.frames.length, 'frames');
            console.log('[GIF] Using Octree quantization for stable color mapping');

            var encoder = new GIFEncoder(this.options.width, this.options.height);

            encoder.setRepeat(this.options.repeat);
            encoder.setQuality(this.options.quality);
            encoder.setDither(this.options.dither);

            // Build global palette from ALL frames using Octree
            console.log('[GIF] Building global palette from all frames...');
            var globalPalette = this._buildGlobalPalette();
            encoder.setGlobalPalette(globalPalette);

            encoder.start();

            var totalFrames = this.frames.length;

            this.frames.forEach(function(frame, index) {
                if (!frame.data || !frame.data.data) {
                    throw new Error('Invalid frame data at index ' + index);
                }

                encoder.setDelay(frame.delay);
                encoder.addFrame(frame.data.data);

                self.emit('progress', (index + 1) / totalFrames);
            });

            encoder.finish();

            var binary = encoder.stream().getData();
            console.log('[GIF] Output size:', Math.round(binary.length / 1024), 'KB');

            var blob = new Blob([new Uint8Array(binary)], { type: 'image/gif' });

            self.emit('finished', blob);
        } catch (err) {
            console.error('[GIF] Error:', err);
            self.emit('error', err);
        } finally {
            self.running = false;
        }
    };

    // Build global palette using Octree quantization from ALL frames
    GIF.prototype._buildGlobalPalette = function() {
        var octree = new OctreeQuantizer();

        // Add colors from ALL frames to build comprehensive palette
        for (var f = 0; f < this.frames.length; f++) {
            var frameData = this.frames[f].data.data;
            // Sample every Nth pixel for large frames
            var step = Math.max(1, Math.floor(frameData.length / (4 * 50000))); // Max ~50k samples per frame

            for (var i = 0; i < frameData.length; i += 4 * step) {
                octree.addColor(frameData[i], frameData[i + 1], frameData[i + 2]);
            }
        }

        // Build 256-color palette
        var palette = octree.buildPalette(256);
        console.log('[GIF] Built palette with', palette.colors.length, 'colors');

        return palette;
    };

    /**
     * Octree Color Quantization
     * More stable and deterministic than NeuQuant neural network
     */
    function OctreeNode() {
        this.red = 0;
        this.green = 0;
        this.blue = 0;
        this.pixelCount = 0;
        this.children = new Array(8);
        this.isLeaf = false;
        this.paletteIndex = -1;
    }

    function OctreeQuantizer() {
        this.root = new OctreeNode();
        this.leafCount = 0;
        this.reducibleNodes = [];
        for (var i = 0; i <= 8; i++) {
            this.reducibleNodes[i] = [];
        }
        this.maxColors = 256;
        this.palette = [];
    }

    OctreeQuantizer.prototype.addColor = function(r, g, b) {
        this._addColorToNode(this.root, r, g, b, 0);

        // Reduce tree if we have too many colors
        while (this.leafCount > this.maxColors * 2) {
            this._reduceTree();
        }
    };

    OctreeQuantizer.prototype._addColorToNode = function(node, r, g, b, level) {
        if (node.isLeaf) {
            node.red += r;
            node.green += g;
            node.blue += b;
            node.pixelCount++;
            return;
        }

        if (level >= 8) {
            node.isLeaf = true;
            node.red = r;
            node.green = g;
            node.blue = b;
            node.pixelCount = 1;
            this.leafCount++;
            return;
        }

        var index = this._getColorIndex(r, g, b, level);

        if (!node.children[index]) {
            node.children[index] = new OctreeNode();
            // Track reducible nodes (non-leaf nodes at each level)
            if (level < 7) {
                this.reducibleNodes[level].push(node.children[index]);
            }
        }

        this._addColorToNode(node.children[index], r, g, b, level + 1);
    };

    OctreeQuantizer.prototype._getColorIndex = function(r, g, b, level) {
        var index = 0;
        var mask = 0x80 >> level;

        if (r & mask) index |= 4;
        if (g & mask) index |= 2;
        if (b & mask) index |= 1;

        return index;
    };

    OctreeQuantizer.prototype._reduceTree = function() {
        // Find deepest level with reducible nodes
        var level = 7;
        while (level > 0 && this.reducibleNodes[level].length === 0) {
            level--;
        }

        if (this.reducibleNodes[level].length === 0) {
            return;
        }

        // Get node to reduce
        var node = this.reducibleNodes[level].pop();

        // Merge children into this node
        var r = 0, g = 0, b = 0, count = 0;

        for (var i = 0; i < 8; i++) {
            var child = node.children[i];
            if (child) {
                if (child.isLeaf) {
                    r += child.red;
                    g += child.green;
                    b += child.blue;
                    count += child.pixelCount;
                    this.leafCount--;
                }
                node.children[i] = null;
            }
        }

        node.isLeaf = true;
        node.red = r;
        node.green = g;
        node.blue = b;
        node.pixelCount = count;
        this.leafCount++;
    };

    OctreeQuantizer.prototype.buildPalette = function(maxColors) {
        this.maxColors = maxColors;

        // Reduce until we have the right number of colors
        while (this.leafCount > maxColors) {
            this._reduceTree();
        }

        // Build palette from leaves
        this.palette = [];
        this._buildPaletteFromNode(this.root);

        // Create flat color table (RGB triplets)
        var colorTab = [];
        for (var i = 0; i < this.palette.length; i++) {
            colorTab.push(this.palette[i].r);
            colorTab.push(this.palette[i].g);
            colorTab.push(this.palette[i].b);
        }

        // Pad to 256 colors
        while (colorTab.length < 768) {
            colorTab.push(0);
        }

        return {
            colors: this.palette,
            colorTab: colorTab,
            quantizer: this
        };
    };

    OctreeQuantizer.prototype._buildPaletteFromNode = function(node) {
        if (node.isLeaf && node.pixelCount > 0) {
            var r = Math.round(node.red / node.pixelCount);
            var g = Math.round(node.green / node.pixelCount);
            var b = Math.round(node.blue / node.pixelCount);

            node.paletteIndex = this.palette.length;
            this.palette.push({ r: r, g: g, b: b });
            return;
        }

        for (var i = 0; i < 8; i++) {
            if (node.children[i]) {
                this._buildPaletteFromNode(node.children[i]);
            }
        }
    };

    // Fast color lookup using the tree structure
    OctreeQuantizer.prototype.getColorIndex = function(r, g, b) {
        return this._getColorIndexFromNode(this.root, r, g, b, 0);
    };

    OctreeQuantizer.prototype._getColorIndexFromNode = function(node, r, g, b, level) {
        if (node.isLeaf) {
            return node.paletteIndex;
        }

        var index = this._getColorIndex(r, g, b, level);
        var child = node.children[index];

        if (child) {
            return this._getColorIndexFromNode(child, r, g, b, level + 1);
        }

        // Find closest available child
        return this._findClosestChild(node, r, g, b);
    };

    OctreeQuantizer.prototype._findClosestChild = function(node, r, g, b) {
        // Find any available child and get its palette index
        for (var i = 0; i < 8; i++) {
            if (node.children[i]) {
                if (node.children[i].isLeaf) {
                    return node.children[i].paletteIndex;
                }
                return this._findClosestChild(node.children[i], r, g, b);
            }
        }
        return 0;
    };

    // Alternative: Find closest color by brute force (more accurate but slower)
    OctreeQuantizer.prototype.findClosestPaletteIndex = function(r, g, b) {
        var minDist = Infinity;
        var minIndex = 0;

        for (var i = 0; i < this.palette.length; i++) {
            var c = this.palette[i];
            var dr = r - c.r;
            var dg = g - c.g;
            var db = b - c.b;
            var dist = dr * dr + dg * dg + db * db;

            if (dist < minDist) {
                minDist = dist;
                minIndex = i;
                if (dist === 0) break; // Exact match
            }
        }

        return minIndex;
    };

    // LZW Encoder
    function LZWEncoder(width, height, pixels, colorDepth) {
        var EOF = -1;
        var imgW = width;
        var imgH = height;
        var pixAry = pixels;
        var initCodeSize = Math.max(2, colorDepth);

        var accum = new Uint8Array(256);
        var htab = new Int32Array(5003);
        var codetab = new Int32Array(5003);

        var cur_accum;
        var cur_bits;
        var a_count;
        var free_ent;
        var maxcode;
        var clear_flg;
        var g_init_bits;
        var ClearCode;
        var EOFCode;
        var remaining;
        var curPixel;
        var n_bits;

        var byteOut = [];

        function char_out(c) {
            accum[a_count++] = c;
            if (a_count >= 254) {
                flush_char();
            }
        }

        function cl_block() {
            cl_hash(5003);
            free_ent = ClearCode + 2;
            clear_flg = true;
            output(ClearCode);
        }

        function cl_hash(hsize) {
            for (var i = 0; i < hsize; i++) {
                htab[i] = -1;
            }
        }

        function compress(init_bits) {
            var fcode;
            var c;
            var i;
            var ent;
            var disp;
            var hsize_reg;
            var hshift;

            g_init_bits = init_bits;
            clear_flg = false;
            n_bits = g_init_bits;
            maxcode = (1 << n_bits) - 1;

            ClearCode = 1 << (init_bits - 1);
            EOFCode = ClearCode + 1;
            free_ent = ClearCode + 2;

            a_count = 0;
            ent = nextPixel();

            hshift = 0;
            for (fcode = 5003; fcode < 65536; fcode *= 2) {
                hshift++;
            }
            hshift = 8 - hshift;
            hsize_reg = 5003;
            cl_hash(hsize_reg);

            output(ClearCode);

            while ((c = nextPixel()) !== EOF) {
                fcode = (c << 12) + ent;
                i = (c << hshift) ^ ent;

                if (htab[i] === fcode) {
                    ent = codetab[i];
                    continue;
                } else if (htab[i] >= 0) {
                    disp = hsize_reg - i;
                    if (i === 0) disp = 1;
                    do {
                        if ((i -= disp) < 0) {
                            i += hsize_reg;
                        }
                        if (htab[i] === fcode) {
                            ent = codetab[i];
                            continue;
                        }
                    } while (htab[i] >= 0);
                }
                output(ent);
                ent = c;
                if (free_ent < 4096) {
                    codetab[i] = free_ent++;
                    htab[i] = fcode;
                } else {
                    cl_block();
                }
            }
            output(ent);
            output(EOFCode);
        }

        function flush_char() {
            if (a_count > 0) {
                byteOut.push(a_count);
                for (var i = 0; i < a_count; i++) {
                    byteOut.push(accum[i]);
                }
                a_count = 0;
            }
        }

        var masks = [0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF,
            0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF];

        function output(code) {
            cur_accum &= masks[cur_bits];

            if (cur_bits > 0) {
                cur_accum |= (code << cur_bits);
            } else {
                cur_accum = code;
            }

            cur_bits += n_bits;

            while (cur_bits >= 8) {
                char_out(cur_accum & 0xff);
                cur_accum >>= 8;
                cur_bits -= 8;
            }

            if (free_ent > maxcode || clear_flg) {
                if (clear_flg) {
                    n_bits = g_init_bits;
                    maxcode = (1 << n_bits) - 1;
                    clear_flg = false;
                } else {
                    n_bits++;
                    if (n_bits === 12) {
                        maxcode = 4096;
                    } else {
                        maxcode = (1 << n_bits) - 1;
                    }
                }
            }

            if (code === EOFCode) {
                while (cur_bits > 0) {
                    char_out(cur_accum & 0xff);
                    cur_accum >>= 8;
                    cur_bits -= 8;
                }
                flush_char();
            }
        }

        function nextPixel() {
            if (remaining === 0) return EOF;
            remaining--;
            return pixAry[curPixel++] & 0xff;
        }

        function encode() {
            cur_accum = 0;
            cur_bits = 0;
            remaining = imgW * imgH;
            curPixel = 0;

            byteOut.push(initCodeSize);
            compress(initCodeSize + 1);
            byteOut.push(0);

            return byteOut;
        }

        return {
            encode: encode
        };
    }

    // GIF Encoder with Global Palette Support
    function GIFEncoder(width, height) {
        var out = [];
        var image = null;
        var globalPalette = null;
        var colorDepth = 8;
        var palSize = 7;
        var dispose = -1;
        var repeat = 0;
        var firstFrame = true;
        var sample = 10;
        var delay = 0;
        var useDither = false;

        function setGlobalPalette(paletteData) {
            if (paletteData) {
                globalPalette = paletteData;
            }
        }

        function setDither(dither) {
            useDither = dither;
        }

        function analyze() {
            var len = image.length;
            var nPix = len / 4;
            var indexedPixels = new Uint8Array(nPix);

            var quantizer = globalPalette.quantizer;
            var palette = globalPalette.colors;

            if (useDither) {
                // Full Floyd-Steinberg dithering
                var imgWidth = width;
                var imgHeight = height;

                // Create error diffusion buffers (current and next row)
                var currRowErr = new Float32Array(imgWidth * 3);
                var nextRowErr = new Float32Array(imgWidth * 3);

                for (var y = 0; y < imgHeight; y++) {
                    // Swap error buffers
                    var temp = currRowErr;
                    currRowErr = nextRowErr;
                    nextRowErr = temp;
                    // Clear next row
                    for (var k = 0; k < nextRowErr.length; k++) nextRowErr[k] = 0;

                    for (var x = 0; x < imgWidth; x++) {
                        var i = y * imgWidth + x;
                        var idx = i * 4;

                        // Get pixel color + accumulated error
                        var r = Math.max(0, Math.min(255, image[idx] + currRowErr[x * 3]));
                        var g = Math.max(0, Math.min(255, image[idx + 1] + currRowErr[x * 3 + 1]));
                        var b = Math.max(0, Math.min(255, image[idx + 2] + currRowErr[x * 3 + 2]));

                        // Find closest palette color
                        var paletteIndex = quantizer.findClosestPaletteIndex(
                            Math.round(r),
                            Math.round(g),
                            Math.round(b)
                        );
                        indexedPixels[i] = paletteIndex;

                        // Calculate quantization error
                        var c = palette[paletteIndex];
                        var er = r - c.r;
                        var eg = g - c.g;
                        var eb = b - c.b;

                        // Distribute error using Floyd-Steinberg coefficients
                        // Right: 7/16
                        if (x + 1 < imgWidth) {
                            currRowErr[(x + 1) * 3] += er * 7 / 16;
                            currRowErr[(x + 1) * 3 + 1] += eg * 7 / 16;
                            currRowErr[(x + 1) * 3 + 2] += eb * 7 / 16;
                        }
                        // Bottom-left: 3/16
                        if (y + 1 < imgHeight && x > 0) {
                            nextRowErr[(x - 1) * 3] += er * 3 / 16;
                            nextRowErr[(x - 1) * 3 + 1] += eg * 3 / 16;
                            nextRowErr[(x - 1) * 3 + 2] += eb * 3 / 16;
                        }
                        // Bottom: 5/16
                        if (y + 1 < imgHeight) {
                            nextRowErr[x * 3] += er * 5 / 16;
                            nextRowErr[x * 3 + 1] += eg * 5 / 16;
                            nextRowErr[x * 3 + 2] += eb * 5 / 16;
                        }
                        // Bottom-right: 1/16
                        if (y + 1 < imgHeight && x + 1 < imgWidth) {
                            nextRowErr[(x + 1) * 3] += er * 1 / 16;
                            nextRowErr[(x + 1) * 3 + 1] += eg * 1 / 16;
                            nextRowErr[(x + 1) * 3 + 2] += eb * 1 / 16;
                        }
                    }
                }
            } else {
                // Direct mapping (faster, good enough for most cases)
                for (var i = 0, j = 0; i < nPix; i++, j += 4) {
                    var r = image[j] & 0xff;
                    var g = image[j + 1] & 0xff;
                    var b = image[j + 2] & 0xff;

                    // Use brute force search for most accurate color matching
                    indexedPixels[i] = quantizer.findClosestPaletteIndex(r, g, b);
                }
            }

            return { indexedPixels: indexedPixels, colorTab: globalPalette.colorTab };
        }

        function start() {
            out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
            firstFrame = true;
        }

        function finish() {
            out.push(0x3B); // Trailer
        }

        function setRepeat(r) {
            repeat = r;
        }

        function setDelay(d) {
            delay = Math.round(d / 10);
        }

        function setQuality(q) {
            sample = Math.max(1, Math.min(30, q));
        }

        function addFrame(imageData) {
            image = imageData;
            var result = analyze();
            var indexedPixels = result.indexedPixels;

            if (firstFrame) {
                writeLSDWithGCT();
                writeGlobalPalette();
                writeNetscapeExt();
                firstFrame = false;
            }

            writeGraphicCtrlExt();
            writeImageDescNoLCT();
            writePixels(indexedPixels);
        }

        function writeLSDWithGCT() {
            writeShort(width);
            writeShort(height);
            // Packed: GCT flag (1), color resolution (7), sort (0), GCT size (7 = 256 colors)
            out.push(0xF7, 0, 0);
        }

        function writeGlobalPalette() {
            var colorTab = globalPalette.colorTab;
            for (var i = 0; i < 768; i++) {
                out.push(colorTab[i] || 0);
            }
        }

        function writeNetscapeExt() {
            out.push(0x21, 0xFF, 11);
            writeString('NETSCAPE2.0');
            out.push(3, 1);
            writeShort(repeat);
            out.push(0);
        }

        function writeGraphicCtrlExt() {
            out.push(0x21, 0xF9, 4);
            out.push(0);
            writeShort(delay);
            out.push(0, 0);
        }

        function writeImageDescNoLCT() {
            out.push(0x2C);
            writeShort(0);
            writeShort(0);
            writeShort(width);
            writeShort(height);
            out.push(0x00); // No LCT, use GCT
        }

        function writePixels(indexedPixels) {
            var lzw = LZWEncoder(width, height, indexedPixels, colorDepth);
            var data = lzw.encode();
            for (var i = 0; i < data.length; i++) {
                out.push(data[i]);
            }
        }

        function writeShort(v) {
            out.push(v & 0xFF, (v >> 8) & 0xFF);
        }

        function writeString(s) {
            for (var i = 0; i < s.length; i++) {
                out.push(s.charCodeAt(i));
            }
        }

        function stream() {
            return {
                getData: function() {
                    return out;
                }
            };
        }

        return {
            start: start,
            finish: finish,
            setRepeat: setRepeat,
            setDelay: setDelay,
            setQuality: setQuality,
            setDither: setDither,
            setGlobalPalette: setGlobalPalette,
            addFrame: addFrame,
            stream: stream
        };
    }

    // Export
    root.GIF = GIF;

})(typeof window !== 'undefined' ? window : this);
