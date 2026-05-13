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
});
