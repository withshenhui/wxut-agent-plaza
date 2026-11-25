import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWecomEnv, wecomNavFilter } from './wecomConfig.js';

test('UA 含 wxwork 判为企微环境', () => {
  assert.equal(isWecomEnv({ ua: 'Mozilla/5.0 wxwork/4.0', search: '' }), true);
});

test('URL 带 wecom=1 判为企微环境', () => {
  assert.equal(isWecomEnv({ ua: 'Mozilla/5.0 iPhone', search: '?wecom=1' }), true);
});

test('sessionStorage 记忆 wecom=1 持续生效', () => {
  assert.equal(isWecomEnv({ ua: 'Mozilla/5.0 iPhone', search: '', stored: '1' }), true);
});

test('普通桌面浏览器不是企微环境', () => {
  assert.equal(isWecomEnv({ ua: 'Mozilla/5.0 Chrome/120', search: '' }), false);
});

test('导航收敛只留 plaza', () => {
  const nav = [{ key: 'plaza' }, { key: 'teacher' }, { key: 'insight' },
    { key: 'dev' }, { key: 'models' }, { key: 'kb' }];
  assert.deepEqual(wecomNavFilter(nav).map((n) => n.key), ['plaza']);
});
