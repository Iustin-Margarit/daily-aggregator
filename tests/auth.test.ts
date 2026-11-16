import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { callbackErrorCode, RECENT_SIGN_IN_SECONDS, signedInRecently } from '../lib/auth';

describe('auth: recent sign-in check', () => {
  const now = 1_800_000_000;

  it('accepts a sign-in within the window', () => {
    assert.equal(signedInRecently([{ method: 'oauth', timestamp: now - 60 }], now), true);
    assert.equal(signedInRecently([{ method: 'oauth', timestamp: now - RECENT_SIGN_IN_SECONDS }], now), true);
  });

  it('uses the latest of several methods', () => {
    const amr = [
      { method: 'password', timestamp: now - 86_400 },
      { method: 'oauth', timestamp: now - 30 },
    ];
    assert.equal(signedInRecently(amr, now), true);
  });

  it('rejects old, missing, timestamp-less and future sign-ins', () => {
    assert.equal(signedInRecently([{ method: 'oauth', timestamp: now - RECENT_SIGN_IN_SECONDS - 1 }], now), false);
    assert.equal(signedInRecently(undefined, now), false);
    assert.equal(signedInRecently([], now), false);
    assert.equal(signedInRecently(['oauth'], now), false);
    assert.equal(signedInRecently([{ method: 'oauth', timestamp: now + 3600 }], now), false);
  });
});

describe('auth: callback errors', () => {
  it('maps an expired email link to link_invalid', () => {
    assert.equal(callbackErrorCode(new URLSearchParams('error=access_denied&error_code=otp_expired')), 'link_invalid');
    assert.equal(callbackErrorCode(new URLSearchParams('')), 'link_invalid');
  });

  it('maps a cancelled or failed Google sign-in to sign_in_failed', () => {
    assert.equal(callbackErrorCode(new URLSearchParams('error=access_denied&error_description=cancelled')), 'sign_in_failed');
    assert.equal(callbackErrorCode(new URLSearchParams('error=server_error')), 'sign_in_failed');
  });
});
