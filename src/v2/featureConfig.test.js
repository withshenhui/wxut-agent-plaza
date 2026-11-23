// 前台功能注册表纯逻辑测试（node --test，无打包器依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_DEFAULTS, resolveFeatures, renderNavs, featureByKey, needOf } from './featureConfig.js';

const cfg = JSON.parse(JSON.stringify(FEATURE_DEFAULTS));

test('默认：无配置解析出内置 nav（R1：6 项，无 xixibuddy）', () => {
  const r = resolveFeatures(null);
  const nav = renderNavs(r, { user: null, perms: [] });
  const keys = nav.map((n) => n.key);
  assert.deepEqual(keys, ['plaza', 'insight', 'teacher', 'dev', 'models', 'kb']);
  assert.ok(!keys.includes('xixibuddy'));
  // xixibuddy 仍在注册表中，但 navHidden（R1）
  const x = featureByKey(r, 'xixibuddy');
  assert.ok(x && x.navHidden === true);
});

test('游客全显 perm 项（点进去才拦）', () => {
  const r = resolveFeatures(cfg);
  const nav = renderNavs(r, { user: null, perms: [] });
  assert.ok(nav.map((n) => n.key).includes('teacher'));
});

test('登录用户无权限 → 隐藏 perm 项', () => {
  const r = resolveFeatures(cfg);
  const nav = renderNavs(r, { user: { id: 1 }, perms: ['plaza.view'] });
  assert.ok(!nav.map((n) => n.key).includes('teacher'));
});

test('整体停用 → 不出现在导航', () => {
  const c = JSON.parse(JSON.stringify(cfg));
  c.features.find((f) => f.key === 'models').enabled = false;
  const r = resolveFeatures(c);
  assert.ok(!renderNavs(r, { user: null, perms: [] }).map((n) => n.key).includes('models'));
});

test('needOf：dev=perm/dev.entry，kb=login，models=guest', () => {
  const r = resolveFeatures(cfg);
  assert.deepEqual(needOf(featureByKey(r, 'dev')), { gate: 'perm', permKey: 'dev.entry' });
  assert.deepEqual(needOf(featureByKey(r, 'kb')), { gate: 'login', permKey: 'kb.use' });
  assert.deepEqual(needOf(featureByKey(r, 'models')), { gate: 'guest', permKey: null });
});

test('配置坏 → 回退内置默认', () => {
  const r = resolveFeatures({ version: 1, nav: [], features: [] });
  assert.ok(renderNavs(r, { user: null, perms: [] }).some((n) => n.key === 'insight'));
});
