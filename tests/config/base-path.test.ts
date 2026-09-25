import { expect, test } from 'bun:test';
import { getCookiePath, normalizeBasePath, withBasePath } from '../../src/system/config/base-path';

test('normalizes a deployment path prefix', () => {
  expect(normalizeBasePath(undefined)).toBe('');
  expect(normalizeBasePath('/')).toBe('');
  expect(normalizeBasePath(' cover-letter/ ')).toBe('/cover-letter');
});

test('prefixes application-absolute paths', () => {
  expect(withBasePath('/cover-letter', '/api/health')).toBe('/cover-letter/api/health');
  expect(withBasePath('/cover-letter', '/')).toBe('/cover-letter');
  expect(withBasePath('', '/api/health')).toBe('/api/health');
  expect(() => withBasePath('/cover-letter', 'api/health')).toThrow(
    'withBasePath expects an absolute path',
  );
});

test('scopes cookies to the deployed application path', () => {
  expect(getCookiePath('/cover-letter')).toBe('/cover-letter');
  expect(getCookiePath('')).toBe('/');
});
