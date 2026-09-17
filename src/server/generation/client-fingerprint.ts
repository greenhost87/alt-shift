import { createHmac } from 'node:crypto';
import { getSessionSecret } from '../security/config';
const CLIENT_DEVICE_SIGNAL_PATTERN = /^[a-f0-9]{64}$/;
const MAX_HEADER_LENGTH = 512;
const SIGNAL_HEADERS = [
  'user-agent',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'accept-language',
  'x-client-device-signals',
] as const;

function getHeaderValue(headers: Headers, name: string): string {
  return (headers.get(name) ?? '').trim().slice(0, MAX_HEADER_LENGTH);
}

export function hasValidClientDeviceSignal(request: Request): boolean {
  return CLIENT_DEVICE_SIGNAL_PATTERN.test(
    getHeaderValue(request.headers, 'x-client-device-signals'),
  );
}

export function getClientFingerprint(request: Request): string {
  const fingerprint = createHmac('sha256', getSessionSecret());
  for (const header of SIGNAL_HEADERS) {
    fingerprint.update('\u0000');
    fingerprint.update(getHeaderValue(request.headers, header));
  }
  return fingerprint.digest('hex');
}
