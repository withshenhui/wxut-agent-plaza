// 企微仿真门禁模拟纯逻辑测试（node --test，无 react/axios 依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFeatures } from './featureConfig.js';
import { simulateGate, visibleNavKeys, chipsOf } from './simulator.js';

const resolved = resolveFeatures(null);
const user = { id: 1, collegeId: 3 };

test('建设中 → 拦住（不进入）', () => {
  assert.deepEqual(
    simulateGate({ isBuilding: 1 }, { user, perms: ['plaza.view'], scope: 'all', resolved }),
    { ok: false, reason: '建设中' });
});

test('未登录 → 需登录', () => {
  const r = simulateGate({ isBuilding: 0 }, { user: null, perms: [], scope: 'college', resolved });
  assert.equal(r.ok, false);
  assert.equal(r.reason, '需登录');
});

test('本院智能体 + college 范围 → 放行', () => {
  const r = simulateGate({ isBuilding: 0, collegeId: 3 }, { user, perms: ['plaza.view'], scope: 'college', resolved });
  assert.equal(r.ok, true);
});

test('非本院智能体 + college 范围 → 非本院', () => {
  const r = simulateGate({ isBuilding: 0, collegeId: 9 }, { user, perms: ['plaza.view'], scope: 'college', resolved });
  assert.equal(r.ok, false);
  assert.equal(r.reason, '非本院');
});

test('院属智能体 + all 范围 → 放行', () => {
  const r = simulateGate({ isBuilding: 0, collegeId: 9 }, { user, perms: ['plaza.view'], scope: 'all', resolved });
  assert.equal(r.ok, true);
});

test('通用智能体（无学院归属）→ 放行', () => {
  const r = simulateGate({ isBuilding: 0, collegeId: null }, { user, perms: [], scope: 'college', resolved });
  assert.equal(r.ok, true);
});

test('visibleNavKeys：仅 plaza.view 的登录用户 → 首页/模型服务/知识库', () => {
  assert.deepEqual(visibleNavKeys(resolved, { user, perms: ['plaza.view'] }), ['plaza', 'models', 'kb']);
});

test('visibleNavKeys：未登录（游客）不过滤 perm 项', () => {
  const keys = visibleNavKeys(resolved, { user: null, perms: [] });
  assert.ok(keys.includes('teacher'));
  assert.ok(keys.includes('plaza'));
});

test('chipsOf：全部 + 去重分类名', () => {
  assert.deepEqual(
    chipsOf([{ categoryName: '制度建设' }, { categoryName: '制度建设' }, { categoryName: '学生服务' }]),
    ['全部', '制度建设', '学生服务']);
});
