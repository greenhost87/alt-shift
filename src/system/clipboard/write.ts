import * as m from '../../paraglide/messages.js';

async function writeClipboardItem(text: string) {
  try {
    const item = new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

export async function writeClipboardText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return '';
  } catch {
    return (await writeClipboardItem(text)) ? '' : m.clipboard_copy_failed();
  }
}
