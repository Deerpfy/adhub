/**
 * Claude RCS Workspace - Signaling
 * WebRTC signaling through manual code exchange
 */

import { TIMEOUTS } from './constants.js';

/**
 * Signaling manager for WebRTC connection establishment
 * Uses manual SDP exchange via copy-paste invite codes
 */
export class SignalingManager {
    constructor() {
        this.localOffer = null;
        this.localAnswer = null;
    }

    /**
     * Generate invite code from SDP offer
     * @param {RTCPeerConnection} peerConnection
     * @returns {Promise<string>} Base64 encoded SDP offer
     */
    async generateInviteCode(peerConnection) {
        try {
            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Wait for ICE candidates to be gathered
            await this.waitForIceCandidates(peerConnection);

            // Get complete SDP with candidates
            const fullOffer = {
                type: 'offer',
                sdp: peerConnection.localDescription.sdp,
                timestamp: Date.now(),
                version: '1.0'
            };

            // Encode to base64
            const encoded = btoa(JSON.stringify(fullOffer));
            console.log('[Signaling] Invite code generated');

            return encoded;
        } catch (error) {
            console.error('[Signaling] Failed to generate invite code:', error);
            throw error;
        }
    }

    /**
     * Parse invite code and extract SDP
     * @param {string} code Base64 encoded invite code
     * @returns {RTCSessionDescriptionInit|null}
     */
    parseInviteCode(code) {
        try {
            // Clean up the code (remove whitespace)
            const cleanCode = code.trim().replace(/\s/g, '');

            // Decode from base64
            const decoded = atob(cleanCode);
            const parsed = JSON.parse(decoded);

            // Validate structure
            if (!parsed.type || !parsed.sdp) {
                console.error('[Signaling] Invalid invite code structure');
                return null;
            }

            return {
                type: parsed.type,
                sdp: parsed.sdp
            };
        } catch (error) {
            console.error('[Signaling] Failed to parse invite code:', error);
            return null;
        }
    }

    /**
     * Generate answer code for client
     * @param {RTCPeerConnection} peerConnection
     * @param {string} inviteCode Offer code from host
     * @returns {Promise<string>} Base64 encoded SDP answer
     */
    async generateAnswerCode(peerConnection, inviteCode) {
        try {
            // Parse the invite code
            const offer = this.parseInviteCode(inviteCode);
            if (!offer) {
                throw new Error('Invalid invite code');
            }

            // Set remote description (offer from host)
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Wait for ICE candidates
            await this.waitForIceCandidates(peerConnection);

            // Get complete SDP with candidates
            const fullAnswer = {
                type: 'answer',
                sdp: peerConnection.localDescription.sdp,
                timestamp: Date.now(),
                version: '1.0'
            };

            // Encode to base64
            const encoded = btoa(JSON.stringify(fullAnswer));
            console.log('[Signaling] Answer code generated');

            return encoded;
        } catch (error) {
            console.error('[Signaling] Failed to generate answer code:', error);
            throw error;
        }
    }

    /**
     * Apply answer from client to complete connection
     * @param {RTCPeerConnection} peerConnection
     * @param {string} answerCode Answer code from client
     * @returns {Promise<boolean>}
     */
    async applyAnswer(peerConnection, answerCode) {
        try {
            // Parse the answer code
            const answer = this.parseInviteCode(answerCode);
            if (!answer) {
                throw new Error('Invalid answer code');
            }

            // Verify it's an answer
            if (answer.type !== 'answer') {
                throw new Error('Expected answer, got: ' + answer.type);
            }

            // Set remote description (answer from client)
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

            console.log('[Signaling] Answer applied successfully');
            return true;
        } catch (error) {
            console.error('[Signaling] Failed to apply answer:', error);
            return false;
        }
    }

    /**
     * Wait for ICE gathering to complete
     * @param {RTCPeerConnection} peerConnection
     * @returns {Promise<void>}
     */
    waitForIceCandidates(peerConnection) {
        return new Promise((resolve) => {
            // Check if already complete
            if (peerConnection.iceGatheringState === 'complete') {
                console.log('[Signaling] ICE gathering already complete');
                resolve();
                return;
            }

            // Listen for state change
            const checkState = () => {
                if (peerConnection.iceGatheringState === 'complete') {
                    console.log('[Signaling] ICE gathering completed');
                    peerConnection.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };

            peerConnection.addEventListener('icegatheringstatechange', checkState);

            // Also listen for individual candidates to detect when gathering is done
            let candidateCount = 0;
            const onCandidate = (event) => {
                if (event.candidate) {
                    candidateCount++;
                    console.log(`[Signaling] ICE candidate ${candidateCount}:`, event.candidate.type);
                } else {
                    // Null candidate means gathering is complete
                    console.log('[Signaling] All ICE candidates gathered');
                    peerConnection.removeEventListener('icecandidate', onCandidate);
                    resolve();
                }
            };

            peerConnection.addEventListener('icecandidate', onCandidate);

            // Timeout fallback
            setTimeout(() => {
                console.log('[Signaling] ICE gathering timeout, proceeding...');
                peerConnection.removeEventListener('icegatheringstatechange', checkState);
                peerConnection.removeEventListener('icecandidate', onCandidate);
                resolve();
            }, TIMEOUTS.iceGathering);
        });
    }

    /**
     * Validate invite/answer code format
     * @param {string} code
     * @returns {boolean}
     */
    validateCode(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }

        try {
            const parsed = this.parseInviteCode(code);
            return parsed !== null && (parsed.type === 'offer' || parsed.type === 'answer');
        } catch {
            return false;
        }
    }

    /**
     * Get code type (offer or answer)
     * @param {string} code
     * @returns {string|null}
     */
    getCodeType(code) {
        try {
            const parsed = this.parseInviteCode(code);
            return parsed ? parsed.type : null;
        } catch {
            return null;
        }
    }
}
