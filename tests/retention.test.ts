import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { effectiveRetention, formatMegabytes, SHORT_RETENTION_DAYS } from '../lib/ingestion/retention';

const MB = 1024 * 1024;

describe('effectiveRetention', () => {
  it('keeps the configured days while the database is small', () => {
    assert.deepEqual(effectiveRetention(30, 28 * MB), { days: 30, shortened: false });
    assert.deepEqual(effectiveRetention(30, 300 * MB), { days: 30, shortened: false });
  });
  it('keeps fewer days once it is over 300 MB', () => {
    assert.deepEqual(effectiveRetention(30, 301 * MB), { days: SHORT_RETENTION_DAYS, shortened: true });
    assert.deepEqual(effectiveRetention(30, 480 * MB), { days: SHORT_RETENTION_DAYS, shortened: true });
  });
  it('never lengthens a retention that is already short', () => {
    assert.deepEqual(effectiveRetention(7, 400 * MB), { days: 7, shortened: false });
    assert.deepEqual(effectiveRetention(14, 400 * MB), { days: 14, shortened: false });
  });
  it('uses the configured days when the size is unknown', () => {
    assert.deepEqual(effectiveRetention(30, null), { days: 30, shortened: false });
  });
});

describe('formatMegabytes', () => {
  it('prints a short size', () => {
    assert.equal(formatMegabytes(28.4 * MB), '28 MB');
    assert.equal(formatMegabytes(5.55 * MB), '5.5 MB');
  });
});
