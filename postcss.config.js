import { fileURLToPath } from 'node:url';
import { getConfig } from 'reshaped/config/postcss.js';

export default getConfig({
  themeMediaCSSPath: fileURLToPath(new URL('./src/themes/variant/media.css', import.meta.url)),
});
