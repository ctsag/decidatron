const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spinButton');
const resultDiv = document.getElementById('result');
const timerDiv = document.getElementById('timer');
const spinsCounter = document.getElementById('spinsCounter');
const optionInput = document.getElementById('optionInput');
const addButton = document.getElementById('addButton');
const optionsList = document.getElementById('optionsList');
const optionError = document.getElementById('optionError');
const prepTimeInput = document.getElementById('prepTime');
const countdownMinutesInput = document.getElementById('countdownMinutes');
const countdownSecondsInput = document.getElementById('countdownSeconds');
const enableCountdownCheckbox = document.getElementById('enableCountdown');

let options = []; // Array of { text, enabled }
let currentRotation = 0;
let isSpinning = false;
let spinCount = 0;
let isCountingDown = false;

// A vibrant color palette that cycles for many options
const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B4B4', '#A3E4D7', '#AED6F1', '#A9DFBF', '#F9E79F',
    '#D2B4DE', '#A2D9CE', '#FAD7A0', '#C39BD3', '#7FB3D8'
];

function getEnabledOptions() {
    return options.filter(o => o.enabled);
}

function getSegmentAngle() {
    const enabled = getEnabledOptions();
    return enabled.length > 0 ? (2 * Math.PI) / enabled.length : 2 * Math.PI;
}

let flashSegmentIndex = -1; // -1 means no flash

function drawWheel(rotation) {
    const size = 400;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 185;

    ctx.clearRect(0, 0, size, size);

    const enabledOptions = options.filter(o => o.enabled);

    if (options.length === 0 || enabledOptions.length === 0) {
        // Draw empty wheel
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0e0e0';
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.length === 0 ? 'Add options below' : 'All options disabled', cx, cy);
        return;
    }

    const segmentAngle = getSegmentAngle();

    for (let i = 0; i < enabledOptions.length; i++) {
        const startAngle = rotation + i * segmentAngle;
        const endAngle = startAngle + segmentAngle;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = colorPalette[i % colorPalette.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flash overlay for the selected segment
        if (flashSegmentIndex === i) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
            ctx.restore();
        }

        // Draw label text — flowing along the arc of the slice, from outer edge inward
        const label = enabledOptions[i].text;

        // We'll draw text in concentric arcs from the outer edge inward.
        // Each "line" of text sits on an arc at a given radius.
        const innerRadius = 34;   // stop just outside the center circle
        const outerRadius = radius - 14;  // start just inside the wheel edge
        const usableRadius = outerRadius - innerRadius;

        // Helper: word-wrap text for a given arc length and font size
        // Returns lines or null if a single word is too wide
        function wrapForArc(text, fontSize, arcLen) {
            ctx.font = `bold ${fontSize}px Arial`;
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (ctx.measureText(testLine).width <= arcLen) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    // If the word itself is too wide, this font size won't work
                    if (ctx.measureText(word).width > arcLen) {
                        return null;
                    }
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
        }

        // Try font sizes from 22px down to 7px
        let bestFontSize = 7;
        let bestLines = [label];
        const lineSpacing = 1.3; // line height as multiplier of font size

        for (let size = 22; size >= 7; size--) {
            const lh = size * lineSpacing;
            const maxLines = Math.floor(usableRadius / lh);
            if (maxLines < 1) continue;

            // Each line sits on an arc at radius: outerRadius - lineIdx * lh - lh/2
            // The arc length at that radius is: r * segmentAngle
            // We need all lines to fit within their respective arcs
            let allLinesFit = true;
            let wrappedLines = null;

            for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
                const r = outerRadius - lineIdx * lh - lh / 2;
                const arcLen = r * segmentAngle;
                // Apply padding to the arc length so text doesn't sit flush at the edges
                const paddedArcLen = arcLen - size * 0.4;

                if (lineIdx === 0) {
                    // First line (outermost): wrap the full text
                    wrappedLines = wrapForArc(label, size, paddedArcLen);
                    if (!wrappedLines) {
                        allLinesFit = false;
                        break;
                    }
                    // If it fits in one line, we're done
                    if (wrappedLines.length === 1) {
                        bestFontSize = size;
                        bestLines = wrappedLines;
                        allLinesFit = true;
                        break;
                    }
                    // If it needs more lines than we have arcs, try smaller size
                    if (wrappedLines.length > maxLines) {
                        allLinesFit = false;
                        break;
                    }
                } else {
                    // Subsequent lines (inner arcs): check if each wrapped line fits
                    if (lineIdx < wrappedLines.length) {
                        const w = ctx.measureText(wrappedLines[lineIdx]).width;
                        if (w > paddedArcLen) {
                            allLinesFit = false;
                            break;
                        }
                    }
                }
            }

            if (allLinesFit && wrappedLines) {
                bestFontSize = size;
                bestLines = wrappedLines;
                break;
            }
        }

        // Verify that all lines fit within their respective arcs at the drawing radius
        // (with padding). If any line is too wide, shrink the font size until everything fits.
        let needsShrink = true;
        while (needsShrink && bestFontSize > 7) {
            const checkLh = bestFontSize * lineSpacing;
            needsShrink = false;
            for (let lineIdx = 0; lineIdx < bestLines.length; lineIdx++) {
                const r = outerRadius - lineIdx * checkLh - checkLh / 2;
                const arcLen = r * segmentAngle;
                const paddedArcLen = arcLen - bestFontSize * 0.4;
                const w = ctx.measureText(bestLines[lineIdx]).width;
                if (w > paddedArcLen) {
                    needsShrink = true;
                    break;
                }
            }
            if (needsShrink) {
                bestFontSize--;
                const newLh = bestFontSize * lineSpacing;
                const newResult = wrapForArc(label, bestFontSize, (outerRadius - newLh / 2) * segmentAngle - bestFontSize * 0.4);
                if (newResult) {
                    bestLines = newResult;
                }
            }
        }

        // Draw the text flowing along the arc, from outer edge inward
        ctx.save();
        ctx.translate(cx, cy);

        ctx.fillStyle = '#333';
        ctx.font = `bold ${bestFontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        const lh = bestFontSize * lineSpacing;
        // Measure how far the character extends above the baseline
        const ascent = ctx.measureText('M').actualBoundingBoxAscent || bestFontSize * 0.75;

        for (let lineIdx = 0; lineIdx < bestLines.length; lineIdx++) {
            // Start from the outer edge and work inward.
            // Use the SAME radius as the font-size search (no extra offset)
            // so the arc length matches what was used during layout.
            const r = outerRadius - lineIdx * lh - lh / 2;
            const arcLen = r * segmentAngle;

            const text = bestLines[lineIdx];

            // Calculate total width of the text
            const totalTextWidth = ctx.measureText(text).width;

            // If the text is wider than the arc, skip drawing to avoid overflow
            if (totalTextWidth > arcLen) continue;

            // Centre the text in the arc with a small padding on each side
            const paddedArcLen = arcLen - bestFontSize * 0.4;
            const centreOffset = Math.max(0, (paddedArcLen - totalTextWidth) / 2);

            const chars = text.split('');
            let xOffset = centreOffset;

            for (let cIdx = 0; cIdx < chars.length; cIdx++) {
                const ch = chars[cIdx];
                const chWidth = ctx.measureText(ch).width;

                // Position along the arc from startAngle toward endAngle
                const charAngle = xOffset / r;
                const angle = startAngle + charAngle;

                const px = r * Math.cos(angle);
                const py = r * Math.sin(angle);

                ctx.save();
                ctx.translate(px, py);
                // Rotate so the character is tangent to the arc
                // angle + PI/2 makes the bottom of the character face the centre
                // and the top face the wheel edge
                ctx.rotate(angle + Math.PI / 2);
                ctx.fillText(ch, 0, 0);
                ctx.restore();

                xOffset += chWidth;
            }
        }

        ctx.restore();
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
}

function getResult(rotation) {
    const enabled = getEnabledOptions();
    if (enabled.length === 0) return null;

    const segmentAngle = getSegmentAngle();
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const pointerAngle = (3 * Math.PI) / 2; // 270 degrees (top)
    const segmentIndex = Math.floor(((pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI)) / segmentAngle);
    return enabled[segmentIndex];
}

// --- Confetti ---

let confettiPieces = [];
let confettiAnimId = null;

function spawnConfetti() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD', '#F7DC6F', '#FF8A5C', '#A29BFE'];
    const pieces = [];
    const count = 120;

    // Get the wheel's centre in viewport coordinates
    const canvasRect = canvas.getBoundingClientRect();
    const centreX = canvasRect.left + canvasRect.width / 2;
    const centreY = canvasRect.top + canvasRect.height / 2;

    for (let i = 0; i < count; i++) {
        pieces.push({
            x: centreX,
            y: centreY,
            vx: (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.8) * 18 - 4,
            size: 6 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            opacity: 1,
            shape: Math.random() > 0.5 ? 'rect' : 'circle',
        });
    }

    confettiPieces = pieces;

    if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
    }

    // Create an overlay canvas for confetti
    let overlay = document.getElementById('confettiCanvas');
    if (!overlay) {
        overlay = document.createElement('canvas');
        overlay.id = 'confettiCanvas';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '1000';
        document.body.appendChild(overlay);
    }
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    const octx = overlay.getContext('2d');

    let startTime = performance.now();

    function animateConfetti(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / 2000, 1); // 2 second animation

        octx.clearRect(0, 0, overlay.width, overlay.height);

        for (const p of confettiPieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // gravity
            p.rotation += p.rotSpeed;
            p.opacity = Math.max(0, 1 - progress * 1.2);

            if (p.opacity <= 0) continue;

            octx.save();
            octx.translate(p.x, p.y);
            octx.rotate(p.rotation);
            octx.globalAlpha = p.opacity;
            octx.fillStyle = p.color;

            if (p.shape === 'rect') {
                octx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                octx.beginPath();
                octx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                octx.fill();
            }

            octx.restore();
        }

        if (progress < 1) {
            confettiAnimId = requestAnimationFrame(animateConfetti);
        } else {
            octx.clearRect(0, 0, overlay.width, overlay.height);
            confettiAnimId = null;
            confettiPieces = [];
        }
    }

    confettiAnimId = requestAnimationFrame(animateConfetti);
}

// --- Spin Sound ---

let spinAudioCtx = null;
let lastTickAngle = 0;
const tickAngleThreshold = (2 * Math.PI) / 24; // tick roughly every 1/24th of a rotation

function initSpinAudio() {
    if (!spinAudioCtx) {
        spinAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTick(volume) {
    try {
        initSpinAudio();
        const osc = spinAudioCtx.createOscillator();
        const gain = spinAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(spinAudioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, spinAudioCtx.currentTime);

        // Volume scales with speed — louder when fast, quieter when slow
        gain.gain.setValueAtTime(volume * 0.15, spinAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, spinAudioCtx.currentTime + 0.05);

        osc.start(spinAudioCtx.currentTime);
        osc.stop(spinAudioCtx.currentTime + 0.05);
    } catch (e) {
        // Audio not supported
    }
}

function playLandSound() {
    try {
        initSpinAudio();
        const now = spinAudioCtx.currentTime;

        // A satisfying "thud + ding" combo
        // Low thud
        const osc1 = spinAudioCtx.createOscillator();
        const gain1 = spinAudioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(spinAudioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Bright ding
        const osc2 = spinAudioCtx.createOscillator();
        const gain2 = spinAudioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(spinAudioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(0.25, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.6);
    } catch (e) {
        // Audio not supported
    }
}

function spin() {
    if (isSpinning) return;
    if (options.length === 0) {
        resultDiv.textContent = '⚠️ Add some options first!';
        return;
    }
    if (getEnabledOptions().length === 0) {
        resultDiv.textContent = '⚠️ Enable at least one option!';
        return;
    }

    cancelCountdown();
    isSpinning = true;
    spinButton.disabled = true;
    addButton.disabled = true;
    optionInput.disabled = true;
    resultDiv.textContent = 'Spinning...';
    resultDiv.classList.remove('highlight');

    // Random number of full rotations (8-14) plus random final position
    const fullRotations = (8 + Math.random() * 6) * 2 * Math.PI;
    const randomFinalAngle = Math.random() * 2 * Math.PI;
    const totalRotation = fullRotations + randomFinalAngle;

    const startRotation = currentRotation;
    const targetRotation = startRotation + totalRotation;
    const duration = 4000; // 4 seconds
    const startTime = performance.now();
    lastTickAngle = currentRotation;

    function animate() {
        // Use performance.now() so the elapsed time is accurate even when
        // the tab is in the background (rAF pauses, but setTimeout keeps going).
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Stronger deceleration: stays fast for ~60% of the time, then dramatically slows
        // Using a power curve that keeps values high until late in the animation
        const eased = 1 - Math.pow(1 - progress, 4);

        currentRotation = startRotation + (targetRotation - startRotation) * eased;
        drawWheel(currentRotation);

        // Tick sound — plays each time the wheel rotates past the threshold angle
        const angleDelta = Math.abs(currentRotation - lastTickAngle);
        if (angleDelta >= tickAngleThreshold) {
            // Volume scales with speed: fast = loud, slow = quiet
            const speed = eased < 0.01 ? 0 : Math.min(1, angleDelta / (tickAngleThreshold * 3));
            playTick(speed);
            lastTickAngle = currentRotation;
        }

        if (progress < 1) {
            // Use setTimeout instead of requestAnimationFrame so the spin
            // keeps running even when the tab is in the background.
            // When backgrounded, Chrome throttles setTimeout but it still
            // advances, so the spin completes and the countdown starts.
            setTimeout(animate, 16);
        } else {
            // Spin complete
            currentRotation = targetRotation;
            const result = getResult(currentRotation);

            // Animate result text with a dramatic entrance
            resultDiv.textContent = '';
            resultDiv.classList.remove('highlight');
            // Small delay then reveal with animation
            setTimeout(() => {
                resultDiv.textContent = `🎉 ${result.text}!`;
                resultDiv.classList.add('highlight');
                // Trigger a CSS animation via a class
                resultDiv.style.animation = 'none';
                resultDiv.offsetHeight; // reflow
                resultDiv.style.animation = 'resultBounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards';
            }, 200);

            playLandSound();
            spawnConfetti();
            spinCount++;
            spinsCounter.textContent = `Spins: ${spinCount}`;
            isSpinning = false;
            addButton.disabled = false;
            optionInput.disabled = false;
            optionInput.focus();

            // Flash the selected segment
            const enabled = getEnabledOptions();
            const segmentAngle = getSegmentAngle();
            const normalizedRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const pointerAngle = (3 * Math.PI) / 2;
            const selectedIndex = Math.floor(((pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI)) / segmentAngle);

            // Dramatic flash sequence: fast pulses that slow down
            let flashCount = 0;
            const maxFlashes = 7;
            const flashTimings = [80, 80, 120, 120, 180, 180, 300];
            function doFlash() {
                const isOn = flashCount % 2 === 0;
                flashSegmentIndex = isOn ? selectedIndex : -1;
                drawWheel(currentRotation);
                flashCount++;
                if (flashCount < maxFlashes) {
                    setTimeout(doFlash, flashTimings[flashCount] || 200);
                } else {
                    flashSegmentIndex = -1;
                    drawWheel(currentRotation);
                    startCountdown();
                }
            }
            doFlash();
        }
    }

    setTimeout(animate, 16);
}

// --- Countdown Timer ---

function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 4.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 5);

        // Two alternating tones for a more discernable alarm
        const osc1 = audioCtx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 0.25);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 0.5);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 0.75);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 1.0);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 1.25);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 1.5);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 1.75);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 2.0);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 2.25);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 2.5);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 2.75);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 3.0);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 3.25);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 3.5);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 3.75);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 4.0);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 4.25);
        osc1.frequency.setValueAtTime(660, audioCtx.currentTime + 4.5);
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 4.75);

        osc1.connect(gainNode);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 5);
    } catch (e) {
        // Audio not supported, silently ignore
    }
}

// Schedule the beep to play at a precise wall-clock time using the AudioContext's timeline.
// The AudioContext clock runs independently of JavaScript timer throttling, so this
// will play on time even when the tab is in the background.
function scheduleBeepAt(wallClockEndTime) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Calculate the offset from now to the scheduled time
        const delay = Math.max(0, (wallClockEndTime - performance.now()) / 1000);
        const playTime = audioCtx.currentTime + delay;

        const gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.4, playTime);
        gainNode.gain.linearRampToValueAtTime(0.4, playTime + 4.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, playTime + 5);

        const osc1 = audioCtx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(660, playTime);
        osc1.frequency.setValueAtTime(880, playTime + 0.25);
        osc1.frequency.setValueAtTime(660, playTime + 0.5);
        osc1.frequency.setValueAtTime(880, playTime + 0.75);
        osc1.frequency.setValueAtTime(660, playTime + 1.0);
        osc1.frequency.setValueAtTime(880, playTime + 1.25);
        osc1.frequency.setValueAtTime(660, playTime + 1.5);
        osc1.frequency.setValueAtTime(880, playTime + 1.75);
        osc1.frequency.setValueAtTime(660, playTime + 2.0);
        osc1.frequency.setValueAtTime(880, playTime + 2.25);
        osc1.frequency.setValueAtTime(660, playTime + 2.5);
        osc1.frequency.setValueAtTime(880, playTime + 2.75);
        osc1.frequency.setValueAtTime(660, playTime + 3.0);
        osc1.frequency.setValueAtTime(880, playTime + 3.25);
        osc1.frequency.setValueAtTime(660, playTime + 3.5);
        osc1.frequency.setValueAtTime(880, playTime + 3.75);
        osc1.frequency.setValueAtTime(660, playTime + 4.0);
        osc1.frequency.setValueAtTime(880, playTime + 4.25);
        osc1.frequency.setValueAtTime(660, playTime + 4.5);
        osc1.frequency.setValueAtTime(880, playTime + 4.75);

        osc1.connect(gainNode);
        osc1.start(playTime);
        osc1.stop(playTime + 5);
    } catch (e) {
        // Audio not supported, silently ignore
    }
}

function startCountdown() {
    if (isCountingDown) return;

    // If countdown is not enabled, just re-enable the spin button immediately
    if (!enableCountdownCheckbox.checked) {
        spinButton.disabled = false;
        return;
    }

    const prepSeconds = Math.max(0, parseInt(prepTimeInput.value) || 0);
    const countdownMins = Math.max(0, parseInt(countdownMinutesInput.value) || 0);
    const countdownSecs = Math.max(1, parseInt(countdownSecondsInput.value) || 10);
    const countdownSeconds = countdownMins * 60 + countdownSecs;

    isCountingDown = true;
    spinButton.disabled = true;

    if (prepSeconds > 0) {
        // Phase 1: Preparation
        timerDiv.textContent = `⚡ ${formatTime(prepSeconds)}`;
        timerDiv.className = 'timer prep';
        startCountdownTimer(prepSeconds, false);
    } else {
        // Skip prep phase, go straight to countdown
        startCountdownTimer(countdownSeconds, true);
    }
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
}

// Accurate countdown using setTimeout with performance.now() tracking.
// Unlike requestAnimationFrame (which pauses completely in background tabs),
// setTimeout keeps firing (even if throttled to ~1/sec), so the countdown
// advances correctly whether the tab is visible or not.
let countdownTimeoutId = null;

function startCountdownTimer(totalSeconds, isCountdownPhase) {
    const endTime = performance.now() + totalSeconds * 1000;

    // Schedule the beep on the AudioContext timeline for precise timing.
    // The AudioContext clock runs independently of JavaScript timer throttling,
    // so this will play at the right time even when the tab is in the background.
    if (isCountdownPhase) {
        scheduleBeepAt(endTime);
    }

    function tick() {
        const remaining = Math.max(0, Math.ceil((endTime - performance.now()) / 1000));

        if (isCountdownPhase) {
            timerDiv.textContent = `⏱️ ${formatTime(remaining)}`;
            timerDiv.className = 'timer active';
        } else {
            timerDiv.textContent = `⚡ ${formatTime(remaining)}`;
            timerDiv.className = 'timer prep';
        }

        if (remaining <= 0) {
            if (isCountdownPhase) {
                // Countdown phase complete
                isCountingDown = false;
                timerDiv.textContent = '';
                timerDiv.className = 'timer';
                spinButton.disabled = false;
                // Beep was already scheduled via scheduleBeepAt() above,
                // so it will play on time even if the tab is in the background.
            } else {
                // Prep phase complete, move to countdown
                const countdownMins = Math.max(0, parseInt(countdownMinutesInput.value) || 0);
                const countdownSecs = Math.max(1, parseInt(countdownSecondsInput.value) || 10);
                const countdownSeconds = countdownMins * 60 + countdownSecs;
                startCountdownTimer(countdownSeconds, true);
            }
            return;
        }

        // Use setTimeout instead of requestAnimationFrame so the timer
        // keeps ticking even when the tab is in the background.
        // We schedule at 200ms for responsive display updates, but the
        // actual time calculation is based on performance.now() so it's
        // always accurate regardless of how much setTimeout is throttled.
        countdownTimeoutId = setTimeout(tick, 200);
    }

    tick();
}

function cancelCountdown() {
    if (countdownTimeoutId) {
        clearTimeout(countdownTimeoutId);
        countdownTimeoutId = null;
    }
    isCountingDown = false;
    timerDiv.textContent = '';
    timerDiv.className = 'timer';
}

// --- Options Management ---

function renderOptionsList() {
    optionsList.innerHTML = '';

    if (options.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.textContent = 'No options yet. Add some above!';
        emptyMsg.className = 'empty-message';
        optionsList.appendChild(emptyMsg);
        return;
    }

    options.forEach((option, index) => {
        const li = document.createElement('li');
        if (!option.enabled) {
            li.classList.add('disabled');
        }

        const labelSpan = document.createElement('span');
        labelSpan.className = 'option-label';

        const colorDot = document.createElement('span');
        colorDot.className = 'color-dot';
        colorDot.style.backgroundColor = colorPalette[index % colorPalette.length];

        const textSpan = document.createElement('span');
        textSpan.textContent = option.text;

        labelSpan.appendChild(colorDot);
        labelSpan.appendChild(textSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'option-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn' + (option.enabled ? '' : ' disabled');
        toggleBtn.textContent = option.enabled ? '✓' : '✗';
        toggleBtn.title = option.enabled ? `Disable "${option.text}"` : `Enable "${option.text}"`;
        toggleBtn.addEventListener('click', () => toggleOption(index));

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = `Remove "${option.text}"`;
        removeBtn.addEventListener('click', () => removeOption(index));

        actionsDiv.appendChild(toggleBtn);
        actionsDiv.appendChild(removeBtn);

        li.appendChild(labelSpan);
        li.appendChild(actionsDiv);
        optionsList.appendChild(li);
    });
}

function saveOptions() {
    localStorage.setItem('decidatron_options', JSON.stringify(options));
}

function loadOptions() {
    const saved = localStorage.getItem('decidatron_options');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Migrate old format (plain strings) to new format ({ text, enabled })
                if (typeof parsed[0] === 'string') {
                    return parsed.map(text => ({ text, enabled: true }));
                }
                return parsed;
            }
        } catch (e) {
            // ignore corrupt data
        }
    }
    return null;
}

function addOption() {
    const text = optionInput.value.trim();
    if (!text) {
        showOptionError('⚠️ Please enter an option name.');
        return;
    }

    if (options.length >= 30) {
        showOptionError('⚠️ Maximum of 30 options allowed.');
        return;
    }

    if (options.some(o => o.text.toLowerCase() === text.toLowerCase())) {
        showOptionError('⚠️ This option already exists!');
        return;
    }

    options.push({ text, enabled: true });
    saveOptions();
    optionInput.value = '';
    optionInput.focus();
    renderOptionsList();
    drawWheel(currentRotation);
}

function showOptionError(message) {
    optionError.textContent = message;
    optionError.classList.remove('hidden');
    optionInput.focus();
    setTimeout(() => {
        optionError.classList.add('hidden');
    }, 2500);
}

function removeOption(index) {
    options.splice(index, 1);
    saveOptions();
    renderOptionsList();
    drawWheel(currentRotation);
}

function toggleOption(index) {
    options[index].enabled = !options[index].enabled;
    saveOptions();
    renderOptionsList();
    drawWheel(currentRotation);
}

// --- Event Listeners ---

function saveCountdownSettings() {
    localStorage.setItem('decidatron_countdown_enabled', enableCountdownCheckbox.checked);
    localStorage.setItem('decidatron_prep_time', prepTimeInput.value);
    localStorage.setItem('decidatron_countdown_minutes', countdownMinutesInput.value);
    localStorage.setItem('decidatron_countdown_seconds', countdownSecondsInput.value);
}

enableCountdownCheckbox.addEventListener('change', () => {
    const fields = document.querySelector('.countdown-fields');
    if (enableCountdownCheckbox.checked) {
        fields.classList.remove('disabled');
    } else {
        fields.classList.add('disabled');
    }
    saveCountdownSettings();
});

prepTimeInput.addEventListener('change', saveCountdownSettings);
countdownMinutesInput.addEventListener('change', saveCountdownSettings);
countdownSecondsInput.addEventListener('change', saveCountdownSettings);

// Clamp countdown seconds to 0-59 with visual feedback
countdownSecondsInput.addEventListener('input', () => {
    const val = parseInt(countdownSecondsInput.value);
    const errorEl = document.getElementById('countdownSecondsError');
    if (val > 59 || val < 0) {
        countdownSecondsInput.classList.add('input-error');
        if (errorEl) errorEl.classList.remove('hidden');
    } else {
        countdownSecondsInput.classList.remove('input-error');
        if (errorEl) errorEl.classList.add('hidden');
    }
});

spinButton.addEventListener('click', spin);

addButton.addEventListener('click', addOption);

optionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addOption();
    }
});

// Resize confetti canvas if window changes
window.addEventListener('resize', () => {
    const overlay = document.getElementById('confettiCanvas');
    if (overlay && overlay.width > 0) {
        overlay.width = window.innerWidth;
        overlay.height = window.innerHeight;
    }
});

// --- Initialisation ---

// Load saved countdown settings
const savedCountdownEnabled = localStorage.getItem('decidatron_countdown_enabled');
const countdownEnabled = savedCountdownEnabled === 'true';
enableCountdownCheckbox.checked = countdownEnabled;

const savedPrepTime = localStorage.getItem('decidatron_prep_time');
if (savedPrepTime !== null) {
    prepTimeInput.value = savedPrepTime;
}
const savedCountdownMinutes = localStorage.getItem('decidatron_countdown_minutes');
if (savedCountdownMinutes !== null) {
    countdownMinutesInput.value = savedCountdownMinutes;
}
const savedCountdownSeconds = localStorage.getItem('decidatron_countdown_seconds');
if (savedCountdownSeconds !== null) {
    countdownSecondsInput.value = savedCountdownSeconds;
}

const fields = document.querySelector('.countdown-fields');
if (!countdownEnabled) {
    fields.classList.add('disabled');
}

// Load saved options, or start with defaults
const savedOptions = loadOptions();
if (savedOptions) {
    options.push(...savedOptions);
} else {
    const defaults = ['Pizza', 'Sushi', 'Tacos', 'Burger', 'Pasta', 'Salad', 'Ramen', 'Curry'];
    options.push(...defaults.map(text => ({ text, enabled: true })));
    saveOptions();
}
renderOptionsList();
drawWheel(0);
