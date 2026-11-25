// 打字机步长纯逻辑测试（node --test，零依赖，不渲染 React）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typewriterStep } from './useTypewriter.js';

test('每 tick 前进 2–4 个字符', () => {
  for (let lag = 1; lag <= 400; lag++) {
    const n = typewriterStep(lag);
    assert.ok(n >= 2 && n <= 4, `lag=${lag} → ${n} 不在 [2,4]`);
    assert.ok(Number.isInteger(n));
  }
});

test('落后越多滴越快，封顶 4（不会一次吐一大段）', () => {
  assert.equal(typewriterStep(1), 2);      // 只差 1 字也走 2 字（slice 自动截断到末尾）
  assert.equal(typewriterStep(6), 3);
  assert.equal(typewriterStep(12), 3);
  assert.equal(typewriterStep(18), 4);
  assert.equal(typewriterStep(9999), 4);   // 长文落后也只 4，保证"滴"的观感
});

test('已追上（lag<=0/非法）不前进', () => {
  assert.equal(typewriterStep(0), 0);
  assert.equal(typewriterStep(-5), 0);
  assert.equal(typewriterStep(NaN), 0);
});
