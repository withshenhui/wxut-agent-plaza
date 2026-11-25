// 操作日志内容摘要纯逻辑测试（node --test）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLog } from './logContent.js';

test('配置项更新 → 动作 · 键名', () => {
  const r = summarizeLog('更新系统配置', '["site_name","AI中台"]');
  assert.equal(r.text, '更新系统配置 · site_name');
  assert.ok(r.title.includes('AI中台'));
});

test('智能体更新 → 动作 · 名称（从对象 name 提取）', () => {
  const r = summarizeLog('更新智能体', '[3,{"name":"智慧就业智能体","icon":"🎯"}]');
  assert.equal(r.text, '更新智能体 · 智慧就业智能体');
});

test('创建智能体 → 动作 · 名称', () => {
  const r = summarizeLog('创建智能体', '[{"name":"智慧就业助手","description":"xxx"}]');
  assert.equal(r.text, '创建智能体 · 智慧就业助手');
});

test('无参数 → 仅动作', () => {
  assert.equal(summarizeLog('登录', '').text, '登录');
  assert.equal(summarizeLog('登录', null).text, '登录');
  assert.equal(summarizeLog('登录').text, '登录');
});

test('删除类（仅 id）→ 动作 · id', () => {
  assert.equal(summarizeLog('删除模型', '[5]').text, '删除模型 · 5');
});

test('非 JSON 长文本 → 截断加省略号，title 保留全文', () => {
  const long = '导出很长的模板名称'.repeat(12);
  const r = summarizeLog('导出 · 智能填报', long);
  assert.ok(r.text.endsWith('…'));
  assert.ok(Array.from(r.text).length <= 61);
  assert.equal(r.title, '导出 · 智能填报 ' + long);
});

test('JSON 内长名称 → 短语截断', () => {
  const name = 'X'.repeat(80);
  const r = summarizeLog('创建智能体', `[{"name":"${name}"}]`);
  assert.ok(r.text.endsWith('…'));
  assert.ok(r.text.startsWith('创建智能体 · '));
  assert.equal(r.title, `创建智能体 [{"name":"${name}"}]`);
});

test('配置大 JSON（键 + 大对象串）→ 取键名', () => {
  const big = JSON.stringify([{ id: 'p_mobile_ds', name: '移动DeepSeek' }]);
  const r = summarizeLog('更新系统配置', JSON.stringify(['llm.providers', big]));
  assert.equal(r.text, '更新系统配置 · llm.providers');
});

test('无可解析信息 → 空串兜底', () => {
  assert.equal(summarizeLog('', '').text, '');
  assert.equal(summarizeLog(null, null).text, '');
});
