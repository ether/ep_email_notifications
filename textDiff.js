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
  let beforeIndex = before.length;
  let afterIndex = after.length;
  while (beforeIndex > 0 || afterIndex > 0) {
    if (beforeIndex > 0 && afterIndex > 0 &&
        before[beforeIndex - 1] === after[afterIndex - 1]) {
      beforeIndex--;
      afterIndex--;
      continue;
    }
    if (afterIndex > 0 &&
        (beforeIndex === 0 ||
         lcs[beforeIndex][afterIndex - 1] >= lcs[beforeIndex - 1][afterIndex])) {
      changes.push(`+${after[afterIndex - 1]}`);
      afterIndex--;
      continue;
    }
    changes.push(`-${before[beforeIndex - 1]}`);
    beforeIndex--;
  }

  return changes.reverse().join('\n');
};
