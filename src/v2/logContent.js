// 操作日志「内容」列摘要：把 operation + params 提炼成一句话短语，全文留给 title 悬浮。
// 纯逻辑、无 React/浏览器依赖，便于 node --test 覆盖。

const MAX = 60; // 短语最长字符数，超出截断加「…」

// 从 JSON 数组参数里挑一个最有信息量的「对象名」
function pickArrayLabel(arr) {
  // 1) 对象里的 name/title/label/username/key（如 {name:"智慧就业智能体"}）
  for (const a of arr) {
    if (a && typeof a === 'object' && !Array.isArray(a)) {
      const c = a.name || a.title || a.label || a.username || a.key;
      if (c != null && String(c).trim()) return String(c).trim();
    }
  }
  // 2) 首个非空字符串（如配置键 "site_name"、"llm.providers"）
  for (const a of arr) {
    if (typeof a === 'string' && a.trim()) return a.trim();
  }
  // 3) 首个基本类型
  for (const a of arr) {
    if (a != null && (typeof a === 'string' || typeof a === 'number')) return String(a);
  }
  return '';
}

// 按字符（代理对安全）截断
function truncate(s, n) {
  if (!s) return '';
  const chars = Array.from(s);
  if (chars.length <= n) return s;
  return chars.slice(0, n).join('') + '…';
}

/**
 * @param {string} operation 后端 operation 字段（已是短语，如「创建智能体」）
 * @param {string} params    后端 params 字段（方法参数 JSON 数组 或 纯文本）
 * @returns {{text:string, title:string}} text=内容列显示（截断），title=悬浮全文
 */
export function summarizeLog(operation, params) {
  const op = (operation == null ? '' : String(operation)).trim();
  const raw = (params == null ? '' : String(params)).trim();

  let label = '';
  if (raw && (raw[0] === '[' || raw[0] === '{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        label = pickArrayLabel(parsed);
      } else if (parsed && typeof parsed === 'object') {
        label = String(parsed.name || parsed.action || parsed.target || parsed.title || parsed.key || '').trim();
      }
      if (!label) label = raw; // 是 JSON 但没提炼出对象 → 退化为原文截断
    } catch (e) {
      label = raw; // 伪 JSON → 当普通文本
    }
  } else {
    label = raw; // 纯文本
  }

  const phrase = op && label ? `${op} · ${label}` : (op || label);
  const title = [op, raw].filter(Boolean).join(' ').trim() || phrase;
  return { text: truncate(phrase, MAX), title };
}
