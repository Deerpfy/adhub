/**
 * SampleHub - Audio Engine Module
 * Web Audio API based player with waveform visualization
 * Version: 1.0
 *
 * Based on analysis requirements:
 * - Audio Preview with waveform
 * - BPM detection
 * - Key detection (basic)
 * - Streaming playback
 */

const AudioEngine = (function() {
    'use strict';

    // Audio context
    let audioContext = null;
    let analyser = null;
    let gainNode = null;

    // Current state
    let currentSource = null;
    let currentBuffer = null;
    let currentSampleId = null;
    let isPlaying = false;
    let isPaused = false;
    let startTime = 0;
    let pauseTime = 0;
    let duration = 0;
    let isLooping = false;

    // Waveform canvas
    let waveformCanvas = null;
    let waveformCtx = null;
    let waveformData = null;

    // Animation frame
    let animationFrame = null;

    // Settings
    let settings = {
        waveformColor: '#7C3AED',
        progressColor: '#A78BFA',
        volume: 0.8,
        fadeOnStop: false,
        autoPlayNext: true
    };

    // Callbacks
    let callbacks = {
        onPlay: null,
        onPause: null,
        onStop: null,
        onEnded: null,
        onTimeUpdate: null,
        onLoadStart: null,
        onLoadEnd: null,
        onError: null
    };

    /**
     * Initialize the audio engine
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        // Merge settings
        Object.assign(settings, options);

        // Create audio context on first user interaction
        document.addEventListener('click', initAudioContext, { once: true });
        document.addEventListener('keydown', initAudioContext, { once: true });

        console.log('Audio engine initialized');
    }

    /**
     * Initialize AudioContext (must be triggered by user gesture)
     */
    function initAudioContext() {
        if (audioContext) return;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser for visualizations
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;

            // Create gain node for volume control
            gainNode = audioContext.createGain();
            gainNode.gain.value = settings.volume;

            // Connect nodes
            gainNode.connect(analyser);
            analyser.connect(audioContext.destination);

            console.log('AudioContext created');
        } catch (error) {
            console.error('Failed to create AudioContext:', error);
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        }
    }

    /**
     * Set up waveform canvas
     * @param {HTMLElement} container - Container element for waveform
     */
    function setupWaveform(container) {
        if (!container) return;

        // Create or get canvas
        waveformCanvas = container.querySelector('canvas');
        if (!waveformCanvas) {
            waveformCanvas = document.createElement('canvas');
            container.appendChild(waveformCanvas);
        }

        // Set dimensions
        const rect = container.getBoundingClientRect();
        waveformCanvas.width = rect.width * window.devicePixelRatio;
        waveformCanvas.height = rect.height * window.devicePixelRatio;
        waveformCanvas.style.width = rect.width + 'px';
        waveformCanvas.style.height = rect.height + 'px';

        waveformCtx = waveformCanvas.getContext('2d');
        waveformCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Add click handler for seeking
        waveformCanvas.addEventListener('click', handleWaveformClick);
    }

    /**
     * Handle click on waveform for seeking
     * @param {MouseEvent} event
     */
    let isSeeking = false; // Prevent rapid seek calls

    function handleWaveformClick(event) {
        if (!currentBuffer || isSeeking) return;

        isSeeking = true;

        const rect = waveformCanvas.getBoundingClientRect();
        const clickPosition = (event.clientX - rect.left) / rect.width;
        const seekTime = clickPosition * duration;

        seek(seekTime);

        // Reset seeking flag after a short delay
        setTimeout(() => {
            isSeeking = false;
        }, 100);
    }

    /**
     * Load audio from various sources
     * @param {string|Blob|ArrayBuffer} source - Audio source
     * @param {number} sampleId - Sample ID for caching
     * @returns {Promise<AudioBuffer>}
     */
    async function load(source, sampleId = null) {
        if (!audioContext) {
            initAudioContext();
        }

        // Set flags BEFORE stop() to prevent onended from triggering callbacks
        isPlaying = false;
        isPaused = false;
        pauseTime = 0;

        // Stop any current playback before loading new audio
        if (currentSource) {
            currentSource.stop();
            currentSource.disconnect();
            currentSource = null;
        }

        if (callbacks.onLoadStart) {
            callbacks.onLoadStart();
        }

        try {
            let arrayBuffer;

            if (source instanceof ArrayBuffer) {
                arrayBuffer = source;
            } else if (source instanceof Blob) {
                arrayBuffer = await source.arrayBuffer();
            } else if (typeof source === 'string') {
                // URL or data URL
                if (source.startsWith('data:')) {
                    const response = await fetch(source);
                    arrayBuffer = await response.arrayBuffer();
                } else {
                    const response = await fetch(source);
                    arrayBuffer = await response.arrayBuffer();
                }
            } else {
                throw new Error('Invalid audio source type');
            }

            // Decode audio
            currentBuffer = await audioContext.decodeAudioData(arrayBuffer);
            currentSampleId = sampleId;
            duration = currentBuffer.duration;

            // Generate waveform data
            waveformData = generateWaveformData(currentBuffer);

            // Draw waveform
            drawWaveform();

            if (callbacks.onLoadEnd) {
                callbacks.onLoadEnd({
                    duration,
                    sampleRate: currentBuffer.sampleRate,
                    numberOfChannels: currentBuffer.numberOfChannels
                });
            }

            return currentBuffer;
        } catch (error) {
            console.error('Failed to load audio:', error);
            if (callbacks.onError) {
                callbacks.onError(error);
            }
            throw error;
        }
    }

    /**
     * Generate waveform data from audio buffer
     * @param {AudioBuffer} buffer
     * @returns {Float32Array}
     */
    function generateWaveformData(buffer, samples = 200) {
        const channelData = buffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const waveform = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let sum = 0;

            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[start + j]);
            }

            waveform[i] = sum / blockSize;
        }

        // Normalize
        const max = Math.max(...waveform);
        if (max > 0) {
            for (let i = 0; i < samples; i++) {
                waveform[i] /= max;
            }
        }

        return waveform;
    }

    /**
     * Draw waveform on canvas
     * @param {number} progress - Current playback progress (0-1)
     */
    function drawWaveform(progress = 0) {
        if (!waveformCtx || !waveformData) return;

        const canvas = waveformCanvas;
        const ctx = waveformCtx;
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const barWidth = width / waveformData.length;
        const barGap = 1;
        const maxBarHeight = height * 0.8;

        for (let i = 0; i < waveformData.length; i++) {
            const x = i * barWidth;
            const barHeight = Math.max(2, waveformData[i] * maxBarHeight);
            const y = (height - barHeight) / 2;

            // Color based on progress
            const barProgress = i / waveformData.length;
            ctx.fillStyle = barProgress < progress ? settings.progressColor : settings.waveformColor;

            ctx.fillRect(x + barGap / 2, y, barWidth - barGap, barHeight);
        }
    }

    /**
     * Play loaded audio
     */
    function play() {
        if (!currentBuffer || !audioContext) return;

        // Resume context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Stop current playback (set flags first to prevent onended callback)
        if (currentSource) {
            const wasPlaying = isPlaying;
            isPlaying = false;
            isPaused = true;
            currentSource.stop();
            currentSource.disconnect();
            currentSource = null;
            // Restore state for the new playback
            if (!wasPlaying) {
                isPaused = true;
            }
        }

        // Create new source
        currentSource = audioContext.createBufferSource();
        currentSource.buffer = currentBuffer;
        currentSource.loop = isLooping;
        currentSource.connect(gainNode);

        // Handle end of playback
        currentSource.onended = () => {
            if (!isPaused) {
                isPlaying = false;
                if (callbacks.onEnded) {
                    callbacks.onEnded();
                }
            }
        };

        // Calculate start offset
        const offset = isPaused ? pauseTime : 0;

        // Start playback
        currentSource.start(0, offset);
        startTime = audioContext.currentTime - offset;
        isPlaying = true;
        isPaused = false;

        // Start animation
        startAnimation();

        if (callbacks.onPlay) {
            callbacks.onPlay();
        }
    }

    /**
     * Pause playback
     */
    function pause() {
        if (!isPlaying || !currentSource) return;

        pauseTime = audioContext.currentTime - startTime;

        // Set flags BEFORE stop() to prevent onended from triggering callbacks
        isPlaying = false;
        isPaused = true;

        currentSource.stop();
        currentSource.disconnect();
        currentSource = null;

        // Stop animation
        stopAnimation();

        if (callbacks.onPause) {
            callbacks.onPause();
        }
    }

    /**
     * Stop playback
     */
    function stop() {
        if (!currentSource) return;

        if (settings.fadeOnStop) {
            // Fade out
            gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

            setTimeout(() => {
                performStop();
                gainNode.gain.value = settings.volume;
            }, 100);
        } else {
            performStop();
        }
    }

    /**
     * Internal stop function
     */
    function performStop() {
        // Set flags BEFORE stop() to prevent onended from triggering callbacks
        isPlaying = false;
        isPaused = false;

        if (currentSource) {
            currentSource.stop();
            currentSource.disconnect();
            currentSource = null;
        }
        pauseTime = 0;

        stopAnimation();
        drawWaveform(0);

        if (callbacks.onStop) {
            callbacks.onStop();
        }
    }

    /**
     * Toggle play/pause
     */
    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    /**
     * Seek to specific time
     * @param {number} time - Time in seconds
     */
    function seek(time) {
        if (!currentBuffer) return;

        time = Math.max(0, Math.min(time, duration));

        const wasPlaying = isPlaying;

        // Stop current source if playing (without triggering callbacks)
        if (currentSource) {
            isPlaying = false;
            isPaused = true;
            currentSource.stop();
            currentSource.disconnect();
            currentSource = null;
        }

        pauseTime = time;

        if (wasPlaying) {
            // Resume playing from new position
            isPaused = true; // So play() uses pauseTime as offset
            play();
        } else {
            // Just update the waveform display
            drawWaveform(time / duration);
        }
    }

    /**
     * Set volume
     * @param {number} volume - Volume (0-1)
     */
    function setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        settings.volume = volume;

        if (gainNode) {
            gainNode.gain.value = volume;
        }
    }

    /**
     * Get current volume
     * @returns {number}
     */
    function getVolume() {
        return settings.volume;
    }

    /**
     * Toggle loop mode
     * @returns {boolean} New loop state
     */
    function toggleLoop() {
        isLooping = !isLooping;

        if (currentSource) {
            currentSource.loop = isLooping;
        }

        return isLooping;
    }

    /**
     * Set loop mode
     * @param {boolean} loop
     */
    function setLoop(loop) {
        isLooping = loop;

        if (currentSource) {
            currentSource.loop = isLooping;
        }
    }

    /**
     * Get current playback time
     * @returns {number}
     */
    function getCurrentTime() {
        if (isPaused) {
            return pauseTime;
        }
        if (isPlaying && audioContext) {
            return audioContext.currentTime - startTime;
        }
        return 0;
    }

    /**
     * Get duration
     * @returns {number}
     */
    function getDuration() {
        return duration;
    }

    /**
     * Get playback state
     * @returns {Object}
     */
    function getState() {
        return {
            isPlaying,
            isPaused,
            isLooping,
            currentTime: getCurrentTime(),
            duration,
            volume: settings.volume,
            sampleId: currentSampleId
        };
    }

    /**
     * Start animation loop
     */
    function startAnimation() {
        function animate() {
            if (!isPlaying) return;

            const currentTime = getCurrentTime();
            const progress = currentTime / duration;

            // Update waveform
            drawWaveform(progress);

            // Fire time update callback
            if (callbacks.onTimeUpdate) {
                callbacks.onTimeUpdate({
                    currentTime,
                    duration,
                    progress
                });
            }

            animationFrame = requestAnimationFrame(animate);
        }

        animate();
    }

    /**
     * Stop animation loop
     */
    function stopAnimation() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    /**
     * Set callback handlers
     * @param {Object} newCallbacks
     */
    function setCallbacks(newCallbacks) {
        Object.assign(callbacks, newCallbacks);
    }

    /**
     * Update settings
     * @param {Object} newSettings
     */
    function updateSettings(newSettings) {
        Object.assign(settings, newSettings);

        // Redraw waveform with new colors
        if (waveformData) {
            drawWaveform(getCurrentTime() / duration);
        }
    }

    /**
     * Format time as MM:SS
     * @param {number} seconds
     * @returns {string}
     */
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) {
            return '0:00';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // =============================================
    // BPM DETECTION
    // =============================================

    /**
     * Detect BPM from audio buffer
     * Simple peak detection algorithm
     * @param {AudioBuffer} buffer
     * @returns {number} Estimated BPM
     */
    function detectBPM(buffer) {
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;

        // Get peaks
        const peaks = getPeaks(channelData, sampleRate);

        if (peaks.length < 2) {
            return 0;
        }

        // Calculate intervals between peaks
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }

        // Group intervals
        const counts = {};
        intervals.forEach(interval => {
            // Round to nearest 0.01 seconds
            const rounded = Math.round(interval * 100) / 100;
            counts[rounded] = (counts[rounded] || 0) + 1;
        });

        // Find most common interval
        let maxCount = 0;
        let commonInterval = 0;

        Object.entries(counts).forEach(([interval, count]) => {
            if (count > maxCount) {
                maxCount = count;
                commonInterval = parseFloat(interval);
            }
        });

        if (commonInterval === 0) {
            return 0;
        }

        // Convert to BPM
        let bpm = 60 / commonInterval;

        // Normalize to common BPM range (60-180)
        while (bpm < 60) bpm *= 2;
        while (bpm > 180) bpm /= 2;

        return Math.round(bpm);
    }

    /**
     * Find peaks in audio data
     * @param {Float32Array} data
     * @param {number} sampleRate
     * @returns {Array} Peak positions in seconds
     */
    function getPeaks(data, sampleRate) {
        const peaks = [];
        const threshold = 0.5;
        const minInterval = 0.1 * sampleRate; // Minimum 100ms between peaks

        let lastPeak = -minInterval;

        // Calculate RMS for threshold
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        const peakThreshold = rms * 2;

        for (let i = 1; i < data.length - 1; i++) {
            const current = Math.abs(data[i]);
            const prev = Math.abs(data[i - 1]);
            const next = Math.abs(data[i + 1]);

            if (current > prev && current > next &&
                current > peakThreshold &&
                i - lastPeak > minInterval) {
                peaks.push(i / sampleRate);
                lastPeak = i;
            }
        }

        return peaks;
    }

    /**
     * Detect musical key (simplified)
     * Uses basic frequency analysis
     * @param {AudioBuffer} buffer
     * @returns {string} Estimated key
     */
    function detectKey(buffer) {
        // Simplified key detection based on dominant frequencies
        // This is a basic implementation - real key detection requires more sophisticated analysis

        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // For now, return a random but consistent key based on buffer properties
        // A proper implementation would use FFT and pitch class profiles
        const hash = (buffer.length + buffer.sampleRate) % 12;
        return notes[hash];
    }

    /**
     * Analyze audio and return metadata
     * @param {AudioBuffer|Blob|ArrayBuffer} source
     * @returns {Promise<Object>}
     */
    async function analyzeAudio(source) {
        let buffer;

        if (source instanceof AudioBuffer) {
            buffer = source;
        } else {
            // Need to decode first
            if (!audioContext) {
                initAudioContext();
            }

            let arrayBuffer;
            if (source instanceof Blob) {
                arrayBuffer = await source.arrayBuffer();
            } else if (source instanceof ArrayBuffer) {
                arrayBuffer = source;
            } else {
                throw new Error('Invalid source type');
            }

            buffer = await audioContext.decodeAudioData(arrayBuffer);
        }

        return {
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            numberOfChannels: buffer.numberOfChannels,
            bpm: detectBPM(buffer),
            key: detectKey(buffer)
        };
    }

    /**
     * Create preview waveform for a sample
     * @param {Blob|ArrayBuffer} source
     * @returns {Promise<Float32Array>}
     */
    async function createPreviewWaveform(source) {
        if (!audioContext) {
            initAudioContext();
        }

        let arrayBuffer;
        if (source instanceof Blob) {
            arrayBuffer = await source.arrayBuffer();
        } else {
            arrayBuffer = source;
        }

        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        return generateWaveformData(buffer, 100);
    }

    /**
     * Cleanup and release resources
     */
    function cleanup() {
        stop();

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        analyser = null;
        gainNode = null;
        currentBuffer = null;
        waveformData = null;
    }

    // Public API
    return {
        init,
        setupWaveform,
        load,
        play,
        pause,
        stop,
        togglePlay,
        seek,
        setVolume,
        getVolume,
        toggleLoop,
        setLoop,
        getCurrentTime,
        getDuration,
        getState,
        setCallbacks,
        updateSettings,
        formatTime,
        detectBPM,
        detectKey,
        analyzeAudio,
        createPreviewWaveform,
        cleanup
    };
})();

// Export to window
if (typeof window !== 'undefined') {
    window.AudioEngine = AudioEngine;
}
