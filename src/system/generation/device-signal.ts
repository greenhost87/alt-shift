const CANVAS_TEXT = 'Alt+Shift client signal 🧭';

function getCanvasSignal(): string {
  if (typeof document === 'undefined') return 'unavailable';
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 60;
  const context = canvas.getContext('2d');
  if (!context) return 'unavailable';

  context.fillStyle = '#f3f4f6';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '17px Arial, sans-serif';
  context.textBaseline = 'top';
  context.fillStyle = '#087443';
  context.fillText(CANVAS_TEXT, 7, 7);
  context.strokeStyle = '#101828';
  context.beginPath();
  context.arc(242, 30, 19, 0, Math.PI * 2);
  context.stroke();
  return canvas.toDataURL();
}

function getWebGlSignal(): string {
  if (typeof document === 'undefined') return 'unavailable';
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  if (!context) return 'unavailable';
  const attributes = context.getContextAttributes();
  const extensions = context.getSupportedExtensions() ?? [];
  return JSON.stringify({
    attributes,
    extensions,
    height: context.drawingBufferHeight,
    width: context.drawingBufferWidth,
  });
}

function getScreenSignal(): string {
  if (typeof screen === 'undefined') return 'unavailable';
  return [
    screen.width,
    screen.height,
    screen.availWidth,
    screen.availHeight,
    screen.colorDepth,
    screen.pixelDepth,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  ].join('x');
}

function getLocaleSignal(): string {
  if (typeof navigator === 'undefined') return 'unavailable';
  try {
    return navigator.languages.join(',') || navigator.language || 'unavailable';
  } catch {
    return 'unavailable';
  }
}

function getTimeZoneSignal(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'unavailable';
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getClientDeviceSignal(): Promise<string> {
  let canvasSignal = 'unavailable';
  let webGlSignal = 'unavailable';
  try {
    canvasSignal = getCanvasSignal();
  } catch {
    // Privacy controls may intentionally block canvas reads.
  }
  try {
    webGlSignal = getWebGlSignal();
  } catch {
    // WebGL can be unavailable or blocked independently of canvas.
  }

  const source = [
    getLocaleSignal(),
    getTimeZoneSignal(),
    getScreenSignal(),
    canvasSignal,
    webGlSignal,
  ].join('\u0000');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return toHex(new Uint8Array(digest));
}
