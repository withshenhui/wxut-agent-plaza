// 企微 H5 环境识别与导航收敛（零依赖纯模块，可被 node --test 直接加载）
export const WECOM_UA_TOKEN = 'wxwork';
export const WECOM_QUERY_FLAG = 'wecom';

/** 企微环境判定：UA 含 wxwork || URL ?wecom=1 || sessionStorage 记忆 */
export function isWecomEnv({ ua = '', search = '', stored = '' } = {}) {
  if ((ua || '').toLowerCase().includes(WECOM_UA_TOKEN)) return true;
  try {
    if (new URLSearchParams(search || '').get(WECOM_QUERY_FLAG) === '1') return true;
  } catch { /* 非法 search 忽略 */ }
  return String(stored || '') === '1';
}

/** 企微模式导航收敛：一期仅保留「智能体广场」 */
export function wecomNavFilter(navItems = []) {
  return (navItems || []).filter((n) => n && n.key === 'plaza');
}
