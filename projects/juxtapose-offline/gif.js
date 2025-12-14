/**
 * GIF.js - Client-side GIF encoder
 * Based on gif.js library (MIT License)
 * https://github.com/jnordberg/gif.js
 *
 * Simplified version for Juxtapose Offline
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
            transparent: null
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
                var ctx = canvas.getContext('2d');
                ctx.drawImage(image.canvas, 0, 0);
                frame.data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } else {
                frame.data = image.getImageData(0, 0, image.canvas.width, image.canvas.height);
            }
        } else if (image instanceof ImageData) {
            frame.data = image;
        } else if (image instanceof HTMLCanvasElement) {
            frame.data = image.getContext('2d').getImageData(0, 0, image.width, image.height);
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

            var encoder = new GIFEncoder(this.options.width, this.options.height);

            encoder.setRepeat(this.options.repeat);
            encoder.setQuality(this.options.quality);
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
            var blob = new Blob([new Uint8Array(binary)], { type: 'image/gif' });

            self.emit('finished', blob);
        } catch (err) {
            self.emit('error', err);
        } finally {
            self.running = false;
        }
    };

    // NeuQuant Neural-Net Quantization Algorithm
    function NeuQuant(pixels, samplefac) {
        var netsize = 256;
        var prime1 = 499;
        var prime2 = 491;
        var prime3 = 487;
        var prime4 = 503;
        var minpicturebytes = (3 * prime4);

        var maxnetpos = netsize - 1;
        var netbiasshift = 4;
        var ncycles = 100;
        var intbiasshift = 16;
        var intbias = (1 << intbiasshift);
        var gammashift = 10;
        var gamma = (1 << gammashift);
        var betashift = 10;
        var beta = (intbias >> betashift);
        var betagamma = (intbias << (gammashift - betashift));

        var initrad = (netsize >> 3);
        var radiusbiasshift = 6;
        var radiusbias = (1 << radiusbiasshift);
        var initradius = (initrad * radiusbias);
        var radiusdec = 30;

        var alphabiasshift = 10;
        var initalpha = (1 << alphabiasshift);
        var alphadec;

        var radbiasshift = 8;
        var radbias = (1 << radbiasshift);
        var alpharadbshift = (alphabiasshift + radbiasshift);
        var alpharadbias = (1 << alpharadbshift);

        var thepicture;
        var lengthcount;
        var samplefac;

        var network;
        var netindex;
        var bias;
        var freq;
        var radpower;

        function init() {
            network = [];
            netindex = new Int32Array(256);
            bias = new Int32Array(netsize);
            freq = new Int32Array(netsize);
            radpower = new Int32Array(netsize >> 3);

            for (var i = 0; i < netsize; i++) {
                var v = (i << (netbiasshift + 8)) / netsize;
                network[i] = new Float64Array([v, v, v, 0]);
                freq[i] = intbias / netsize;
                bias[i] = 0;
            }
        }

        function unbiasnet() {
            for (var i = 0; i < netsize; i++) {
                network[i][0] >>= netbiasshift;
                network[i][1] >>= netbiasshift;
                network[i][2] >>= netbiasshift;
                network[i][3] = i;
            }
        }

        function altersingle(alpha, i, b, g, r) {
            network[i][0] -= (alpha * (network[i][0] - b)) / initalpha;
            network[i][1] -= (alpha * (network[i][1] - g)) / initalpha;
            network[i][2] -= (alpha * (network[i][2] - r)) / initalpha;
        }

        function alterneigh(radius, i, b, g, r) {
            var lo = Math.abs(i - radius);
            var hi = Math.min(i + radius, netsize);
            var j = i + 1;
            var k = i - 1;
            var m = 1;

            while ((j < hi) || (k > lo)) {
                var a = radpower[m++];
                if (j < hi) {
                    var p = network[j++];
                    p[0] -= (a * (p[0] - b)) / alpharadbias;
                    p[1] -= (a * (p[1] - g)) / alpharadbias;
                    p[2] -= (a * (p[2] - r)) / alpharadbias;
                }
                if (k > lo) {
                    var p = network[k--];
                    p[0] -= (a * (p[0] - b)) / alpharadbias;
                    p[1] -= (a * (p[1] - g)) / alpharadbias;
                    p[2] -= (a * (p[2] - r)) / alpharadbias;
                }
            }
        }

        function contest(b, g, r) {
            var bestd = ~(1 << 31);
            var bestbiasd = bestd;
            var bestpos = -1;
            var bestbiaspos = bestpos;

            for (var i = 0; i < netsize; i++) {
                var n = network[i];
                var dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
                if (dist < bestd) {
                    bestd = dist;
                    bestpos = i;
                }
                var biasdist = dist - ((bias[i]) >> (intbiasshift - netbiasshift));
                if (biasdist < bestbiasd) {
                    bestbiasd = biasdist;
                    bestbiaspos = i;
                }
                var betafreq = (freq[i] >> betashift);
                freq[i] -= betafreq;
                bias[i] += (betafreq << gammashift);
            }
            freq[bestpos] += beta;
            bias[bestpos] -= betagamma;
            return bestbiaspos;
        }

        function inxbuild() {
            var previouscol = 0;
            var startpos = 0;
            for (var i = 0; i < netsize; i++) {
                var p = network[i];
                var smallpos = i;
                var smallval = p[1];
                for (var j = i + 1; j < netsize; j++) {
                    var q = network[j];
                    if (q[1] < smallval) {
                        smallpos = j;
                        smallval = q[1];
                    }
                }
                var q = network[smallpos];
                if (i !== smallpos) {
                    var temp = q[0]; q[0] = p[0]; p[0] = temp;
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
            netindex[previouscol] = (startpos + maxnetpos) >> 1;
            for (var j = previouscol + 1; j < 256; j++) {
                netindex[j] = maxnetpos;
            }
        }

        function learn() {
            if (lengthcount < minpicturebytes) {
                samplefac = 1;
            }
            alphadec = 30 + ((samplefac - 1) / 3);
            var samplepixels = lengthcount / (3 * samplefac);
            var delta = ~~(samplepixels / ncycles);
            var alpha = initalpha;
            var radius = initradius;

            var rad = radius >> radiusbiasshift;
            if (rad <= 1) rad = 0;
            for (var i = 0; i < rad; i++) {
                radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));
            }

            var step;
            if (lengthcount < minpicturebytes) {
                step = 3;
            } else if ((lengthcount % prime1) !== 0) {
                step = 3 * prime1;
            } else if ((lengthcount % prime2) !== 0) {
                step = 3 * prime2;
            } else if ((lengthcount % prime3) !== 0) {
                step = 3 * prime3;
            } else {
                step = 3 * prime4;
            }

            var pix = 0;
            for (var i = 0; i < samplepixels;) {
                var b = (thepicture[pix] & 0xff) << netbiasshift;
                var g = (thepicture[pix + 1] & 0xff) << netbiasshift;
                var r = (thepicture[pix + 2] & 0xff) << netbiasshift;
                var j = contest(b, g, r);

                altersingle(alpha, j, b, g, r);
                if (rad !== 0) {
                    alterneigh(rad, j, b, g, r);
                }

                pix += step;
                if (pix >= lengthcount) {
                    pix -= lengthcount;
                }
                i++;

                if (delta === 0) delta = 1;
                if (i % delta === 0) {
                    alpha -= alpha / alphadec;
                    radius -= radius / radiusdec;
                    rad = radius >> radiusbiasshift;
                    if (rad <= 1) rad = 0;
                    for (var k = 0; k < rad; k++) {
                        radpower[k] = alpha * (((rad * rad - k * k) * radbias) / (rad * rad));
                    }
                }
            }
        }

        function map(b, g, r) {
            var bestd = 1000;
            var best = -1;
            var i = netindex[g];
            var j = i - 1;

            while ((i < netsize) || (j >= 0)) {
                if (i < netsize) {
                    var p = network[i];
                    var dist = p[1] - g;
                    if (dist >= bestd) {
                        i = netsize;
                    } else {
                        i++;
                        if (dist < 0) dist = -dist;
                        var a = p[0] - b;
                        if (a < 0) a = -a;
                        dist += a;
                        if (dist < bestd) {
                            a = p[2] - r;
                            if (a < 0) a = -a;
                            dist += a;
                            if (dist < bestd) {
                                bestd = dist;
                                best = p[3];
                            }
                        }
                    }
                }
                if (j >= 0) {
                    var p = network[j];
                    var dist = g - p[1];
                    if (dist >= bestd) {
                        j = -1;
                    } else {
                        j--;
                        if (dist < 0) dist = -dist;
                        var a = p[0] - b;
                        if (a < 0) a = -a;
                        dist += a;
                        if (dist < bestd) {
                            a = p[2] - r;
                            if (a < 0) a = -a;
                            dist += a;
                            if (dist < bestd) {
                                bestd = dist;
                                best = p[3];
                            }
                        }
                    }
                }
            }
            return best;
        }

        function process() {
            learn();
            unbiasnet();
            inxbuild();
        }

        function colorMap() {
            var map = [];
            var index = [];
            for (var i = 0; i < netsize; i++) {
                index[network[i][3]] = i;
            }
            var k = 0;
            for (var i = 0; i < netsize; i++) {
                var j = index[i];
                map[k++] = network[j][0];
                map[k++] = network[j][1];
                map[k++] = network[j][2];
            }
            return map;
        }

        thepicture = pixels;
        lengthcount = pixels.length;
        samplefac = samplefac;

        init();
        process();

        return {
            colorMap: colorMap,
            map: map
        };
    }

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

    // GIF Encoder
    function GIFEncoder(width, height) {
        var out = [];
        var image = null;
        var colorTab = null;
        var colorDepth = 8;
        var palSize = 7;
        var dispose = -1;
        var repeat = 0;
        var firstFrame = true;
        var sample = 10;
        var delay = 0;

        function analyze() {
            var len = image.length;
            var nPix = len / 4;
            var pixels = new Uint8Array(nPix * 3);
            var count = 0;

            for (var i = 0; i < len; i += 4) {
                pixels[count++] = image[i];
                pixels[count++] = image[i + 1];
                pixels[count++] = image[i + 2];
            }

            var nq = NeuQuant(pixels, sample);
            colorTab = nq.colorMap();

            var indexedPixels = new Uint8Array(nPix);
            for (var i = 0, j = 0; i < nPix; i++) {
                var index = nq.map(
                    pixels[j++] & 0xff,
                    pixels[j++] & 0xff,
                    pixels[j++] & 0xff
                );
                indexedPixels[i] = index;
            }

            return indexedPixels;
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
            var indexedPixels = analyze();

            if (firstFrame) {
                writeLSD();
                writeNetscapeExt();
                firstFrame = false;
            }

            writeGraphicCtrlExt();
            writeImageDesc();
            writePalette();
            writePixels(indexedPixels);
        }

        function writeLSD() {
            writeShort(width);
            writeShort(height);
            out.push(
                0x80 | palSize,
                0,
                0
            );
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

        function writeImageDesc() {
            out.push(0x2C);
            writeShort(0);
            writeShort(0);
            writeShort(width);
            writeShort(height);
            out.push(0x80 | palSize);
        }

        function writePalette() {
            for (var i = 0; i < colorTab.length; i++) {
                out.push(colorTab[i]);
            }
            var n = (3 * 256) - colorTab.length;
            for (var i = 0; i < n; i++) {
                out.push(0);
            }
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
            addFrame: addFrame,
            stream: stream
        };
    }

    // Export
    root.GIF = GIF;

})(typeof window !== 'undefined' ? window : this);
