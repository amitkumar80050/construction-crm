/**
 * Virtual Media Stream Utility
 * Provides safe fallback for environments without camera/microphone hardware (e.g. desktop PCs, VMs).
 * Prevents NotFoundError / NotAllowedError crashes and generates animated canvas video streams.
 */

export const createVirtualStream = (label = 'Caller', isVideo = true, isRemote = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let animFrameId = null;
  let phase = 0;

  const initials = (label || 'CRM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'AI';

  const draw = () => {
    phase += 0.05;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (isRemote) {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
    } else {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#111827');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 40; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 20;

    // Pulsating audio radar waves
    const waves = [1, 2, 3];
    waves.forEach((w) => {
      const radius = 60 + w * 28 + Math.sin(phase + w) * 8;
      const alpha = Math.max(0, 0.25 - w * 0.07);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isRemote ? `rgba(99, 102, 241, ${alpha})` : `rgba(34, 197, 94, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Avatar Circle
    const avatarGrad = ctx.createLinearGradient(centerX - 50, centerY - 50, centerX + 50, centerY + 50);
    if (isRemote) {
      avatarGrad.addColorStop(0, '#6366f1');
      avatarGrad.addColorStop(1, '#a855f7');
    } else {
      avatarGrad.addColorStop(0, '#10b981');
      avatarGrad.addColorStop(1, '#059669');
    }
    ctx.beginPath();
    ctx.arc(centerX, centerY, 54, 0, Math.PI * 2);
    ctx.fillStyle = avatarGrad;
    ctx.shadowColor = isRemote ? 'rgba(99, 102, 241, 0.4)' : 'rgba(16, 185, 129, 0.4)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Avatar border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Initials text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, centerX, centerY);

    // Label Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(label, centerX, centerY + 85);

    // Subtitle badge
    const badgeText = isRemote ? '● Remote Live Stream' : '● Virtual Camera Feed';
    ctx.fillStyle = isRemote ? '#818cf8' : '#34d399';
    ctx.font = '500 13px sans-serif';
    ctx.fillText(badgeText, centerX, centerY + 112);

    animFrameId = requestAnimationFrame(draw);
  };

  draw();

  const canvasStream = canvas.captureStream ? canvas.captureStream(25) : new MediaStream();

  // Attach silent audio track
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // virtually silent
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    }
  } catch (e) {
    // audio context not allowed without gesture, ignore
  }

  canvasStream.stopAllTracks = () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    canvasStream.getTracks().forEach(t => t.stop());
  };

  return canvasStream;
};

/**
 * Safely requests media stream without crashing on NotFoundError or PermissionDenied
 */
export const getMediaStreamSafely = async (videoRequired = false, label = 'You') => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const stream = createVirtualStream(label, videoRequired, false);
    return { stream, isVirtual: true, videoActive: false, error: 'MediaDevices unsupported' };
  }

  // 1. Try video + audio if video required
  if (videoRequired) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
      return { stream, isVirtual: false, videoActive: true, error: null };
    } catch (err) {
      console.warn('Camera access unavailable or not found, falling back cleanly:', err.message);
    }
  }

  // 2. Try audio only
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (videoRequired) {
      // Add a virtual video track to audio stream so video tags work cleanly
      const virtualStream = createVirtualStream(label, true, false);
      const videoTrack = virtualStream.getVideoTracks()[0];
      if (videoTrack) audioStream.addTrack(videoTrack);
      return { stream: audioStream, isVirtual: false, videoActive: false, error: 'Camera not found, audio active' };
    }
  } catch (err) {
    // Expected on devices without microphone hardware (e.g. desktop PCs)
    console.debug('Microphone not detected, using virtual audio mode');
  }

  // 3. Fallback to complete virtual stream
  const virtual = createVirtualStream(label, videoRequired, false);
  return { stream: virtual, isVirtual: true, videoActive: false, error: 'Using virtual simulated media' };
};
