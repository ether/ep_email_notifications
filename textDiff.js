'use strict';

const splitLines = (text) => {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n');
  if (normalized === '') return [];
  return normalized.endsWith('\n')
    ? normalized.slice(0, -1).split('\n')
    : normalized.split('\n');
};

module.exports = (beforeText, afterText) => {
  const before = splitLines(beforeText);
  const after = splitLines(afterText);
  if (before.length === after.length &&
      before.every((line, index) => line === after[index])) return '';

  const lcs = Array.from({length: before.length + 1}, () => Array(after.length + 1).fill(0));
  for (let i = 1; i <= before.length; i++) {
    for (let j = 1; j <= after.length; j++) {
      lcs[i][j] = before[i - 1] === after[j - 1]
        ? lcs[i - 1][j - 1] + 1
        : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  const changes = [];
  let i = before.length;
  let j = after.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      i--;
      j--;
      continue;
    }
    if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      changes.push(`+${after[j - 1]}`);
      j--;
      continue;
    }
    changes.push(`-${before[i - 1]}`);
    i--;
  }

  return changes.reverse().join('\n');
};
