'use strict';

const splitLines = (text) => {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n');
  if (normalized === '') return [];
  return normalized.endsWith('\n')
    ? normalized.slice(0, -1).split('\n')
    : normalized.split('\n');
};

const MAX_DIFF_LINES = 1000;

module.exports = (beforeText, afterText) => {
  const before = splitLines(beforeText);
  const after = splitLines(afterText);
  if (before.length === after.length &&
      before.every((line, index) => line === after[index])) return '';
  if (before.length > MAX_DIFF_LINES || after.length > MAX_DIFF_LINES) {
    return before.map((line) => `-${line}`).concat(after.map((line) => `+${line}`)).join('\n');
  }

  const lcs = Array.from({length: before.length + 1}, () => Array(after.length + 1).fill(0));
  for (let beforeIdx = 1; beforeIdx <= before.length; beforeIdx++) {
    for (let afterIdx = 1; afterIdx <= after.length; afterIdx++) {
      lcs[beforeIdx][afterIdx] = before[beforeIdx - 1] === after[afterIdx - 1]
        ? lcs[beforeIdx - 1][afterIdx - 1] + 1
        : Math.max(lcs[beforeIdx - 1][afterIdx], lcs[beforeIdx][afterIdx - 1]);
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
