const CLIPBOARD_ERROR =
  'The application could not be copied to the clipboard. Please try again.';

export async function writeClipboardText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return '';
  } catch {
    return CLIPBOARD_ERROR;
  }
}
