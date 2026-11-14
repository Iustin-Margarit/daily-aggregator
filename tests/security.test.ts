import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkUrlShape, isPrivateAddress, UnsafeUrlError } from '../lib/ingestion/safe-fetch';
import { safeNextPath } from '../lib/redirect';
import { buildContentSecurityPolicy, createNonce } from '../lib/security-headers';
import { isReservedUsername, normalizeMutedKeyword, profileSaveError, validateUsername } from '../lib/validation';

describe('safe fetch: private address detection', () => {
  it('blocks loopback, private, link-local and reserved IPv4 ranges', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.10',
      '169.254.169.254', // cloud metadata
      '100.64.0.1',
      '0.0.0.0',
      '198.18.0.1',
      '224.0.0.1',
      '255.255.255.255',
    ]) {
      assert.equal(isPrivateAddress(address), true, address);
    }
  });

  it('allows public IPv4 addresses, including the edges of private ranges', () => {
    for (const address of ['8.8.8.8', '1.1.1.1', '172.15.255.255', '172.32.0.1', '192.167.1.1', '100.63.255.255', '151.101.1.69']) {
      assert.equal(isPrivateAddress(address), false, address);
    }
  });

  it('blocks private IPv6 addresses and IPv4 addresses hidden inside IPv6', () => {
    for (const address of [
      '::1',
      '::',
      'fc00::1',
      'fd12:3456:789a::1',
      'fe80::1',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:192.168.0.1',
      '64:ff9b::a00:1', // NAT64 of 10.0.0.1
      '2002:c0a8:0101::1', // 6to4 of 192.168.1.1
      '2001:db8::1',
    ]) {
      assert.equal(isPrivateAddress(address), true, address);
    }
  });

  it('allows public IPv6 addresses and rejects anything that is not an IP', () => {
    assert.equal(isPrivateAddress('2606:4700:4700::1111'), false);
    assert.equal(isPrivateAddress('2a00:1450:4001:81b::200e'), false);
    assert.equal(isPrivateAddress('::ffff:8.8.8.8'), false);
    assert.equal(isPrivateAddress('example.com'), true);
    assert.equal(isPrivateAddress(''), true);
  });
});

describe('safe fetch: URL shape', () => {
  const rejected = (url: string) => assert.throws(() => checkUrlShape(url), UnsafeUrlError, url);

  it('accepts ordinary public feed URLs', () => {
    assert.equal(checkUrlShape('https://feeds.bbci.co.uk/news/rss.xml').hostname, 'feeds.bbci.co.uk');
    assert.equal(checkUrlShape('http://example.com:80/feed').hostname, 'example.com');
  });

  it('rejects other protocols, credentials and unusual ports', () => {
    rejected('file:///etc/passwd');
    rejected('ftp://example.com/feed');
    rejected('gopher://example.com/');
    rejected('javascript:alert(1)');
    rejected('https://user:secret@example.com/feed');
    rejected('http://example.com:5432/');
    rejected('http://example.com:8080/feed');
    rejected('not a url');
  });

  it('rejects local names and every way of writing a local IP address', () => {
    rejected('http://localhost/admin');
    rejected('http://LOCALHOST./');
    rejected('http://printer/');
    rejected('http://db.internal/');
    rejected('http://router.local/');
    rejected('http://127.0.0.1/');
    rejected('http://2130706433/'); // 127.0.0.1 as one number
    rejected('http://0x7f.0.0.1/'); // hexadecimal
    rejected('http://017700000001/'); // octal
    rejected('http://[::1]/');
    rejected('http://[::ffff:169.254.169.254]/latest/meta-data');
    rejected('http://169.254.169.254/latest/meta-data');
  });
});

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    assert.equal(safeNextPath('/saved?folder=abc&q=x%20y'), '/saved?folder=abc&q=x%20y');
    assert.equal(safeNextPath('/article/some-story-1a2b3c4d#comments'), '/article/some-story-1a2b3c4d#comments');
  });

  it('falls back for anything that could leave the site', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      '/ok\\..\\evil',
      'javascript:alert(1)',
      'feed',
      '',
      `/${'a'.repeat(600)}`,
    ]) {
      assert.equal(safeNextPath(value), '/feed', JSON.stringify(value));
    }
    assert.equal(safeNextPath(null), '/feed');
    assert.equal(safeNextPath('//evil.example', '/'), '/');
  });
});

describe('usernames', () => {
  it('reserves staff-like names regardless of case and punctuation', () => {
    for (const name of ['admin', 'Admin', 'ADMIN_', 'the.editor', 'Moderator', 'The-Daily-Aggregator', 'support']) {
      assert.equal(isReservedUsername(name), true, name);
    }
    for (const name of ['administrator2', 'jane_doe', 'editorial_fan', 'adm', 'reader']) {
      assert.equal(isReservedUsername(name), false, name);
    }
  });

  it('maps database errors to friendly text', () => {
    assert.equal(profileSaveError({ code: '23505', message: 'duplicate key' }, 'x'), 'That username is already taken.');
    assert.match(profileSaveError({ code: 'P0001', message: 'USERNAME_RESERVED' }, 'x'), /reserved/);
    assert.equal(profileSaveError({ message: 'something else' }, 'fallback'), 'fallback');
    assert.equal(validateUsername('ok_name'), null);
  });
});

describe('content security policy', () => {
  it('uses a fresh nonce and never allows inline or eval scripts in production', () => {
    const a = createNonce();
    const b = createNonce();
    assert.notEqual(a, b);
    assert.ok(a.length >= 20);

    const policy = buildContentSecurityPolicy({ nonce: a, supabaseUrl: 'https://abc.supabase.co', isDevelopment: false, isHttps: true });
    const script = policy.split('; ').find((d) => d.startsWith('script-src')) ?? '';
    assert.ok(script.includes(`'nonce-${a}'`));
    assert.ok(!script.includes('unsafe-inline'));
    assert.ok(!script.includes('unsafe-eval'));
    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.ok(policy.includes("object-src 'none'"));
    assert.ok(policy.includes("base-uri 'self'"));
    assert.ok(policy.includes('connect-src \'self\' https://abc.supabase.co wss://abc.supabase.co'));
    assert.ok(policy.includes('upgrade-insecure-requests'));
  });

  it('relaxes only what development needs', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'n', supabaseUrl: 'http://127.0.0.1:58321', isDevelopment: true, isHttps: false });
    assert.ok(policy.includes("'unsafe-eval'"));
    assert.ok(policy.includes('ws://127.0.0.1:58321'));
    assert.ok(!policy.includes('upgrade-insecure-requests'));
  });
});

describe('normalizeMutedKeyword', () => {
  it('stores words in lower case with single spaces', () => {
    assert.deepEqual(normalizeMutedKeyword('  Royal   Family '), { keyword: 'royal family' });
    assert.deepEqual(normalizeMutedKeyword('U.S'), { keyword: 'u.s' });
    assert.deepEqual(normalizeMutedKeyword("O'Brien"), { keyword: "o'brien" });
    assert.deepEqual(normalizeMutedKeyword('Ζεύς'), { keyword: 'ζεύς' });
  });

  it('refuses what the database would refuse', () => {
    for (const bad of ['a', '', 'x'.repeat(41), 'crypto!', '-war', 'war-', '(a|b)*', 'u.s.']) {
      assert.ok('error' in normalizeMutedKeyword(bad), bad);
    }
  });
});
