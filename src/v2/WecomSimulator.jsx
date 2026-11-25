import React, { useEffect, useMemo, useState } from 'react';
import { Icon, AgentAvatar, IconBuilding } from './ui.jsx';
import { getPublicConfig } from '../api/config';
import { resolveFeatures } from './featureConfig.js';
import { simulateGate, visibleNavKeys, chipsOf } from './simulator.js';

// 与 V2App/V2Admin 同源相对路径策略
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
const ROLE_LABELS = { admin: '平台管理员', leader: '校领导', college_admin: '学院管理员', user: '普通用户' };
const SCOPE_LABELS = { all: '全校数据', college: '本院数据', none: '无数据范围' };

// 设备型号预设（name + 逻辑尺寸 w×h，即屏幕可视区，不含手机壳 12px 边距）
const DEVICES = [
  { id: 'se', name: 'iPhone SE', w: 375, h: 667 },
  { id: 'iphone12', name: 'iPhone 12/13', w: 390, h: 844 },
  { id: 'iphone14pm', name: 'iPhone 14 Pro Max', w: 430, h: 932 },
  { id: 'pixel7', name: 'Pixel 7', w: 412, h: 915 },
  { id: 's20u', name: 'Galaxy S20 Ultra', w: 412, h: 915 },
  { id: 'ipadmini', name: 'iPad mini', w: 768, h: 1024 },
  { id: 'custom', name: '自定义', w: 390, h: 844 },
];
const W_MIN = 280, W_MAX = 1200, H_MIN = 400, H_MAX = 1400; // 自定义尺寸上下限(px)
const SHELL = 12; // 手机壳单边边距(px)
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));

// V2 鉴权铁律：命中鉴权接口的 fetch 必须带 Authorization: Bearer <admin_token||user_token>
function authHeaders() {
  let t = '';
  try { t = localStorage.getItem('admin_token') || localStorage.getItem('user_token') || ''; } catch { t = ''; }
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * 企微仿真（档1：纯预览 + 门禁模拟）。
 * 左侧选用户 → 右侧手机框渲染「该用户在企微模式下所见的广场」；
 * 点卡片不跳转、不发请求，只按返回的 perms+scope+user 跑一遍门禁模拟并弹结果条。
 */
export default function WecomSimulator({ toast }) {
  const [users, setUsers] = useState([]);
  const [uid, setUid] = useState('');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(undefined);
  const [cat, setCat] = useState('全部');
  const [gate, setGate] = useState(null);
  // —— 设备型号 + 自定义尺寸（Chrome DevTools device toolbar 风格）——
  const [devId, setDevId] = useState('iphone12');
  const [cw, setCw] = useState(390);
  const [ch, setCh] = useState(844);
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));

  // 监听窗口尺寸变化，实时重算缩放
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 用户列表（管理员接口，带 token）
  useEffect(() => {
    fetch(`${API_BASE}/users?size=200`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => setUsers((j && j.data && j.data.records) || []))
      .catch((e) => toast && toast('用户列表加载失败：' + e.message));
  }, [toast]);

  // 功能注册表（sys_config v2.features，公开可读）→ 与前台同源的可见导航
  useEffect(() => {
    let alive = true;
    getPublicConfig('v2.features')
      .then((d) => {
        let cfg = null;
        try { const a = JSON.parse((d && d.configValue) || 'null'); cfg = a && typeof a === 'object' ? a : null; } catch { cfg = null; }
        if (alive) setResolved(resolveFeatures(cfg));
      })
      .catch(() => { if (alive) setResolved(resolveFeatures(null)); });
    return () => { alive = false; };
  }, []);

  // 切换用户 → 拉预览（perms/scope/agents 均按目标用户计算）
  useEffect(() => {
    if (!uid) { setPreview(null); return undefined; }
    let alive = true;
    setLoading(true); setGate(null); setCat('全部'); setPreview(null);
    fetch(`${API_BASE}/admin/preview?userId=${encodeURIComponent(uid)}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j || j.code !== 200) throw new Error((j && j.message) || '预览失败');
        setPreview(j.data);
      })
      .catch((e) => { if (alive) { setPreview(null); toast && toast('预览加载失败：' + e.message); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uid, toast]);

  const filteredUsers = useMemo(() => {
    const kw = q.trim();
    if (!kw) return users;
    return users.filter((u) => ((u.username || '') + (u.nickname || '')).includes(kw));
  }, [users, q]);

  const agents = (preview && preview.agents) || [];
  const chips = useMemo(() => chipsOf(agents), [agents]);
  const navKeys = useMemo(
    () => (preview && resolved !== undefined ? visibleNavKeys(resolved, { user: preview.user, perms: preview.perms }) : []),
    [preview, resolved],
  );
  const rows = agents.filter((a) => cat === '全部' || a.categoryName === cat);

  // 设备尺寸 → 手机壳外框（屏幕 w×h + 单边 12px 壳边距）
  const dev = DEVICES.find((d) => d.id === devId) || DEVICES[1];
  const isCustom = devId === 'custom';
  const w = isCustom ? clampN(cw, W_MIN, W_MAX) : dev.w;
  const h = isCustom ? clampN(ch, H_MIN, H_MAX) : dev.h;
  const frameW = w + SHELL * 2;
  const frameH = h + SHELL * 2;
  // 高度自适应：可用高 ≈ 视口高 - 顶栏/工具条/内边距；k 只缩小不放大，保证整屏放得下且尽量大
  const availH = Math.max(240, vh - 170);
  const k = Math.min(1, availH / frameH);
  const onW = (e) => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n)) setCw(n); };
  const onH = (e) => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n)) setCh(n); };

  const clickAgent = (a) => {
    const r = simulateGate(a, { user: preview.user, perms: preview.perms, scope: preview.scope, resolved });
    setGate({ name: a.name, ...r });
  };

  return (
    <div className="v2sim-wrap">
      {/* 左：用户选择 + 摘要 */}
      <div className="v2-card v2sim-left">
        <div className="ct">选择用户</div>
        <div className="cs">切换用户即预览「该用户在企微模式下能看到什么、点智能体会不会进」</div>
        <input className="v2sim-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工号 / 姓名" />
        <select className="v2-select v2sim-select" value={uid} onChange={(e) => setUid(e.target.value)}>
          <option value="">— 请选择用户 —</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} {u.nickname || ''}（{ROLE_LABELS[u.role] || u.role || 'user'}{u.pending === 1 ? '，待分配' : ''}）
            </option>
          ))}
        </select>

        {preview && (
          <div className="v2-scope-explain v2sim-summary">
            <div className="h"><Icon name="info" size={15} /> 该用户摘要</div>
            <div className="b">
              <div className="v2sim-kv"><span>角色</span><b>{ROLE_LABELS[preview.user.role] || preview.user.role}</b></div>
              <div className="v2sim-kv"><span>数据范围</span><b>{SCOPE_LABELS[preview.scope] || preview.scope}</b></div>
              <div className="v2sim-kv"><span>待分配</span><b>{preview.user.pending === 1 ? '是（仅制度建设可见）' : '否'}</b></div>
              <div className="v2sim-kv"><span>学院</span><b>{preview.user.collegeName || '—'}</b></div>
              <div className="v2sim-kv v2sim-kv-nav"><span>可见导航</span>
                <span className="v2sim-navs">{navKeys.length ? navKeys.map((k) => <span key={k} className="v2-tag blue">{k}</span>) : '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右：设备工具条 + 手机框预览（按所选型号渲染并按视口高度自适应缩放） */}
      <div className="v2sim-right">
        <div className="v2sim-toolbar">
          <select className="v2sim-devsel" value={devId} onChange={(e) => setDevId(e.target.value)} title="设备型号">
            {DEVICES.map((d) => (
              <option key={d.id} value={d.id}>{d.id === 'custom' ? d.name : `${d.name} · ${d.w}×${d.h}`}</option>
            ))}
          </select>
          {isCustom && (
            <span className="v2sim-dims">
              <input type="number" min={W_MIN} max={W_MAX} step="1" value={cw} onChange={onW}
                onBlur={() => setCw((v) => clampN(v, W_MIN, W_MAX))} title={`宽 ${W_MIN}–${W_MAX}px`} />
              <span>×</span>
              <input type="number" min={H_MIN} max={H_MAX} step="1" value={ch} onChange={onH}
                onBlur={() => setCh((v) => clampN(v, H_MIN, H_MAX))} title={`高 ${H_MIN}–${H_MAX}px`} />
              <span>px</span>
            </span>
          )}
          <span className="v2sim-size">{w} × {h}</span>
          <span className="v2sim-zoom-badge">缩放 {Math.round(k * 100)}%</span>
        </div>
        <div className="v2sim-stage">
          <div className="v2sim-zoom" style={{ transform: `scale(${k})`, transformOrigin: 'top center', height: frameH * k }}>
            <div className="v2sim-phone" style={{ width: frameW, height: frameH }}>
              <div className="v2sim-notch" />
              <div className="v2sim-screen">
            {!preview ? (
              <div className="v2sim-empty">
                <Icon name="phone" size={40} />
                <div>{loading ? '加载中…' : '请在左侧选择用户以预览企微视图'}</div>
              </div>
            ) : (
              <div className="wx-page">
                <div className="wx-head">
                  <img className="wx-logo" src="./v2-logo.png?v=2" alt="校徽" />
                  <div><div className="t1">锡职大AI中台</div><div className="t2">无锡职业技术大学</div></div>
                  <span className="wx-user">{preview.user.nickname || preview.user.username}</span>
                </div>
                <div className="wx-chips">
                  {chips.map((l) => (
                    <span key={l} className={`wx-chip${cat === l ? ' on' : ''}`} onClick={() => setCat(l)}>{l}</span>
                  ))}
                </div>
                <div className="wx-list">
                  {rows.map((a) => {
                    const building = a.isBuilding === 1;
                    return (
                      <div key={a.id} className={`wx-card${building ? ' bld' : ''}`} onClick={() => clickAgent(a)}>
                        <div className="em">{building ? <IconBuilding size={34} /> : <AgentAvatar agent={a} size={40} />}</div>
                        <div className="bd">
                          <div className="nm">{a.name}{a.isRecommended === 1 && <span className="rec">推荐</span>}</div>
                          <div className="ds">{a.description || ''}</div>
                          <div className="meta">
                            <span className="cat">{a.categoryName}</span>
                            <span className="cnt">{building ? '建设中' : `访问 ${(a.visitCount || 0).toLocaleString()}`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!rows.length && <div className="wx-empty">该用户在此分类下暂无可见智能体</div>}
                </div>
              </div>
            )}

            {gate && (
              <div className={`v2sim-toast ${gate.ok ? 'ok' : 'no'}`}>
                <span className="ic"><Icon name={gate.ok ? 'check' : 'warn'} size={15} /></span>
                <div className="tx">
                  <b>{gate.name}</b>
                  <span>{gate.ok ? '✅ 会进入对话' : `⛔ 被拦：${gate.reason}`}</span>
                </div>
                <button className="v2sim-toast-close" onClick={() => setGate(null)}>✕</button>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
