'use strict';

const assert = require('assert').strict;
const textDiff = require('../../../../textDiff');

describe('textDiff', function () {
  it('returns empty string when text has not changed', async function () {
    assert.equal(textDiff('line one\nline two\n', 'line one\nline two\n'), '');
  });

  it('returns added lines with plus prefix', async function () {
    assert.equal(textDiff('line one\n', 'line one\nline two\n'), '+line two');
  });

  it('returns removed lines with minus prefix', async function () {
    assert.equal(textDiff('line one\nline two\n', 'line one\n'), '-line two');
  });

  it('returns both removed and added lines for replacement', async function () {
    assert.equal(
        textDiff('line one\nline two\n', 'line one\nline three\n'),
        '-line two\n+line three',
    );
  });

  it('falls back to simple add/remove output for large texts', async function () {
    const before = Array.from({length: 1001}, (_, i) => `before-${i}`).join('\n');
    const after = Array.from({length: 1001}, (_, i) => `after-${i}`).join('\n');
    const diff = textDiff(before, after);
    assert(diff.includes('-before-0'));
    assert(diff.includes('+after-1000'));
  });
});
