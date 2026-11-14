import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatClock, isPrefValue, prefAttributes, prefCookieName } from '../lib/reader-prefs';

describe('reader prefs: cookies to <html> attributes', () => {
  it('uses the defaults when there are no cookies', () => {
    assert.deepEqual(prefAttributes(() => undefined), {
      'data-clock': '12',
      'data-banner': 'moving',
      'data-photos': 'archival',
      'data-columns': 'justified',
    });
  });

  it('takes valid values and ignores anything else', () => {
    const cookies: Record<string, string> = { 'pref-clock': '24', 'pref-banner': 'hidden', 'pref-photos': '<script>', 'pref-columns': 'ragged' };
    assert.deepEqual(prefAttributes((name) => cookies[name]), {
      'data-clock': '24',
      'data-banner': 'hidden',
      'data-photos': 'archival',
      'data-columns': 'ragged',
    });
  });

  it('names the cookies after the preference', () => {
    assert.equal(prefCookieName('banner'), 'pref-banner');
    assert.equal(isPrefValue('banner', 'still'), true);
    assert.equal(isPrefValue('banner', 'paused'), false);
    assert.equal(isPrefValue('clock', undefined), false);
  });
});

describe('reader prefs: the clock', () => {
  const evening = new Date(2026, 10, 13, 15, 42);
  const morning = new Date(2026, 10, 13, 9, 5);

  it('prints 12-hour time with a.m. and p.m.', () => {
    assert.equal(formatClock(evening, '12'), '3:42 p.m.');
    assert.equal(formatClock(morning, '12'), '9:05 a.m.');
  });

  it('prints 24-hour time with two-digit hours', () => {
    assert.equal(formatClock(evening, '24'), '15:42');
    assert.equal(formatClock(morning, '24'), '09:05');
  });
});
