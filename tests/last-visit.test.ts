import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { i18n } from '../lib/i18n';
import { nextVisit, parseVisit, VISIT_GAP_MS, visitWhen, visitWhenText } from '../lib/last-visit';

const MIN = 60_000;
const HOUR = 60 * MIN;
/** A local time on Monday 16 November 2026 (the tests read local times, as the browser does). */
const mon = (h: number, m = 0) => new Date(2026, 10, 16, h, m).getTime();
const words = (since: number, now: number) => visitWhenText(visitWhen(since, now), i18n);

describe('nextVisit', () => {
  it('has nothing to compare with on the first visit', () => {
    assert.deepEqual(nextVisit(null, mon(9)), { since: null, seen: mon(9) });
  });
  it('keeps the visit going after a short break', () => {
    const visit = { since: mon(7), seen: mon(9) };
    assert.deepEqual(nextVisit(visit, mon(9) + VISIT_GAP_MS), { since: mon(7), seen: mon(9) + VISIT_GAP_MS });
  });
  it('starts a new visit after a long break, from when the last one ended', () => {
    const visit = { since: mon(7), seen: mon(9) };
    assert.deepEqual(nextVisit(visit, mon(9) + VISIT_GAP_MS + 1), { since: mon(9), seen: mon(9) + VISIT_GAP_MS + 1 });
  });
  it('starts over when the clock went back', () => {
    assert.deepEqual(nextVisit({ since: mon(7), seen: mon(12) }, mon(9)), { since: null, seen: mon(9) });
  });
});

describe('parseVisit', () => {
  it('reads what was stored and refuses anything else', () => {
    assert.deepEqual(parseVisit(JSON.stringify({ since: 1, seen: 2 })), { since: 1, seen: 2 });
    assert.deepEqual(parseVisit(JSON.stringify({ since: null, seen: 2 })), { since: null, seen: 2 });
    assert.deepEqual(parseVisit(JSON.stringify({ since: 3, seen: 2 })), { since: null, seen: 2 });
    assert.equal(parseVisit('{"seen":"soon"}'), null);
    assert.equal(parseVisit('not json'), null);
    assert.equal(parseVisit(null), null);
  });
});

describe('the last visit in words', () => {
  it('counts minutes, then hours the same day', () => {
    assert.equal(words(mon(9), mon(9, 1)), 'a minute ago');
    assert.equal(words(mon(9), mon(9, 40)), '40 minutes ago');
    assert.equal(words(mon(9), mon(10)), 'an hour ago');
    assert.equal(words(mon(9), mon(13)), '4 hours ago');
  });
  it('names the part of the day further back', () => {
    assert.equal(words(mon(8), mon(18)), 'this morning');
    assert.equal(words(mon(13), mon(20)), 'this afternoon');
    assert.equal(words(mon(2), mon(9)), 'last night');
    assert.equal(words(mon(23) - 24 * HOUR, mon(9)), 'last night');
    assert.equal(words(mon(18) - 24 * HOUR, mon(9)), 'yesterday evening');
    assert.equal(words(mon(10) - 24 * HOUR, mon(9)), 'yesterday morning');
  });
  it('names the day, then the date', () => {
    assert.equal(words(mon(10) - 2 * 24 * HOUR, mon(9)), 'on Saturday');
    assert.equal(words(new Date(2026, 10, 3, 10).getTime(), mon(9)), 'on 3 November');
  });
});
