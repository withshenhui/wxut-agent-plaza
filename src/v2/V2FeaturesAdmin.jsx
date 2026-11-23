import React, { useState, useEffect } from 'react';
import { Modal, Switch, useToast, confirmDialog, Icon } from './ui.jsx';
import { FEATURE_DEFAULTS } from './featureConfig.js';
import * as configApi from '../api/config';

/* 分组顺序（与注册表约定一致） */
const GROUPS = ['核心', '数据洞察', '教师', '工具', '内容', '开发者', '权限项'];
/* 进入门槛：guest 游客可见 / login 需登录 / perm 需权限 */
const GATES = [['guest', '游客可见'], ['login', '需登录'], ['perm', '需权限']];
/* 角色默认矩阵的列：普通用户 / 学院管理员 / 校领导 / 平台管理员（与后台用户管理角色口径一致） */
const ROLES = [['user', '普通用户'], ['college_admin', '学院管理员'], ['leader', '校领导'], ['admin', '平台管理员']];
const ROLE_LABEL = Object.fromEntries(ROLES);
/* 功能类型展示 */
const KIND_LABELS = { page: '页面', channel: '频道', route: '路由', external: '外链', perm: '权限项' };

const clone = (o) => JSON.parse(JSON.stringify(o));
const navIndexOf = (nav, key) => (nav || []).findIndex((n) => n.key === key);

function FeaturesSkeleton() {
  return (
    <>
      <div className="v2-page-head"><div>
        <div className="v2-ph-title">前台功能管理</div>
        <div className="v2-ph-sub">加载中…</div>
      </div></div>
      <div className="v2-adm-sk">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="sk-row" key={i}>
            <div className="sk-cir" />
            <div className="sk-ln" style={{ width: `${28 + (i % 3) * 9}%` }} />
            <div className="sk-chip" style={{ width: 70, marginLeft: 'auto' }} />
            <div className="sk-chip" style={{ width: 52 }} />
            <div className="sk-chip" style={{ width: 52 }} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ================= 后台页：前台功能管理 ================= */
export default function FeaturesAdmin({ toast: toastProp }) {
  const ctxToast = useToast();
  const toast = toastProp || ctxToast;
  const [cfg, setCfg] = useState(null);
  const [tab, setTab] = useState('feat');
  const [saving, setSaving] = useState(false);
  const [linkEdit, setLinkEdit] = useState(null); // 自定义外链新增/编辑弹窗

  const load = () => configApi.getConfig('v2.features')
    .then((d) => {
      let v = null;
      try { v = JSON.parse(d?.configValue || 'null'); } catch { /* 解析失败走默认 */ }
      // 兜底：注册表为空/非法 → 深拷贝 FEATURE_DEFAULTS
      setCfg(v && Array.isArray(v.features) && v.features.length ? v : clone(FEATURE_DEFAULTS));
    })
    .catch(() => setCfg(clone(FEATURE_DEFAULTS)));
  useEffect(() => { load(); }, []);

  if (!cfg) return <FeaturesSkeleton />;

  /* 写入 feature / 子功能（childKey 为空即顶层功能） */
  const patchFeat = (key, kv, childKey) => setCfg((c) => ({
    ...c,
    features: c.features.map((f) => {
      if (childKey) {
        return f.key === key
          ? { ...f, children: (f.children || []).map((ch) => (ch.key === childKey ? { ...ch, ...kv } : ch)) }
          : f;
      }
      return f.key === key ? { ...f, ...kv } : f;
    })
  }));
  /* 写入 nav 项（顶栏顺序 / 显隐 / NEW / 名称） */
  const patchNav = (key, kv) => setCfg((c) => ({ ...c, nav: (c.nav || []).map((n) => (n.key === key ? { ...n, ...kv } : n)) }));

  const save = async () => {
    setSaving(true);
    try {
      await configApi.updateConfig('v2.features', JSON.stringify(cfg));
      toast('已保存，前台刷新后生效');
      load();
    } catch (e) { toast('保存失败：' + e.message); }
    setSaving(false);
  };

  /* 恢复默认：丢弃当前（未保存）编辑，回到 FEATURE_DEFAULTS；需再点保存才落库 */
  const reset = async () => {
    const ok = await confirmDialog({
      title: '恢复默认配置',
      text: '确认恢复为注册表默认？当前未保存的修改将全部丢失（恢复后需点击「保存配置」才会写入平台）。',
      okText: '恢复默认', danger: true,
    });
    if (!ok) return;
    setCfg(clone(FEATURE_DEFAULTS));
    toast('已恢复默认，点击「保存配置」写入');
  };

  /* 添加自定义外链 → 追加到 nav（external + href），前台顶栏可点开 */
  const addCustomLink = () => setLinkEdit({ key: null, label: '新链接', href: 'https://', isNew: false, hidden: false });
  const saveCustomLink = (link) => {
    setCfg((c) => {
      const nav = (c.nav || []).slice();
      const i = navIndexOf(nav, link.key);
      const item = { key: link.key || 'c' + Date.now().toString(36), label: link.label || '新链接', href: link.href || '', external: true, isNew: !!link.isNew, hidden: !!link.hidden };
      if (i >= 0) nav[i] = { ...nav[i], ...item }; else nav.push(item);
      return { ...c, nav };
    });
    setLinkEdit(null);
    toast('已添加自定义外链，保存配置后生效');
  };

  return (
    <>
      <div className="v2-page-head">
        <div>
          <div className="v2-ph-title">前台功能管理</div>
          <div className="v2-ph-sub">前台功能的启用 / 顶栏显隐 / 进入门槛 / 角色默认（sys_config: v2.features）</div>
        </div>
      </div>
      <div className="v2-tabs" style={{ marginBottom: 16 }}>
        <div className={'v2-tab' + (tab === 'feat' ? ' on' : '')} onClick={() => setTab('feat')}>功能与门槛</div>
        <div className={'v2-tab' + (tab === 'role' ? ' on' : '')} onClick={() => setTab('role')}>角色默认</div>
      </div>

      {tab === 'feat'
        ? <FeatTable cfg={cfg} patchFeat={patchFeat} patchNav={patchNav} setCfg={setCfg} toast={toast} onEditLink={setLinkEdit} />
        : <RoleMatrix cfg={cfg} setCfg={setCfg} toast={toast} />}

      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="v2-btn" disabled={saving} onClick={save}>{saving ? '保存中…' : '保存配置'}</button>
        <button className="v2-btn ghost" onClick={reset}>恢复默认</button>
        <button className="v2-btn ghost" onClick={addCustomLink}>＋ 添加自定义外链</button>
      </div>

      {linkEdit && <CustomLinkModal link={linkEdit} onClose={() => setLinkEdit(null)} onSave={saveCustomLink} />}
    </>
  );
}

/* ================= Tab1：功能与门槛 ================= */
function FeatTable({ cfg, patchFeat, patchNav, setCfg, toast, onEditLink }) {
  const [expanded, setExpanded] = useState({});
  const nav = cfg.nav || [];
  const inNav = (key) => navIndexOf(nav, key) >= 0;
  const featByKey = {};
  cfg.features.forEach((f) => { featByKey[f.key] = f; });
  const visibleNav = nav.filter((n) => !n.hidden);
  const customLinks = nav.filter((n) => !featByKey[n.key]);

  /* 名称编辑：feature.label + （存在顶栏项时）nav.label 同步，保证前台顶栏即时反映 */
  const setLabel = (f, val) => {
    patchFeat(f.key, { label: val });
    if (inNav(f.key)) patchNav(f.key, { label: val });
  };
  /* 启用：频道整体停用或关键项（plaza / admin.*）停用 → 二次确认 */
  const setEnabled = async (key, childKey, v, label, kind) => {
    const critical = !childKey && (key === 'plaza' || key.startsWith('admin.'));
    const isChannel = kind === 'channel';
    if (!v && (isChannel || critical)) {
      const ok = await confirmDialog({
        title: isChannel ? '停用整个频道' : '停用关键功能',
        text: isChannel
          ? `确认停用频道「${label}」？该频道及其全部子功能将从前台隐藏，已登录用户也无法进入。`
          : `确认停用「${label}」？停用后该功能入口从前台隐藏，已登录用户也无法进入。`,
        okText: '停用', danger: true,
      });
      if (!ok) return;
    }
    patchFeat(key, { enabled: v }, childKey);
  };
  /* 顶栏显示（navHidden 取反）；存在顶栏项时同步 nav.hidden，令其真正从前台顶栏移除 */
  const setNavShown = (f, v) => {
    patchFeat(f.key, { navHidden: !v });
    if (inNav(f.key)) patchNav(f.key, { hidden: !v });
  };
  /* NEW 角标：优先写 nav 项；非顶栏功能写入 feature 冗余存储 */
  const setNew = (f, v) => { if (inNav(f.key)) patchNav(f.key, { isNew: v }); else patchFeat(f.key, { isNew: v }); };
  /* 排序 ↑↓：调整 nav 顺序（前台顶栏顺序） */
  const moveNav = (key, dir) => setCfg((c) => {
    const arr = (c.nav || []).slice();
    const i = navIndexOf(arr, key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return c;
    const [it] = arr.splice(i, 1);
    arr.splice(j, 0, it);
    return { ...c, nav: arr };
  });
  const removeCustom = async (key, label) => {
    const ok = await confirmDialog({ title: '删除自定义外链', text: `确认删除自定义外链「${label}」？`, okText: '删除', danger: true });
    if (!ok) return;
    setCfg((c) => ({ ...c, nav: (c.nav || []).filter((n) => n.key !== key) }));
    toast('已删除，保存配置后生效');
  };

  const th = { fontSize: 11.5, color: 'var(--p-t3)', fontWeight: 600, textAlign: 'left', padding: '7px 10px', borderBottom: '1.5px solid var(--p-line)' };
  const tdx = { padding: '7px 10px', borderBottom: '1px solid var(--p-line2)', verticalAlign: 'middle' };
  const groupRow = { padding: '9px 10px 5px', fontSize: 12, fontWeight: 700, color: 'var(--p-t2)', background: '#F8FAFD' };

  const routeText = (f) => f.route || f.href || (f.kind === 'perm' ? '（仅权限项）' : '—');

  return (
    <div className="v2-card" style={{ maxWidth: 1040 }}>
      <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--p-t3)' }}>
        顶栏预览：<span style={{ color: 'var(--p-t2)' }}>{visibleNav.length ? visibleNav.map((n) => n.label).join('　·　') : '（当前没有可见的顶栏项）'}</span>
      </div>
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 58 }}>排序</th>
              <th style={{ ...th }}>名称</th>
              <th style={{ ...th, width: 200 }}>路由 / 类型</th>
              <th style={{ ...th, width: 110 }}>门槛</th>
              <th style={{ ...th, width: 170 }}>权限点</th>
              <th style={{ ...th, width: 58 }}>启用</th>
              <th style={{ ...th, width: 74 }}>顶栏显示</th>
              <th style={{ ...th, width: 58 }}>NEW</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => {
              const rows = cfg.features.filter((f) => f.group === g);
              if (!rows.length) return null;
              return (
                <React.Fragment key={g}>
                  <tr><td colSpan={8} style={groupRow}>{g}</td></tr>
                  {rows.map((f) => {
                    const isChannel = f.kind === 'channel' && (f.children || []).length > 0;
                    const idx = navIndexOf(nav, f.key);
                    const onNav = idx >= 0;
                    const open = !!expanded[f.key];
                    return (
                      <React.Fragment key={f.key}>
                        <tr>
                          <td style={tdx}>
                            <button className="v2-mini-btn" disabled={!onNav || idx === 0} title={onNav ? '上移' : '该功能不在顶栏'} onClick={() => moveNav(f.key, -1)}>↑</button>
                            <button className="v2-mini-btn" disabled={!onNav || idx === nav.length - 1} title={onNav ? '下移' : '该功能不在顶栏'} style={{ marginLeft: 4 }} onClick={() => moveNav(f.key, 1)}>↓</button>
                          </td>
                          <td style={tdx}>
                            {isChannel && (
                              <button className="v2-mini-btn" style={{ marginRight: 6 }} title={open ? '收起子功能' : '展开子功能'} onClick={() => setExpanded((p) => ({ ...p, [f.key]: !p[f.key] }))}>
                                <Icon name="chevR" size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                              </button>
                            )}
                            <input className="v2-fm-i" value={f.label || ''} style={{ width: 168 }} onChange={(e) => setLabel(f, e.target.value)} />
                            <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--p-t4)' }}>{f.key}</span>
                          </td>
                          <td style={{ ...tdx, fontSize: 12, color: 'var(--p-t3)' }}>
                            <span className="v2-tag blue" style={{ marginRight: 6 }}>{KIND_LABELS[f.kind] || f.kind || '功能'}</span>
                            <span style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>{routeText(f)}</span>
                          </td>
                          <td style={tdx}>
                            <select className="v2-select" style={{ height: 30, fontSize: 12.5 }} value={f.gate || 'guest'} onChange={(e) => patchFeat(f.key, { gate: e.target.value })}>
                              {GATES.map(([k, lb]) => <option key={k} value={k}>{lb}</option>)}
                            </select>
                          </td>
                          <td style={tdx}>
                            <input className="v2-fm-i" style={{ width: 150, fontSize: 12 }} value={f.permKey || ''} disabled={(f.gate || 'guest') !== 'perm'}
                              title={f.permKey || '无权限点'}
                              placeholder={(f.gate || 'guest') === 'perm' ? '如 insight.funding' : '门槛非「需权限」'}
                              onChange={(e) => patchFeat(f.key, { permKey: e.target.value || null })} />
                          </td>
                          <td style={tdx}><Switch on={f.enabled !== false} onChange={(v) => setEnabled(f.key, null, v, f.label, f.kind)} title="启用 / 停用" /></td>
                          <td style={tdx}><Switch on={!f.navHidden} onChange={(v) => setNavShown(f, v)} title="是否在顶栏显示" /></td>
                          <td style={tdx}><Switch on={onNav ? !!nav[idx].isNew : !!f.isNew} onChange={(v) => setNew(f, v)} title="NEW 角标" /></td>
                        </tr>
                        {isChannel && open && f.children.map((ch) => (
                          <tr key={f.key + '.' + ch.key} style={{ background: '#FCFDFF' }}>
                            <td style={tdx} />
                            <td style={{ ...tdx, paddingLeft: 34 }}>
                              <span style={{ color: 'var(--p-t4)', marginRight: 6 }}>└</span>
                              <input className="v2-fm-i" value={ch.label || ''} style={{ width: 150 }} onChange={(e) => patchFeat(f.key, { label: e.target.value }, ch.key)} />
                              <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--p-t4)' }}>{ch.key}</span>
                            </td>
                            <td style={{ ...tdx, fontSize: 11.5, color: 'var(--p-t4)' }}>子功能</td>
                            <td style={tdx}>
                              <select className="v2-select" style={{ height: 30, fontSize: 12.5 }} value={ch.gate || 'guest'} onChange={(e) => patchFeat(f.key, { gate: e.target.value }, ch.key)}>
                                {GATES.map(([k, lb]) => <option key={k} value={k}>{lb}</option>)}
                              </select>
                            </td>
                            <td style={tdx}>
                              <input className="v2-fm-i" style={{ width: 150, fontSize: 12 }} value={ch.permKey || ''} disabled={(ch.gate || 'guest') !== 'perm'}
                                title={ch.permKey || '无权限点'}
                                placeholder={(ch.gate || 'guest') === 'perm' ? '如 insight.funding' : '门槛非「需权限」'}
                                onChange={(e) => patchFeat(f.key, { permKey: e.target.value || null }, ch.key)} />
                            </td>
                            <td style={tdx}><Switch on={ch.enabled !== false} onChange={(v) => setEnabled(f.key, ch.key, v, ch.label, 'child')} title="启用 / 停用" /></td>
                            <td style={tdx}><span style={{ fontSize: 11, color: 'var(--p-t4)' }}>随频道</span></td>
                            <td style={tdx} />
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ct" style={{ marginTop: 18 }}>自定义外链</div>
      <div className="cs">顶栏直接跳转的外部/自定义链接（与内置功能并列）</div>
      {customLinks.length ? (
        <div style={{ marginTop: 8 }}>
          {customLinks.map((n) => (
            <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--p-line2)' }}>
              <Icon name="ext" size={15} style={{ color: 'var(--p-t4)' }} />
              <span style={{ minWidth: 110, color: 'var(--aink)', fontWeight: 500 }}>{n.label}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--p-t3)', fontFamily: 'ui-monospace,Menlo,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={n.href}>{n.href || '（未填写链接）'}</span>
              <Switch on={!n.hidden} onChange={(v) => patchNav(n.key, { hidden: !v })} title="顶栏显示" />
              <button className="v2-link" onClick={() => onEditLink({ ...n })}>编辑</button>
              <button className="v2-link danger" onClick={() => removeCustom(n.key, n.label)}>删除</button>
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: 12, color: 'var(--p-t4)', padding: '10px 4px' }}>暂无自定义外链，可点击下方「＋ 添加自定义外链」新增。</div>}
    </div>
  );
}

/* ================= Tab2：角色默认 ================= */
function RoleMatrix({ cfg, setCfg, toast }) {
  const cellVal = (feat, role) => ((feat.defaults || {})[role] !== false);
  const setCell = (key, childKey, role, v) => setCfg((c) => ({
    ...c,
    features: c.features.map((f) => {
      if (childKey) {
        return f.key === key
          ? { ...f, children: (f.children || []).map((ch) => (ch.key === childKey ? { ...ch, defaults: { ...(ch.defaults || {}), [role]: v } } : ch)) }
          : f;
      }
      return f.key === key ? { ...f, defaults: { ...(f.defaults || {}), [role]: v } } : f;
    }),
  }));
  /* 整列全开 / 全关：全关为破坏性操作，走共享 Modal 二次确认 */
  const colAll = async (role, v) => {
    if (!v) {
      const ok = await confirmDialog({
        title: '整列全关',
        text: `确认将「${ROLE_LABEL[role]}」列的默认权限全部关闭？该角色默认将不再拥有相关功能（逐人授权仍可覆盖）。`,
        okText: '全部关闭', danger: true,
      });
      if (!ok) return;
    }
    setCfg((c) => ({
      ...c,
      features: c.features.map((f) => ({
        ...f,
        ...(f.permKey ? { defaults: { ...(f.defaults || {}), [role]: v } } : {}),
        children: (f.children || []).map((ch) => (ch.permKey ? { ...ch, defaults: { ...(ch.defaults || {}), [role]: v } } : ch)),
      })),
    }));
    toast(v ? `已整列开启「${ROLE_LABEL[role]}」` : `已整列关闭「${ROLE_LABEL[role]}」`);
  };

  const grouped = GROUPS.map((g) => {
    const items = [];
    cfg.features.filter((f) => f.group === g).forEach((f) => {
      if (f.permKey) items.push({ key: f.key, childKey: null, label: f.label, feat: f });
      (f.children || []).forEach((ch) => { if (ch.permKey) items.push({ key: f.key, childKey: ch.key, label: ch.label, feat: ch }); });
    });
    return { group: g, items };
  }).filter((x) => x.items.length);

  const th = { fontSize: 11.5, color: 'var(--p-t3)', fontWeight: 600, textAlign: 'center', padding: '8px 10px', borderBottom: '1.5px solid var(--p-line)' };
  const tdx = { padding: '8px 10px', borderBottom: '1px solid var(--p-line2)', verticalAlign: 'middle' };

  return (
    <>
      <div className="v2-notice blue" style={{ marginBottom: 14 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="info" size={15} /></span>
        <span>下表为<b>角色默认</b>：新建 / 未单独授权的账号按此默认开通功能。已逐人授权的账号以个人授权为准，不受此处影响。</span>
      </div>
      <div className="v2-card" style={{ maxWidth: 1040 }}>
        <div className="ct">角色默认权限矩阵</div>
        <div className="cs">行＝含权限点的功能 / 子功能；列＝四层角色；勾选后该角色默认获得对应权限点</div>
        <div style={{ overflow: 'auto', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>功能 / 权限点</th>
                {ROLES.map(([r, lb]) => (
                  <th key={r} style={{ ...th, width: 148 }}>
                    <div>{lb}</div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                      <button className="v2-mini-btn" title="整列全开" onClick={() => colAll(r, true)}>全开</button>
                      <button className="v2-mini-btn" title="整列全关" onClick={() => colAll(r, false)}>全关</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ group, items }) => (
                <React.Fragment key={group}>
                  <tr><td colSpan={1 + ROLES.length} style={{ padding: '9px 10px 5px', fontSize: 12, fontWeight: 700, color: 'var(--p-t2)', background: '#F8FAFD' }}>{group}</td></tr>
                  {items.map((it) => (
                    <tr key={it.key + '.' + (it.childKey || 'self')}>
                      <td style={{ ...tdx, paddingLeft: it.childKey ? 32 : 10 }}>
                        {it.childKey && <span style={{ color: 'var(--p-t4)', marginRight: 6 }}>└</span>}
                        <span style={{ color: 'var(--aink)', fontWeight: 500 }}>{it.label}</span>
                        <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--p-t4)', fontFamily: 'ui-monospace,Menlo,monospace' }} title={it.feat.permKey}>{it.feat.permKey}</span>
                      </td>
                      {ROLES.map(([r]) => (
                        <td key={r} style={{ ...tdx, textAlign: 'center' }}>
                          <Switch on={cellVal(it.feat, r)} onChange={(v) => setCell(it.key, it.childKey, r, v)} title={`${ROLE_LABEL[r]} · ${it.label}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ================= 自定义外链编辑弹窗（共享 Modal） ================= */
function CustomLinkModal({ link, onClose, onSave }) {
  const [f, setF] = useState({ label: link.label || '', href: link.href || '', isNew: !!link.isNew });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={link.key ? '编辑自定义外链' : '添加自定义外链'} width={560} onClose={onClose}
      footer={<>
        <button className="v2-btn ghost" onClick={onClose}>取消</button>
        <button className="v2-btn" onClick={() => onSave({ ...link, ...f })}>确定</button>
      </>}>
      <div className="v2-fm-row">
        <span className="v2-fm-label">名称</span>
        <div className="v2-fm-body"><input className="v2-fm-i" value={f.label} onChange={(e) => set('label', e.target.value)} placeholder="顶栏显示的名称" /></div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label req">链接地址</span>
        <div className="v2-fm-body"><input className="v2-fm-i" value={f.href} onChange={(e) => set('href', e.target.value)} placeholder="https://… 或 /feedback?source=web" /></div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">NEW 角标</span>
        <div className="v2-fm-body"><div style={{ padding: '7px 0' }}><Switch on={f.isNew} onChange={(v) => set('isNew', v)} /><span className="v2-fm-hint" style={{ display: 'inline-block', marginLeft: 9 }}>开启后顶栏名称旁显示 NEW 角标</span></div></div>
      </div>
    </Modal>
  );
}
