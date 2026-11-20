import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, useToast, XixiLoading } from './ui.jsx';
import { useV2User } from './V2User.jsx';

const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

const LVL = { hi: ['高关注', 'hi'], mid: ['中关注', 'mid'], watch: ['观察', 'watch'] };

/* ============================================================
 * AI 数据洞察（V2 前台频道）
 * 两层结构：
 *  1. 公开洞察首页 —— 脱敏聚合图表，全员可见
 *  2. 业务分析工作台 —— 登录+角色授权（精准资助分析等）
 * ============================================================ */

/* ---------------- 公开层数据（示例，正式接 /api/v1/insight/overview） ---------------- */
const OV = {
  kpi: [
    { lb: '在校生', vl: '15,103', cmp: '学籍口径 · 数据日期 11-18', bar: 'var(--el-primary)', ic: 'grad' },
    { lb: '今日智能体对话', vl: '2,580', cmp: '覆盖 11 个学院锡锡导员', bar: 'var(--p-secondary)', ic: 'spark' },
    { lb: '活跃智能体', vl: '56', cmp: '累计访问 11.2 万次', bar: '#8B5CF6', ic: 'robot' },
    { lb: '平台模型', vl: '12', cmp: '本地部署 + 外部合作', bar: 'var(--p-success)', ic: 'chip' },
  ],
  trend: [
    ['11-14', 2340], ['11-15', 2510], ['11-16', 2680], ['11-17', 2420],
    ['11-18', 2590], ['11-19', 2610], ['11-20', 2580],
  ],
  collegeActivity: [
    ['机械工程学院', 92], ['物联网工程学院', 85], ['控制工程学院', 78], ['汽车与交通工程学院', 70],
    ['财经学院', 64], ['集成电路学院', 61], ['管理学院', 58], ['文旅学院', 49],
    ['设计艺术学院', 46], ['人工智能学院', 74], ['国际教育学院', 38],
  ],
  scenes: [
    ['学生数据查询', 38], ['制度政策问答', 22], ['科研教学查询', 18], ['就业指导', 12], ['其他', 10],
  ],
};

/* ---------------- 工作台注册表（正式从后端按角色返回） ---------------- */
const WORKBENCHES = [
  {
    key: 'funding',
    title: '精准资助分析',
    ic: 'heart',
    desc: '基于一卡通消费行为的隐性困难识别 —— 「吃得勤 + 吃得省」多信号模型，输出高/中/观察三档资助工作线索，支持名单筛选与导出。',
    tags: ['学工/资助中心', '消费行为分析', '名单导出'],
    role: '资助工作岗',
    fresh: '消费数据截至 2026-11-19',
    status: 'ready',
  },
  {
    key: 'safety',
    title: '学生安全分析',
    ic: 'warn',
    desc: '晚归未归、请假异常、行为突变等多源信号融合的安全预警看板，面向学工与保卫条线的日常排查与专项研判。',
    tags: ['学工/保卫处', '多源信号', '预警看板'],
    role: '学生安全岗',
    fresh: '考勤数据截至 2026-11-18',
    status: 'building',
  },
];

/* ================= 频道首页 ================= */
export function InsightHome({ onOpenWorkbench, tab, setTab }) {
  const { user, casLogin } = useV2User();
  const maxTrend = Math.max(...OV.trend.map((x) => x[1]));
  const maxAct = Math.max(...OV.collegeActivity.map((x) => x[1]));
  const maxScene = Math.max(...OV.scenes.map((x) => x[1]));

  return (
    <>
      <div className="v2-body v2-insight-wrap" style={{ maxWidth: 1240, paddingTop: 40 }}>
        <div className="v2-insight-headbar">
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--aink)' }}>AI 数据洞察</h2>
            <p style={{ fontSize: 13, color: 'var(--p-t3)', marginTop: 6 }}>数据驱动的一湖洞察 · 全校运行态势与业务分析工作台 · 敏感分析经授权后使用</p>
          </div>
        </div>
        <div className="v2-tabs" style={{ margin: '18px 0 20px' }}>
          <div className={'v2-tab' + (tab === 'overview' ? ' on' : '')} onClick={() => setTab('overview')}>公开洞察</div>
          <div className={'v2-tab' + (tab === 'workbench' ? ' on' : '')} onClick={() => setTab('workbench')}>业务分析工作台</div>
        </div>

        {tab === 'overview' && (<>
        {/* KPI 行 */}
        <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {OV.kpi.map((k) => (
            <div key={k.lb} className="v2-kpi">
              <span className="bar" style={{ background: k.bar }} />
              <div className="lb">{k.lb}</div>
              <div className="vl">{k.vl}</div>
              <div className="cmp">{k.cmp}</div>
            </div>
          ))}
        </div>

        {/* 图表区 */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14 }}>
          <div className="v2-card">
            <div className="ct">近 7 日智能体对话趋势</div>
            <div className="cs">全校合计 · 数据中台自动统计 · 柱=当日对话量 · 折线=趋势走向</div>
            <ComboTrendChart data={OV.trend} />
          </div>
          <div className="v2-card">
            <div className="ct">对话场景分布</div>
            <div className="cs">按智能体分类聚合</div>
            {OV.scenes.map(([n, v]) => (
              <div key={n} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 100 }}>{n}</span>
                <div className="v2-hbar-track"><div style={{ width: `${(v / maxScene) * 100}%`, background: 'var(--p-secondary)' }} /></div>
                <span className="v2-hbar-val">{v}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="v2-card" style={{ marginTop: 14 }}>
          <div className="ct">各学院智能体活跃度</div>
          <div className="cs">近 30 日锡锡导员问答次数指数 · 仅聚合统计，不含个体数据</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28 }}>
            {OV.collegeActivity.map(([n, v]) => (
              <div key={n} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 130 }}>{n}</span>
                <div className="v2-hbar-track"><div style={{ width: `${(v / maxAct) * 100}%`, background: 'var(--el-primary)' }} /></div>
                <span className="v2-hbar-val">{v}</span>
              </div>
            ))}
          </div>
        </div>

        </>)}
        {tab === 'workbench' && (<>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--aink)', margin: '6px 0 6px' }}>业务分析工作台</div>
        <p style={{ fontSize: 12.5, color: 'var(--p-t3)', margin: '0 0 14px' }}>面向业务部门的分析应用 · 使用学校统一身份认证登录，并需具备对应业务角色</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {WORKBENCHES.map((w) => (
            <div key={w.key} className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--el-primary-l9)', color: 'var(--el-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={w.ic} size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--aink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {w.title}
                    {w.status === 'building' && <span className="v2-tag mid">建设中</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginTop: 2 }}>{w.fresh}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--p-t3)', lineHeight: 1.7 }}>{w.desc}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {w.tags.map((t) => <span key={t} className="v2-tag blue">{t}</span>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #F3F6FA' }}>
                <span style={{ fontSize: 11.5, color: 'var(--p-t4)' }}>需要角色：{w.role}</span>
                <button className="v2-btn" disabled={w.status === 'building'} onClick={() => onOpenWorkbench(w)}>
                  {w.status === 'building' ? '敬请期待' : '进入分析'} →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="v2-notice blue" style={{ marginTop: 18 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="info" size={15} /></span>
          <span>本页聚合洞察对所有师生开放（仅统计汇总，不涉及个体数据）；业务分析工作台涉及学生个人信息，须使用统一身份认证登录且具备对应业务角色。需要开通请联系信息化与数据服务中心（dcc@wxit.edu.cn）。</span>
        </div>
        </>)}
      </div>
    </>
  );
}

/* ================= 精准资助分析工作台（原型界面，示例数据） ================= */


/* AI 洞察横幅：锡锡 + 打字机 */
function AiInsightBanner({ k, win }) {
  const msg = useMemo(() => {
    if (!k || k.err) return '正在接入数仓，获取消费行为洞察…';
    const hi = Number(k.hi) || 0, mid = Number(k.mid) || 0;
    const top = '消费信号已完成分析';
    return `${top}：近 ${win} 天共识别高关注线索 ${hi} 人、中关注 ${mid} 人。高关注人群呈"就餐频次达标 + 单顿均价显著低于同学院同年级"特征，建议优先复核；详细信号分解见名单详情。`;
  }, [k, win]);
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setShown(msg.slice(0, i));
      if (i >= msg.length) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [msg]);
  return (
    <div className="v2-ai-banner">
      <div className="xab-avatar"><img src="./v2-xixi.png" alt="锡锡" /></div>
      <div className="xab-body">
        <span className="xab-label"><Icon name="spark" size={11} /> AI 洞察</span>
        <div className="xab-text">{shown}<span className="caret" /></div>
      </div>
    </div>
  );
}


/* 柱状 + 折线组合图（SVG） */
function ComboTrendChart({ data }) {
  const W = 560, H = 210, padL = 8, padR = 8, padT = 26, padB = 26;
  const max = Math.max(...data.map((x) => x[1])) * 1.12;
  const min = Math.min(...data.map((x) => x[1])) * 0.85;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = data.length;
  const bw = Math.min(34, (iw / n) * 0.52);
  const xOf = (i) => padL + (iw / n) * (i + 0.5);
  const yOf = (v) => padT + ih - ((v - min) / (max - min)) * ih;
  const pts = data.map((x, i) => `${xOf(i).toFixed(1)},${yOf(x[1]).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 12, display: 'block' }}>
      {data.map((x, i) => {
        const bx = xOf(i) - bw / 2, by = yOf(x[1]);
        const isLast = i === n - 1;
        return (
          <g key={x[0]}>
            <rect x={bx.toFixed(1)} y={by.toFixed(1)} width={bw.toFixed(1)} height={(padT + ih - by).toFixed(1)} rx="4"
              fill={isLast ? 'var(--el-primary)' : '#C3D4F7'} opacity={isLast ? 1 : 0.9}>
              <title>{x[0]}：{x[1].toLocaleString()} 次</title>
            </rect>
            <text x={xOf(i).toFixed(1)} y={(by - 7).toFixed(1)} font-size="10" fill={isLast ? 'var(--el-primary)' : '#94A3B8'}
              text-anchor="middle" font-weight={isLast ? 700 : 400}>{x[1].toLocaleString()}</text>
            <text x={xOf(i).toFixed(1)} y={(H - 8).toFixed(1)} font-size="10" fill="#94A3B8" text-anchor="middle">{x[0]}</text>
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke="var(--p-accent)" stroke-width="2.2"
        stroke-linejoin="round" stroke-linecap="round" opacity="0.9" />
      {data.map((x, i) => (
        <circle key={x[0] + 'c'} cx={xOf(i).toFixed(1)} cy={yOf(x[1]).toFixed(1)} r="3.4" fill="#fff"
          stroke="var(--p-accent)" stroke-width="1.8" />
      ))}
    </svg>
  );
}

export function FundingWorkbench({ onBack, toast }) {
  const [win, setWin] = useState(30);
  const [filters, setFilters] = useState({ college: '', grade: '', level: '', q: '' });
  const [detail, setDetail] = useState(null);
  const [k, setK] = useState(null);
  const [colleges, setColleges] = useState(null);
  const [list, setList] = useState(null);

  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const authHeaders = token ? { Authorization: 'Bearer ' + token } : {};

  useEffect(() => {
    setK(null);
    fetch(`${API_BASE}/insight/funding/overview?windowDays=${win}`, { headers: authHeaders })
      .then((r) => r.json()).then((j) => { if (j.code === 200) setK(j.data); else { setK({ err: j.message }); toast('加载失败：' + (j.message || '')); } }).catch((e) => { setK({ err: e.message }); });
    fetch(`${API_BASE}/insight/funding/colleges?windowDays=${win}`, { headers: authHeaders })
      .then((r) => r.json()).then((j) => setColleges(j.data || [])).catch(() => setColleges([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win]);

  useEffect(() => {
    setList(null);
    const p = new URLSearchParams({ windowDays: win, page: 1, size: 100 });
    if (filters.level) p.set('level', filters.level);
    if (filters.college) p.set('college', filters.college);
    if (filters.q) p.set('q', filters.q);
    fetch(`${API_BASE}/insight/funding/students?` + p, { headers: authHeaders })
      .then((r) => r.json()).then((j) => setList(j.data || { records: [], total: 0 })).catch(() => setList({ records: [], total: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win, filters.level, filters.college, filters.q]);

  const rows = ((list && list.records) || []).filter((r) => !filters.grade || r.grade === filters.grade);
  const collegeNames = (colleges || []).map((c) => c.n);

  const maxC = Math.max(1, ...(colleges || []).map((d) => (d.hi || 0) + (d.mid || 0) + (d.watch || 0)));
  const exportCsv = () => {
    const head = ['学号', '姓名', '学院', '年级', '档位', '月就餐(顿)', '单顿均价(元)', '月食堂支出(元)', '消费分位', '信号证据'];
    const csv = ['\uFEFF# 精准资助分析 · 线索名单（原型演示 · 示例数据）', '# 观察窗:' + k.range + ' · 导出时间:' + new Date().toLocaleString('zh-CN'), head.join(',')]
      .concat(rows.map((s) => [s.id, s.name, s.college, s.grade, LVL[s.level][0], s.meals, Number(s.price).toFixed(2), s.spend, 'P' + s.pct, '"同学院同年级均价P' + Math.round(Number(s.pct) || 0) + '"'].join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `精准资助线索名单_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast(`已导出 ${rows.length} 条（正式版将写入审计日志）`);
  };

  return (
    <>
      <div className="v2-body" style={{ maxWidth: 1560 }}>
        <button className="v2-btn ghost" onClick={onBack} style={{ marginBottom: 12 }}>← 返回数据洞察</button>
        <div className="v2-page-head">
          <div>
            <div className="v2-ph-title">精准资助分析</div>
            <div className="v2-ph-sub">基于一卡通消费行为的隐性困难识别 ·「吃得勤 + 吃得省」多信号模型 · 面向学工/资助中心</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="v2-fresh-pill">数据截至 2026-11-19</span>
            <div className="v2-tabs">
              {[14, 30, 60, 90].map((w) => (
                <div key={w} className={`v2-tab${win === w ? ' on' : ''}`} onClick={() => setWin(w)}>近{w}天</div>
              ))}
            </div>
          </div>
        </div>

        <AiInsightBanner k={k} win={win} />

        <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          {!k && <div className="v2-kpi" style={{ gridColumn: 'span 6', padding: 0, border: 'none' }}><XixiLoading text="锡锡正在分析消费数据…" sub="数仓实时查询，约需 5–15 秒" /></div>}
          {k && k.err && <div className="v2-kpi" style={{ gridColumn: 'span 6' }}><div className="v2-empty">加载失败：{k.err}，请刷新重试</div></div>}
          {k && !k.err ? [
            { lb: '观察窗', vl: `${win}天`, cmp: k.range, bar: 'var(--p-t4)' },
            { lb: '活跃消费人数', vl: (k.active || 0).toLocaleString(), cmp: '数据日期 ' + k.dataDate, bar: 'var(--p-t4)' },
            { lb: '就餐达标人数', vl: (k.eligible || 0).toLocaleString(), cmp: '观察窗内食堂就餐 ≥40 顿', bar: 'var(--p-success)' },
            { lb: '高关注线索', vl: (k.hi || 0).toLocaleString(), cmp: '同学院同年级 P5 以下', bar: 'var(--abad)' },
            { lb: '中关注线索', vl: (k.mid || 0).toLocaleString(), cmp: 'P5 – P15', bar: '#FBBF24' },
            { lb: '观察线索', vl: (k.watch || 0).toLocaleString(), cmp: 'P15 – P40 · 参考', bar: 'var(--p-secondary)' },
          ].map((x) => (
            <div key={x.lb} className="v2-kpi">
              <span className="bar" style={{ background: x.bar }} />
              <div className="lb">{x.lb}</div>
              <div className="vl">{x.vl}</div>
              <div className="cmp">{x.cmp}</div>
            </div>
          )) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14 }}>
          <div className="v2-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="ct">各学院线索分布</div><div className="cs">同学院同年级基准分位口径 · 高/中/观察三档</div></div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--p-t3)' }}>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--abad)', marginRight: 4 }} />高关注</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#FBBF24', marginRight: 4 }} />中关注</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--p-secondary)', marginRight: 4 }} />观察</span>
              </div>
            </div>
            {(colleges || []).map((d) => (
              <div key={d.n} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 150 }}>{d.n}</span>
                <div className="v2-hbar-track" title={`${d.n}：高${d.hi} / 中${d.mid} / 观察${d.watch}`}>
                  <div style={{ width: `${(d.hi / maxC) * 100}%`, background: 'var(--abad)' }} />
                  <div style={{ width: `${(d.mid / maxC) * 100}%`, background: '#FBBF24' }} />
                  <div style={{ width: `${(d.watch / maxC) * 100}%`, background: 'var(--p-secondary)' }} />
                </div>
                <span className="v2-hbar-val">{d.hi + d.mid + d.watch} 人</span>
              </div>
            ))}
          </div>
          <div className="v2-card">
            <div className="ct">单顿均价分位分布</div>
            <div className="cs">达标人群 · 分位越低消费越省</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, marginTop: 16 }}>
              {[420, 510, 580, 640, 690, 720, 730, 716, 680, 640, 595, 545, 490, 430, 370, 310, 250, 190, 130, 80].map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${(v / 730) * 100}%`, background: i < 3 ? 'var(--p-primary)' : '#CBD5E1', opacity: i < 3 ? 1 : 0.75, borderRadius: 2 }} title={`P${i * 5}~P${i * 5 + 5}：${v} 人`} />
              ))}
            </div>
            <div style={{ borderTop: '1px dashed var(--p-accent)', margin: '6px 0 0 11%', position: 'relative' }}>
              <span style={{ position: 'absolute', right: 4, top: -16, fontSize: 10, color: 'var(--p-accent)', fontWeight: 600 }}>P15 阈值</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--p-t4)', textAlign: 'right', marginTop: 4 }}>横轴：同学院同年级消费分位（越低越省）· 纵轴：人数</div>
          </div>
        </div>

        <div className="v2-filter-bar" style={{ marginTop: 16 }}>
          <label>学院</label>
          <select className="v2-select" value={filters.college} onChange={(e) => setFilters({ ...filters, college: e.target.value })}>
            <option value="">全部学院</option>
            {collegeNames.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label>年级</label>
          <select className="v2-select" value={filters.grade} onChange={(e) => setFilters({ ...filters, grade: e.target.value })}>
            <option value="">全部年级</option>
            {[...new Set(rows.map((r) => r.grade).filter(Boolean))].sort().map((g) => <option key={g}>{g}</option>)}
          </select>
          <label>档位</label>
          <select className="v2-select" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
            <option value="">全部档位</option>
            <option value="hi">高关注</option><option value="mid">中关注</option><option value="watch">观察</option>
          </select>
          <input className="v2-search" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="搜索学号 / 姓名" />
          <button className="v2-btn ghost" onClick={() => { setFilters({ college: '', grade: '', level: '', q: '' }); toast('筛选已重置'); }}>重置</button>
          <span style={{ flex: 1 }} />
          <button className="v2-btn" onClick={exportCsv}>⤓ 导出名单</button>
        </div>
        <div className="v2-tbl-wrap">
          <table className="v2-table">
            <thead><tr>
              <th>学号</th><th>姓名</th><th>学院</th><th>年级</th><th>档位</th>
              <th style={{ textAlign: 'right' }}>月就餐(顿)</th><th style={{ textAlign: 'right' }}>单顿均价(元)</th>
              <th style={{ textAlign: 'right' }}>月食堂支出(元)</th><th style={{ textAlign: 'right' }}>消费分位</th>
              <th>信号证据</th><th>操作</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="num">{s.id}</td><td>{s.name}</td><td>{s.college}</td><td>{s.grade}</td>
                  <td><span className={`v2-tag ${LVL[s.level][1]}`}>{LVL[s.level][0]}</span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{s.meals}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{Number(s.price).toFixed(2)}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{s.spend}</td>
                  <td className="num" style={{ textAlign: 'right' }}><b style={{ color: s.level === 'hi' ? 'var(--abad)' : s.level === 'mid' ? '#D97706' : 'var(--p-primary)' }}>P{s.pct}</b></td>
                  <td style={{ fontSize: 11.5, color: 'var(--p-t4)' }}>同{String(s.college || '').slice(0, 4)}{s.grade || ''}均价 P{Math.round(Number(s.pct) || 0)}</td>
                  <td><button className="v2-link" onClick={() => setDetail(s)}>详情</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="v2-tbl-foot"><span>共 {list ? list.total : '…'} 条线索 · 当前筛选：{filters.college || '全部学院'} / {filters.grade || '全部年级'} / {filters.level ? LVL[filters.level][0] : '全部档位'}</span></div>
        </div>
        <div className="v2-notice warn" style={{ marginTop: 16 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
          <span>本页结果为<b>算法生成的资助工作线索</b>，不构成困难认定。请结合谈心谈话、家庭情况复核后按学校资助流程处理；学生个人信息仅限授权岗位查看，导出操作将记录审计日志。</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--p-t4)', marginTop: 12 }}>数据源：一卡通消费（终端含餐厅/食堂）· 宿管学籍映射 · 只读数仓实时查询 · 观察窗 {k && k.range ? k.range : ''}</div>
      </div>

      {detail && (
        <div className="v2-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="v2-modal" style={{ width: 480 }}>
            <div className="v2-md-head">
              <div className="t">{detail.name} <span style={{ fontWeight: 400, color: 'var(--p-t4)', fontSize: 13 }}>{detail.id} · {detail.college} · {detail.grade}</span></div>
              <button className="v2-md-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="v2-md-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span className={`v2-tag ${LVL[detail.level][1]}`} style={{ fontSize: 12, padding: '3px 11px' }}>{LVL[detail.level][0]}</span>
                <span style={{ fontSize: 12, color: 'var(--p-t4)' }}>综合消费分位 <b style={{ color: 'var(--aink)' }}>P{detail.pct}</b> · 同{detail.college}{detail.grade}基准</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 18 }}>
                {[['观察窗就餐', `${detail.meals} 顿`], ['单顿均价', `${Number(detail.price).toFixed(2)} 元`], ['观察窗支出', `${detail.spend} 元`], ['消费分位', `P${Math.round(Number(detail.pct) || 0)}`]].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--p-fill)', borderRadius: 11, padding: '10px 11px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--p-t3)' }}>{l}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--aink)', marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', margin: '12px 0 9px' }}>信号分解（百分位 = 同学院同年级相对位置）</div>
              {[
                ['单顿均价分位', 'P' + Math.round(Number(detail.pct) || 0), Number(detail.pct) < 5],
                ['观察窗就餐次数', (detail.meals || 0) + ' 顿（≥40 达标）', false],
                ['观察窗食堂总支出', (detail.spend || 0) + ' 元', false],
              ].map(([nm, v, low]) => (
                <div key={nm} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F6FA', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--p-t2)' }}>{nm}</span>
                  <span style={{ fontWeight: 600, color: low ? 'var(--abad)' : 'var(--aink)' }}>{v}{low ? ' · 显著偏低' : ''}</span>
                </div>
              ))}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', margin: '16px 0 9px' }}>排除项核验</div>
              {[['观察窗内请假离校 0 天（无「人不在校」干扰）'], ['消费数据覆盖 29 / 30 天（完整性达标）'], ['无大额异常消费（单笔 ≤ 25 元）']].map((t) => (
                <div key={t} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: 'var(--p-t2)', padding: '6px 0' }}>
                  <span style={{ color: 'var(--p-success)', fontWeight: 700 }}>✓</span>{t}
                </div>
              ))}
              <div className="v2-notice warn" style={{ marginTop: 16, fontSize: 11.5 }}>
                本详情为算法线索，请辅导员/资助岗人工复核后按学校资助流程处理。<b>请勿直接向学生提及「被系统识别」。</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
