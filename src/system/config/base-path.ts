export function normalizeBasePath(rawValue: string | undefined): string {
  const value = rawValue?.trim();
  if (!value || value === '/') return '';

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

export function withBasePath(basePath: string, path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`withBasePath expects an absolute path, got: ${path}`);
  }
  if (!basePath) return path;
  if (path === '/') return basePath;
  return `${basePath}${path}`;
}

export function getCookiePath(basePath: string): string {
  return basePath || '/';
}
