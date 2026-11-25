// SSE 纯解析器测试（node --test，零依赖模块，无 jsdom）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSseEvents } from './sse.js';

test('解析命名事件与默认 message 事件（块级，正文不继承上一块事件名）', () => {
  const buf = ':ready\n\n' +
    'event:think\ndata:思考A\n\n' +
    'event:think\ndata:思考B\n\n' +
    'data:正文1\n\n' +
    'data:正文2\n\n' +
    'event:done\ndata:[DONE]\n\n';
  const evts = parseSseEvents(buf);
  assert.deepEqual(evts.map((e) => e.name), ['think', 'think', 'message', 'message', 'done']);
  assert.deepEqual(evts.filter((e) => e.name === 'message').map((e) => e.data), ['正文1', '正文2']);
});

test('同名多 data 行按块拼接', () => {
  const evts = parseSseEvents('event:job\ndata:{"a":\ndata:1}\n\n');
  assert.equal(evts.length, 1);
  assert.equal(evts[0].name, 'job');
  assert.equal(evts[0].data, '{"a":1}');
});
