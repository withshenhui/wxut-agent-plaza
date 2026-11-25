// 企微仿真门禁模拟（零 import 副作用纯模块：仅依赖 featureConfig.js，可被 `node --test` 直接加载）
import { renderNavs } from './featureConfig.js';

/**
 * 模拟「点击某个智能体」在企微模式下会不会进入对话。
 * 等价复刻 V2App 的 gateCheck(featureByKey(resolved,'chat')) + launch() 的数据范围预检：
 *  - 建设中（isBuilding=1）→ 拦（不进入）；
 *  - 未登录 → 拦（chat.gate='login'）；
 *  - gate=perm 且缺 permKey → 拦（无权限）；
 *  - 院属智能体（collegeId!=null）+ 范围非 all + 非本院 → 拦；
 *  - 范围 none → 拦（无权限）。
 * @returns {{ok:boolean, reason:string}} reason ∈ {'', '建设中','需登录','无权限','非本院','该功能暂未开放','智能体不存在'}
 */
export function simulateGate(agent, { user, perms = [], scope = 'college', resolved } = {}) {
  if (!agent) return { ok: false, reason: '智能体不存在' };
  if (agent.isBuilding === 1) return { ok: false, reason: '建设中' };
  if (!user) return { ok: false, reason: '需登录' };

  const chat = resolved && resolved.byKey ? resolved.byKey.chat : null;
  if (chat && chat.enabled === false) return { ok: false, reason: '该功能暂未开放' };
  const gate = chat ? (chat.gate || 'guest') : 'login';
  const permKey = chat ? (chat.permKey || null) : null;
  if (gate === 'perm' && permKey && !perms.includes(permKey)) {
    return { ok: false, reason: '无权限' };
  }

  if (agent.collegeId != null) {
    if (scope === 'none') return { ok: false, reason: '无权限' };
    if (scope !== 'all' && agent.collegeId !== user.collegeId) {
      return { ok: false, reason: '非本院' };
    }
  }
  return { ok: true, reason: '' };
}

/** 该用户在企微模式下可见的导航 key 列表（用 renderNavs 计算，与前台同源） */
export function visibleNavKeys(resolved, { user, perms = [] } = {}) {
  if (!resolved) return [];
  return renderNavs(resolved, { user, perms }).map((n) => n.key);
}

/** 从返回的智能体派生分类 chips（『全部』+ 去重分类名，保持出现顺序） */
export function chipsOf(agents = []) {
  const out = ['全部'];
  for (const a of agents) {
    const name = a && a.categoryName;
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}
