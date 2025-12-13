/**
 * Simple GIF Encoder - Client-side animated GIF generation
 * MIT License
 */

(function(root) {
    'use strict';

    function GIFEncoder() {
        this.width = 0;
        this.height = 0;
        this.transparent = null;
        this.transIndex = 0;
        this.repeat = 0;
        this.delay = 0;
        this.image = null;
        this.pixels = null;
        this.indexedPixels = null;
        this.colorDepth = null;
        this.colorTab = null;
        this.usedEntry = [];
        this.palSize = 7;
        this.dispose = -1;
        this.firstFrame = true;
        this.sample = 10;
        this.out = [];
    }

    GIFEncoder.prototype.setDelay = function(ms) {
        this.delay = Math.round(ms / 10);
    };

    GIFEncoder.prototype.setRepeat = function(iter) {
        this.repeat = iter;
    };

    GIFEncoder.prototype.setTransparent = function(color) {
        this.transparent = color;
    };

    GIFEncoder.prototype.setQuality = function(quality) {
        this.sample = quality < 1 ? 1 : quality;
    };

    GIFEncoder.prototype.setSize = function(w, h) {
        this.width = w;
        this.height = h;
    };

    GIFEncoder.prototype.start = function() {
        this.out = [];
        this.writeString('GIF89a');
        this.firstFrame = true;
    };

    GIFEncoder.prototype.addFrame = function(imageData) {
        this.image = imageData;
        this.getImagePixels();
        this.analyzePixels();

        if (this.firstFrame) {
            this.writeLSD();
            this.writePalette();
            if (this.repeat >= 0) {
                this.writeNetscapeExt();
            }
        }

        this.writeGraphicCtrlExt();
        this.writeImageDesc();

        if (!this.firstFrame) {
            this.writePalette();
        }

        this.writePixels();
        this.firstFrame = false;
    };

    GIFEncoder.prototype.finish = function() {
        this.out.push(0x3B);
    };

    GIFEncoder.prototype.getImagePixels = function() {
        var w = this.width;
        var h = this.height;
        this.pixels = new Uint8Array(w * h * 3);

        var data = this.image;
        var count = 0;

        for (var i = 0; i < h; i++) {
            for (var j = 0; j < w; j++) {
                var b = (i * w * 4) + j * 4;
                this.pixels[count++] = data[b];
                this.pixels[count++] = data[b + 1];
                this.pixels[count++] = data[b + 2];
            }
        }
    };

    GIFEncoder.prototype.analyzePixels = function() {
        var len = this.pixels.length;
        var nPix = len / 3;

        this.indexedPixels = new Uint8Array(nPix);

        var nq = new NeuQuant(this.pixels, this.sample);
        this.colorTab = nq.process();

        var k = 0;
        for (var i = 0; i < nPix; i++) {
            var index = nq.map(
                this.pixels[k++] & 0xff,
                this.pixels[k++] & 0xff,
                this.pixels[k++] & 0xff
            );
            this.usedEntry[index] = true;
            this.indexedPixels[i] = index;
        }

        this.pixels = null;
        this.colorDepth = 8;
        this.palSize = 7;

        if (this.transparent !== null) {
            this.transIndex = this.findClosest(this.transparent);
        }
    };

    GIFEncoder.prototype.findClosest = function(c) {
        var r = (c & 0xFF0000) >> 16;
        var g = (c & 0x00FF00) >> 8;
        var b = (c & 0x0000FF);
        var minpos = 0;
        var dmin = 256 * 256 * 256;
        var len = this.colorTab.length;

        for (var i = 0; i < len;) {
            var dr = r - (this.colorTab[i++] & 0xff);
            var dg = g - (this.colorTab[i++] & 0xff);
            var db = b - (this.colorTab[i] & 0xff);
            var d = dr * dr + dg * dg + db * db;
            var index = i / 3;
            if (this.usedEntry[index] && (d < dmin)) {
                dmin = d;
                minpos = index;
            }
            i++;
        }
        return minpos;
    };

    GIFEncoder.prototype.writeLSD = function() {
        this.writeShort(this.width);
        this.writeShort(this.height);
        this.out.push(0x80 | 0x70 | this.palSize);
        this.out.push(0);
        this.out.push(0);
    };

    GIFEncoder.prototype.writePalette = function() {
        for (var i = 0; i < this.colorTab.length; i++) {
            this.out.push(this.colorTab[i]);
        }
        var n = (3 * 256) - this.colorTab.length;
        for (var j = 0; j < n; j++) {
            this.out.push(0);
        }
    };

    GIFEncoder.prototype.writeNetscapeExt = function() {
        this.out.push(0x21);
        this.out.push(0xFF);
        this.out.push(11);
        this.writeString('NETSCAPE2.0');
        this.out.push(3);
        this.out.push(1);
        this.writeShort(this.repeat);
        this.out.push(0);
    };

    GIFEncoder.prototype.writeGraphicCtrlExt = function() {
        this.out.push(0x21);
        this.out.push(0xF9);
        this.out.push(4);

        var transp = this.transparent !== null ? 1 : 0;
        var disp = this.dispose >= 0 ? this.dispose & 7 : 0;
        disp <<= 2;

        this.out.push(disp | transp);
        this.writeShort(this.delay);
        this.out.push(this.transIndex);
        this.out.push(0);
    };

    GIFEncoder.prototype.writeImageDesc = function() {
        this.out.push(0x2C);
        this.writeShort(0);
        this.writeShort(0);
        this.writeShort(this.width);
        this.writeShort(this.height);

        if (this.firstFrame) {
            this.out.push(0);
        } else {
            this.out.push(0x80 | this.palSize);
        }
    };

    GIFEncoder.prototype.writePixels = function() {
        var enc = new LZWEncoder(this.width, this.height, this.indexedPixels, this.colorDepth);
        enc.encode(this.out);
    };

    GIFEncoder.prototype.writeShort = function(value) {
        this.out.push(value & 0xFF);
        this.out.push((value >> 8) & 0xFF);
    };

    GIFEncoder.prototype.writeString = function(s) {
        for (var i = 0; i < s.length; i++) {
            this.out.push(s.charCodeAt(i));
        }
    };

    GIFEncoder.prototype.stream = function() {
        return new Uint8Array(this.out);
    };

    // NeuQuant Neural-Net Quantization Algorithm
    function NeuQuant(pixels, sample) {
        var netsize = 256;
        var prime1 = 499;
        var prime2 = 491;
        var prime3 = 487;
        var prime4 = 503;
        var minpicturebytes = 3 * prime4;

        var network = [];
        var netindex = new Int32Array(256);
        var bias = new Int32Array(netsize);
        var freq = new Int32Array(netsize);
        var radpower = new Int32Array(netsize >> 3);

        var lengthcount = pixels.length;
        var samplefac = sample;

        for (var i = 0; i < netsize; i++) {
            var v = (i << 12) / netsize;
            network[i] = [v, v, v, 0];
            freq[i] = (1 << 28) / netsize;
            bias[i] = 0;
        }

        function contest(b, g, r) {
            var bestd = ~(1 << 31);
            var bestbiasd = bestd;
            var bestpos = -1;
            var bestbiaspos = bestpos;

            for (var i = 0; i < netsize; i++) {
                var n = network[i];
                var dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
                if (dist < bestd) { bestd = dist; bestpos = i; }
                var biasdist = dist - ((bias[i]) >> 12);
                if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = i; }
                var betafreq = freq[i] >> 10;
                freq[i] -= betafreq;
                bias[i] += betafreq << 10;
            }
            freq[bestpos] += (1 << 10);
            bias[bestpos] -= (1 << 20);
            return bestbiaspos;
        }

        function altersingle(alpha, i, b, g, r) {
            var n = network[i];
            n[0] -= (alpha * (n[0] - b)) >> 18;
            n[1] -= (alpha * (n[1] - g)) >> 18;
            n[2] -= (alpha * (n[2] - r)) >> 18;
        }

        function alterneigh(radius, i, b, g, r) {
            var lo = Math.max(i - radius, 0);
            var hi = Math.min(i + radius, netsize);

            var j = i + 1;
            var k = i - 1;
            var m = 1;

            while (j < hi || k > lo) {
                var a = radpower[m++];
                if (j < hi) {
                    var n = network[j++];
                    n[0] -= (a * (n[0] - b)) >> 18;
                    n[1] -= (a * (n[1] - g)) >> 18;
                    n[2] -= (a * (n[2] - r)) >> 18;
                }
                if (k > lo) {
                    var n = network[k--];
                    n[0] -= (a * (n[0] - b)) >> 18;
                    n[1] -= (a * (n[1] - g)) >> 18;
                    n[2] -= (a * (n[2] - r)) >> 18;
                }
            }
        }

        function learn() {
            var samplepixels = lengthcount / (3 * samplefac);
            var delta = Math.max(1, samplepixels / 100);
            var alpha = 1 << 18;
            var radius = (netsize >> 3) << 6;

            var rad = radius >> 6;
            for (var i = 0; i < rad; i++) {
                radpower[i] = alpha * (((rad * rad - i * i) << 8) / (rad * rad));
            }

            var step;
            if (lengthcount < minpicturebytes) {
                step = 3;
            } else if (lengthcount % prime1 !== 0) {
                step = 3 * prime1;
            } else if (lengthcount % prime2 !== 0) {
                step = 3 * prime2;
            } else if (lengthcount % prime3 !== 0) {
                step = 3 * prime3;
            } else {
                step = 3 * prime4;
            }

            var pix = 0;
            for (var i = 0; i < samplepixels;) {
                var b = (pixels[pix] & 0xff) << 4;
                var g = (pixels[pix + 1] & 0xff) << 4;
                var r = (pixels[pix + 2] & 0xff) << 4;

                var j = contest(b, g, r);
                altersingle(alpha, j, b, g, r);
                if (rad !== 0) alterneigh(rad, j, b, g, r);

                pix += step;
                if (pix >= lengthcount) pix -= lengthcount;
                i++;

                if (i % delta === 0) {
                    alpha -= alpha / 30;
                    radius -= radius / 30;
                    rad = radius >> 6;
                    for (var k = 0; k < rad; k++) {
                        radpower[k] = alpha * (((rad * rad - k * k) << 8) / (rad * rad));
                    }
                }
            }
        }

        function buildIndex() {
            var previouscol = 0;
            var startpos = 0;

            for (var i = 0; i < netsize; i++) {
                var p = network[i];
                var smallpos = i;
                var smallval = p[1];

                for (var j = i + 1; j < netsize; j++) {
                    var q = network[j];
                    if (q[1] < smallval) { smallpos = j; smallval = q[1]; }
                }

                var q = network[smallpos];
                if (i !== smallpos) {
                    var temp;
                    temp = q[0]; q[0] = p[0]; p[0] = temp;
                    temp = q[1]; q[1] = p[1]; p[1] = temp;
                    temp = q[2]; q[2] = p[2]; p[2] = temp;
                    temp = q[3]; q[3] = p[3]; p[3] = temp;
                }

                if (smallval !== previouscol) {
                    netindex[previouscol] = (startpos + i) >> 1;
                    for (var j = previouscol + 1; j < smallval; j++) {
                        netindex[j] = i;
                    }
                    previouscol = smallval;
                    startpos = i;
                }
            }
            netindex[previouscol] = (startpos + 255) >> 1;
            for (var j = previouscol + 1; j < 256; j++) {
                netindex[j] = 255;
            }
        }

        this.process = function() {
            learn();
            buildIndex();

            var colorTab = [];
            for (var i = 0; i < netsize; i++) {
                colorTab.push(network[i][0] >> 4);
                colorTab.push(network[i][1] >> 4);
                colorTab.push(network[i][2] >> 4);
            }
            return colorTab;
        };

        this.map = function(b, g, r) {
            var bestd = 1000;
            var best = -1;
            var i = netindex[g];
            var j = i - 1;

            while (i < netsize || j >= 0) {
                if (i < netsize) {
                    var n = network[i];
                    var dist = n[1] - g;
                    if (dist >= bestd) {
                        i = netsize;
                    } else {
                        i++;
                        if (dist < 0) dist = -dist;
                        var a = n[0] - b; if (a < 0) a = -a; dist += a;
                        if (dist < bestd) {
                            a = n[2] - r; if (a < 0) a = -a; dist += a;
                            if (dist < bestd) { bestd = dist; best = i - 1; }
                        }
                    }
                }
                if (j >= 0) {
                    var n = network[j];
                    var dist = g - n[1];
                    if (dist >= bestd) {
                        j = -1;
                    } else {
                        j--;
                        if (dist < 0) dist = -dist;
                        var a = n[0] - b; if (a < 0) a = -a; dist += a;
                        if (dist < bestd) {
                            a = n[2] - r; if (a < 0) a = -a; dist += a;
                            if (dist < bestd) { bestd = dist; best = j + 1; }
                        }
                    }
                }
            }
            return best;
        };
    }

    // LZW Encoder
    function LZWEncoder(width, height, pixels, colorDepth) {
        var initCodeSize = Math.max(2, colorDepth);
        var accum = new Uint8Array(256);
        var htab = new Int32Array(5003);
        var codetab = new Int32Array(5003);

        var cur_accum = 0;
        var cur_bits = 0;
        var a_count = 0;
        var free_ent = 0;
        var maxcode;
        var clear_flg = false;
        var g_init_bits;
        var ClearCode;
        var EOFCode;
        var n_bits;
        var remaining = width * height;
        var curPixel = 0;

        function char_out(c, outs) {
            accum[a_count++] = c;
            if (a_count >= 254) flush_char(outs);
        }

        function flush_char(outs) {
            if (a_count > 0) {
                outs.push(a_count);
                for (var i = 0; i < a_count; i++) {
                    outs.push(accum[i]);
                }
                a_count = 0;
            }
        }

        function output(code, outs) {
            cur_accum &= (1 << cur_bits) - 1;
            if (cur_bits > 0) {
                cur_accum |= code << cur_bits;
            } else {
                cur_accum = code;
            }
            cur_bits += n_bits;

            while (cur_bits >= 8) {
                char_out(cur_accum & 0xff, outs);
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
                    char_out(cur_accum & 0xff, outs);
                    cur_accum >>= 8;
                    cur_bits -= 8;
                }
                flush_char(outs);
            }
        }

        function cl_hash() {
            for (var i = 0; i < 5003; i++) htab[i] = -1;
        }

        function nextPixel() {
            if (remaining === 0) return -1;
            remaining--;
            return pixels[curPixel++] & 0xff;
        }

        this.encode = function(outs) {
            outs.push(initCodeSize);

            g_init_bits = initCodeSize + 1;
            clear_flg = false;
            n_bits = g_init_bits;
            maxcode = (1 << n_bits) - 1;

            ClearCode = 1 << initCodeSize;
            EOFCode = ClearCode + 1;
            free_ent = ClearCode + 2;

            a_count = 0;
            var ent = nextPixel();
            cl_hash();

            output(ClearCode, outs);

            var c;
            while ((c = nextPixel()) !== -1) {
                var fcode = (c << 12) + ent;
                var i = (c << 4) ^ ent;

                if (htab[i] === fcode) {
                    ent = codetab[i];
                    continue;
                }

                if (htab[i] >= 0) {
                    var disp = 5003 - i;
                    if (i === 0) disp = 1;
                    do {
                        i -= disp;
                        if (i < 0) i += 5003;
                        if (htab[i] === fcode) {
                            ent = codetab[i];
                            break;
                        }
                    } while (htab[i] >= 0);
                    if (htab[i] === fcode) continue;
                }

                output(ent, outs);
                ent = c;

                if (free_ent < 4096) {
                    codetab[i] = free_ent++;
                    htab[i] = fcode;
                } else {
                    cl_hash();
                    free_ent = ClearCode + 2;
                    clear_flg = true;
                    output(ClearCode, outs);
                }
            }

            output(ent, outs);
            output(EOFCode, outs);
            outs.push(0);
        };
    }

    // Simple wrapper API
    function GIF(options) {
        this.options = Object.assign({
            quality: 10,
            width: null,
            height: null,
            repeat: 0
        }, options);

        this.frames = [];
        this._events = {};
        this.running = false;
    }

    GIF.prototype.on = function(event, callback) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(callback);
        return this;
    };

    GIF.prototype.emit = function(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(function(cb) { cb(data); });
        }
    };

    GIF.prototype.addFrame = function(source, options) {
        options = Object.assign({ delay: 500, copy: false }, options);
        var data;

        if (source instanceof CanvasRenderingContext2D) {
            var canvas = source.canvas;
            if (!this.options.width) this.options.width = canvas.width;
            if (!this.options.height) this.options.height = canvas.height;
            data = source.getImageData(0, 0, canvas.width, canvas.height).data;
        } else if (source instanceof ImageData) {
            if (!this.options.width) this.options.width = source.width;
            if (!this.options.height) this.options.height = source.height;
            data = source.data;
        }

        this.frames.push({ data: data, delay: options.delay });
        return this;
    };

    GIF.prototype.render = function() {
        if (this.running) return;
        this.running = true;

        var self = this;
        var encoder = new GIFEncoder();

        setTimeout(function() {
            encoder.setSize(self.options.width, self.options.height);
            encoder.setRepeat(self.options.repeat);
            encoder.setQuality(self.options.quality);
            encoder.start();

            for (var i = 0; i < self.frames.length; i++) {
                self.emit('progress', (i + 0.5) / self.frames.length);
                encoder.setDelay(self.frames[i].delay);
                encoder.addFrame(self.frames[i].data);
            }

            encoder.finish();
            self.emit('progress', 1);

            var binary = encoder.stream();
            var blob = new Blob([binary], { type: 'image/gif' });

            self.running = false;
            self.emit('finished', blob);
        }, 50);
    };

    root.GIF = GIF;

})(typeof window !== 'undefined' ? window : this);
