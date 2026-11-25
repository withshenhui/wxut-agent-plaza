// SSE 累加缓冲 → 事件数组（零依赖纯模块）。块级解析：每块事件名独立，
// 无 event: 行的块回落 message（正文块不得继承上一块事件名——历史 bug 复现点）。
export function parseSseEvents(buf) {
  const out = [];
  for (const block of String(buf || '').split('\n\n')) {
    let name = 'message';
    const dataLines = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5));
    }
    if (dataLines.length && !block.trimStart().startsWith(':')) {
      out.push({ name, data: dataLines.join('') });
    }
  }
  return out;
}
