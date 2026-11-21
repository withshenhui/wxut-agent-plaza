import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, useToast, XixiLoading } from './ui.jsx';
import { useV2User } from './V2User.jsx';
import { exportCsv, exportExcel } from './exportUtil.js';

const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

const LVL = { hi: ['红灯', 'hi'], mid: ['黄灯', 'mid'], watch: ['绿灯', 'watch'] };

/* ============================================================
 * AI 数据洞察（V2 前台频道）
 * 两层结构：
 *  1. 公开洞察首页 —— 脱敏聚合图表，全员可见
 *  2. 业务分析工作台 —— 登录+角色授权（精准资助分析等）
 * ============================================================ */

/* ---------------- 公开层数据（示例，正式接 /api/v1/insight/overview） ---------------- */
const OV = {
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
    desc: '基于一卡通消费行为的隐性困难识别 —— 「吃得勤 + 吃得省」多信号模型，输出红/黄/绿三档资助工作线索，支持名单筛选与导出。',
    tags: ['学工/资助中心', '消费行为分析', '名单导出'],
    role: '资助工作岗',
    fresh: '消费数据每日更新',
    status: 'ready',
  },
  {
    key: 'safety',
    title: '学生安全分析',
    ic: 'warn',
    desc: '晚归未归、请假异常、行为突变等多源信号融合的安全预警看板，面向学工与保卫条线的日常排查与专项研判。',
    tags: ['学工/保卫处', '多源信号', '预警看板'],
    role: '学生安全岗',
    fresh: '考勤数据每日更新',
    status: 'ready',
  },
  {
    key: 'academic',
    title: '学业预警分析',
    ic: 'grad',
    desc: '基于成绩数据的挂科门数与平均分识别，红黄绿三档预警，辅助学业帮扶与教务干预决策。',
    tags: ['学工/教务处', '成绩分析', '预警帮扶'],
    role: '学业预警岗',
    fresh: '取最新完整学期',
    status: 'ready',
  },
  {
    key: 'mental',
    title: '学生心理健康关怀',
    ic: 'spark',
    desc: '消费骤降与归寝异常的多信号组合识别，仅作关怀线索参考，辅助辅导员以温和方式主动关怀。',
    tags: ['学工/心理中心', '多信号组合', '关怀参考'],
    role: '心理关怀岗',
    fresh: '消费+考勤每日更新',
    status: 'ready',
  },
];

/* ---------------- 公开洞察：平台生态统计（/agents + /models 实时聚合） ---------------- */
function OverviewTab() {
  const [agents, setAgents] = useState(null);
  const [models, setModels] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/agents?size=100&includeBuilding=1`).then((r) => r.json())
      .then((j) => setAgents(j.data?.records || [])).catch(() => setAgents([]));
    Promise.all([
      fetch(`${API_BASE}/models?category=general&size=50`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/models?category=vertical&size=50`).then((r) => r.json()).catch(() => ({})),
    ]).then(([g, v]) => setModels([...(g.data?.records || []), ...(v.data?.records || [])]))
      .catch(() => setModels([]));
  }, []);

  const st = useMemo(() => {
    const list = agents || [];
    const online = list.filter((a) => a.isBuilding !== 1);
    const building = list.filter((a) => a.isBuilding === 1);
    const visits = list.reduce((s, a) => s + (a.visitCount || 0), 0);
    const catMap = new Map();
    list.forEach((a) => {
      const c = catMap.get(a.categoryName) || { n: 0, v: 0 };
      c.n += 1; c.v += a.visitCount || 0;
      catMap.set(a.categoryName, c);
    });
    const cats = [...catMap.entries()].sort((x, y) => y[1].n - x[1].n);
    const top = [...online].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)).slice(0, 10);
    const rec = list.filter((a) => a.isRecommended === 1).length;

    const ms = models || [];
    const local = ms.filter((m) => (m.tags || []).includes('本地部署'));
    const free = ms.filter((m) => (m.tags || []).includes('校园免费'));
    const provMap = new Map();
    ms.forEach((m) => provMap.set(m.provider, (provMap.get(m.provider) || 0) + 1));
    const provs = [...provMap.entries()].sort((x, y) => y[1] - x[1]);
    const typeMap = new Map();
    ms.forEach((m) => typeMap.set(m.type, (typeMap.get(m.type) || 0) + 1));
    const types = [...typeMap.entries()].sort((x, y) => y[1] - x[1]);
    const generalN = ms.filter((m) => m.category === 'general').length;

    const kb = online.filter((a) => a.categoryName === '制度建设')
      .map((a) => [String(a.name || '').replace(/制度智能体$/, ''), a.visitCount || 0])
      .sort((x, y) => y[1] - x[1]);
    const kbVisits = kb.reduce((s, [, v]) => s + v, 0);

    return { list, online, building, visits, cats, top, rec, ms, local, free, provs, types, generalN, kb, kbVisits };
  }, [agents, models]);

  if (agents === null || models === null) {
    return <div style={{ padding: '60px 0' }}><XixiLoading text="AI加载数据中" /></div>;
  }

  const maxTrend = Math.max(...OV.trend.map((x) => x[1]));
  const maxTop = Math.max(1, ...st.top.map((a) => a.visitCount || 0));
  const maxCat = Math.max(1, ...st.cats.map(([, c]) => c.n));
  const maxProv = Math.max(1, ...st.provs.map(([, v]) => v));
  const maxType = Math.max(1, ...st.types.map(([, v]) => v));
  const maxKb = Math.max(1, ...st.kb.map(([, v]) => v));
  const fmt = (n) => (n || 0).toLocaleString();
  const pct = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '0%');
  const subT = { fontSize: 12.5, fontWeight: 600, color: 'var(--p-t2)', margin: '10px 0 2px' };

  return (<>
        {/* KPI 行 */}
        <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { lb: '在校生', vl: '15,103', cmp: '学籍口径 · 数据日期 11-18', bar: 'var(--el-primary)' },
            { lb: '今日智能体对话', vl: '2,580', cmp: '覆盖 11 个学院锡锡导员', bar: 'var(--p-secondary)' },
            { lb: '智能体广场', vl: `${fmt(st.list.length)}<small>个</small>`, cmp: `已上线 ${st.online.length} · 建设中 ${st.building.length} · 累计访问 ${fmt(st.visits)} 次`, bar: '#8B5CF6', html: true },
            { lb: '平台模型', vl: `${fmt(st.ms.length)}<small>个</small>`, cmp: `本地部署 ${st.local.length} · 云端合作 ${st.ms.length - st.local.length} · 校园免费 ${st.free.length}`, bar: 'var(--p-success)', html: true },
          ].map((k) => (
            <div key={k.lb} className="v2-kpi">
              <span className="bar" style={{ background: k.bar }} />
              <div className="lb">{k.lb}</div>
              {k.html
                ? <div className="vl" dangerouslySetInnerHTML={{ __html: k.vl }} />
                : <div className="vl">{k.vl}</div>}
              <div className="cmp">{k.cmp}</div>
            </div>
          ))}
        </div>

        {/* 图表三连：趋势 / 场景占比 / 模型画像 */}
        <div className="v2-ov-grid">
          <div className="v2-card">
            <div className="ct">近 7 日对话趋势</div>
            <div className="cs">柱=当日对话量 · 折线=走向</div>
            <ComboTrendChart data={OV.trend} />
          </div>
          <div className="v2-card">
            <div className="ct">对话场景分布</div>
            <div className="cs">按智能体分类聚合</div>
            <DonutChart data={OV.scenes} unit="%" centerLabel="场景占比" />
          </div>
          <div className="v2-card">
            <div className="ct">模型能力画像</div>
            <div className="cs">接入模型类型结构</div>
            <RadarChart data={st.types} />
          </div>
        </div>

        {/* 排行三连：TOP10 / 学院活跃 / 分类 */}
        <div className="v2-ov-grid">
          <div className="v2-card">
            <div className="ct">访问热度 TOP 10</div>
            {st.top.map((a) => (
              <div key={a.id} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 122 }}>{a.name}</span>
                <div className="v2-hbar-track"><div style={{ width: `${((a.visitCount || 0) / maxTop) * 100}%`, background: 'var(--el-primary)' }} /></div>
                <span className="v2-hbar-val">{fmt(a.visitCount)}</span>
              </div>
            ))}
          </div>
          <div className="v2-card">
            <div className="ct">各学院使用活跃度</div>
            <div className="cs">近 30 日访问指数</div>
            <AreaTrendChart data={OV.collegeActivity.map(([n, v]) => [n, v])} />
          </div>
          <div className="v2-card">
            <div className="ct">智能体分类分布</div>
            <div className="cs">共 {st.cats.length} 类</div>
            {st.cats.map(([name, c]) => (
              <div key={name} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 88 }}>{name}</span>
                <div className="v2-hbar-track"><div style={{ width: `${(c.n / maxCat) * 100}%`, background: 'var(--p-secondary)' }} /></div>
                <span className="v2-hbar-val">{c.n} 个 · {pct(c.n, st.list.length)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 运营三连：模型服务 / 制度问答 / 知识库规划 */}
        <div className="v2-ov-grid">
          <div className="v2-card">
            <div className="ct">模型服务构成 <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--p-t4)' }}>· {st.ms.length} 个接入</span></div>
            {[
              ['通用模型', st.generalN, 'var(--el-primary)'],
              ['垂类模型', st.ms.length - st.generalN, 'var(--p-secondary)'],
              ['本地部署（一体机）', st.local.length, 'var(--p-success)'],
              ['云端合作', st.ms.length - st.local.length, '#8B5CF6'],
              ['校园免费', st.free.length, 'var(--p-accent)'],
            ].map(([name, v, c]) => (
              <div key={name} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 108 }}>{name}</span>
                <div className="v2-hbar-track"><div style={{ width: `${(v / maxProv) * 100}%`, background: c }} /></div>
                <span className="v2-hbar-val">{v} 个 · {pct(v, st.ms.length)}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '9px 11px', background: 'var(--el-primary-l9)', borderRadius: 10, fontSize: 11.5, color: 'var(--p-t2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Icon name="chip" size={14} style={{ color: 'var(--el-primary)', flexShrink: 0, marginTop: 1 }} />
              <span>5×NVIDIA L20（240G 显存）本地算力，数据不出校园、免费调用。</span>
            </div>
          </div>
          <div className="v2-card">
            <div className="ct">制度问答热度 <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--p-t4)' }}>· {fmt(st.kbVisits)} 次累计</span></div>
            {st.kb.map(([name, v]) => (
              <div key={name} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 108 }}>{name}</span>
                <div className="v2-hbar-track"><div style={{ width: `${(v / maxKb) * 100}%`, background: 'var(--el-primary)' }} /></div>
                <span className="v2-hbar-val">{fmt(v)}</span>
              </div>
            ))}
          </div>
          <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            <div className="ct">知识库中心</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--p-t4)' }}>建设中</div>
            <div style={{ fontSize: 12.5, color: 'var(--p-t3)', lineHeight: 1.8 }}>
              建成后各部门公开制度库统一汇聚、由部门自维护，支持对话式检索与原文引用；当前制度问答已通过 8 个域智能体先行服务。
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['制度知识域', fmt(st.kb.length)], ['问答智能体', fmt(st.kb.length)]].map(([n, l]) => (
                <div key={n} className="v2-ov-stat" style={{ flex: 1 }}><div className="n">{l}</div><div className="l">{n}</div></div>
              ))}
            </div>
          </div>
        </div>

  </>);
}

/* ================= 频道首页 ================= */
export function InsightHome({ onOpenWorkbench, tab, setTab }) {
  const { user, casLogin } = useV2User();

  return (
    <>
      <div className="v2-body v2-insight-wrap" style={{ maxWidth: 1240, paddingTop: 40 }}>
        <div className="v2-insight-headbar">
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--aink)' }}>AI 数据洞察</h2>
            <p style={{ fontSize: 13, color: 'var(--p-t3)', marginTop: 6, maxWidth: 1080, lineHeight: 1.7 }}>数据驱动的一湖洞察 · 充分运用AI大模型，自动汇聚分析宿管考勤、门禁、消费、学业等全域数据，智能识别异常线索、生成跟进建议 · 全校运行态势与业务分析工作台 · 敏感分析经授权后使用</p>
          </div>
        </div>
        <div className="v2-tabs" style={{ margin: '18px 0 20px' }}>
          <div className={'v2-tab' + (tab === 'overview' ? ' on' : '')} onClick={() => setTab('overview')}>公开洞察</div>
          <div className={'v2-tab' + (tab === 'workbench' ? ' on' : '')} onClick={() => setTab('workbench')}>AI场景分析</div>
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'workbench' && (<>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--aink)', margin: '6px 0 6px' }}>AI场景分析</div>
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

        <div className="v2-notice warn" style={{ marginTop: 18 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
          <span>本页聚合洞察对所有师生开放（仅统计汇总，不涉及个体数据）；业务分析工作台涉及学生个人信息，须使用统一身份认证登录且具备对应业务角色。需要开通请联系信息化与数据服务中心（dcc@wxit.edu.cn）。</span>
        </div>
        </>)}
      </div>
    </>
  );
}

/* ================= 精准资助分析工作台（原型界面，示例数据） ================= */


/* AI数据洞察横幅：锡锡 + 打字机 */
function AiInsightBanner({ k, win }) {
  const msg = useMemo(() => {
    if (!k || k.err) return '正在接入数仓，正在识别红灯（高关注）与黄灯（中关注）线索…';
    const hi = Number(k.hi) || 0, mid = Number(k.mid) || 0;
    const top = '消费信号已完成分析';
    return `${top}：近 ${win} 天共识别红灯（高关注）线索 ${hi} 人、黄灯（中关注）${mid} 人。红灯人群呈"就餐频次达标 + 单顿均价显著低于同学院同年级"特征，建议优先复核；详细信号分解见名单详情。`;
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
        <span className="xab-label"><Icon name="spark" size={11} /> AI数据洞察</span>
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


/* 环形占比图（Donut）：中心放总量，右侧图例 */
function DonutChart({ data, unit = '', centerLabel = '' }) {
  const total = data.reduce((s, x) => s + x[1], 0) || 1;
  const R = 62, C = 2 * Math.PI * R;
  const colors = ['var(--el-primary)', 'var(--p-secondary)', 'var(--p-accent)', 'var(--p-success)', '#8B5CF6', '#94A3B8', '#38BDF8'];
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 16, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" style={{ width: 158, height: 158, flexShrink: 0 }}>
        {data.map((x, i) => {
          const frac = x[1] / total;
          const dash = `${(frac * C).toFixed(1)} ${C}`;
          const off = (-acc * C).toFixed(1);
          acc += frac;
          return (
            <circle key={x[0]} cx="80" cy="80" r={R} fill="none" stroke={colors[i % colors.length]}
              stroke-width="21" stroke-dasharray={dash} stroke-dashoffset={off}
              transform="rotate(-90 80 80)" opacity="0.92">
              <title>{x[0]}：{x[1]}{unit}（{Math.round(frac * 100)}%）</title>
            </circle>
          );
        })}
        <text x="80" y="76" text-anchor="middle" font-size="21" font-weight="700" fill="var(--aink)">{total.toLocaleString()}</text>
        <text x="80" y="93" text-anchor="middle" font-size="9.5" fill="var(--p-t4)">{centerLabel}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 130 }}>
        {data.map((x, i) => (
          <div key={x[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4.5px 0', fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: 'var(--p-t2)', flex: 1 }}>{x[0]}</span>
            <b style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--aink)' }}>{x[1]}{unit}</b>
            <span style={{ color: 'var(--p-t4)', width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round((x[1] / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 雷达图：多维度能力画像 */
function RadarChart({ data, max }) {
  const n = data.length;
  const cx = 130, cy = 112, R = 78;
  const M = max || Math.max(...data.map((x) => x[1])) * 1.15;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / M) * R;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  };
  const ring = (f) => data.map((_, i) => pt(i, M * f)).join(' ');
  return (
    <svg viewBox="0 0 260 224" style={{ width: '100%', maxWidth: 300, margin: '10px auto 0', display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#E3E9F2" stroke-width="1" />
      ))}
      {data.map((x, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <line key={x[0]} x1={cx} y1={cy} x2={(cx + R * Math.cos(a)).toFixed(1)} y2={(cy + R * Math.sin(a)).toFixed(1)} stroke="#EDF1F6" stroke-width="1" />;
      })}
      <polygon points={data.map((x, i) => pt(i, x[1])).join(' ')} fill="var(--el-primary)" opacity="0.16" stroke="var(--el-primary)" stroke-width="2" stroke-linejoin="round" />
      {data.map((x, i) => (
        <circle key={x[0] + 'p'} {...(() => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; const r = (x[1] / M) * R; return { cx: (cx + r * Math.cos(a)).toFixed(1), cy: (cy + r * Math.sin(a)).toFixed(1) }; })()} r="3.2" fill="#fff" stroke="var(--el-primary)" stroke-width="1.8" />
      ))}
      {data.map((x, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (R + 17) * Math.cos(a), ly = cy + (R + 17) * Math.sin(a);
        return (
          <text key={x[0] + 't'} x={lx.toFixed(1)} y={(ly + 3).toFixed(1)} font-size="10" fill="var(--p-t3)"
            text-anchor={Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}>{x[0]} {x[1]}</text>
        );
      })}
    </svg>
  );
}

/* 面积趋势图：渐变填充 + 平滑曲线 */
function AreaTrendChart({ data }) {
  const W = 560, H = 200, padT = 24, padB = 26, padL = 10, padR = 10;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = data.map((x) => x[1]);
  const max = Math.max(...vals) * 1.1, min = Math.min(...vals) * 0.9;
  const n = data.length;
  const xOf = (i) => padL + (iw / (n - 1)) * i;
  const yOf = (v) => padT + ih - ((v - min) / (max - min)) * ih;
  // Catmull-Rom → bezier 平滑
  let d = `M ${xOf(0)} ${yOf(vals[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? [xOf(0), yOf(vals[0])] : [xOf(i - 1), yOf(vals[i - 1])];
    const p1 = [xOf(i), yOf(vals[i])];
    const p2 = [xOf(i + 1), yOf(vals[i + 1])];
    const p3 = i + 2 >= n ? p2 : [xOf(i + 2), yOf(vals[i + 2])];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = d + ` L ${xOf(n - 1).toFixed(1)} ${padT + ih} L ${xOf(0)} ${padT + ih} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 12, display: 'block' }}>
      <defs>
        <linearGradient id="ovAreaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--el-primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--el-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + ih * f} y2={padT + ih * f} stroke="#F1F5F9" stroke-width="1" />
      ))}
      <path d={area} fill="url(#ovAreaG)" />
      <path d={d} fill="none" stroke="var(--el-primary)" stroke-width="2.4" stroke-linecap="round" />
      {data.map((x, i) => (
        <g key={x[0]}>
          <circle cx={xOf(i).toFixed(1)} cy={yOf(x[1]).toFixed(1)} r="3.4" fill="#fff" stroke="var(--el-primary)" stroke-width="1.8">
            <title>{x[0]}：{x[1].toLocaleString()} 次</title>
          </circle>
          <text x={xOf(i).toFixed(1)} y={(H - 8).toFixed(1)} font-size="10" fill="#94A3B8" text-anchor="middle">{x[0].slice(5)}</text>
          {(i === 0 || i === n - 1 || x[1] === Math.max(...vals)) && (
            <text x={xOf(i).toFixed(1)} y={(yOf(x[1]) - 9).toFixed(1)} font-size="10" fill="var(--el-primary)" text-anchor="middle" font-weight="600">{x[1].toLocaleString()}</text>
          )}
        </g>
      ))}
    </svg>
  );
}


/* 模糊骨架屏：数据加载完成前占位（AI横幅仍在上方打字） */
function FundingSkeleton() {
  return (
    <div className="v2-skel">
      <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="v2-kpi"><div className="sk sk-lb" /><div className="sk sk-vl" /><div className="sk sk-cmp" /></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14, marginTop: 16 }}>
        <div className="v2-card"><div className="sk sk-t" /><div style={{ marginTop: 14 }}>{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk sk-bar" />)}</div></div>
        <div className="v2-card"><div className="sk sk-t" /><div style={{ marginTop: 14 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="sk sk-bar" />)}</div></div>
      </div>
      <div className="sk sk-tbl" style={{ marginTop: 16 }} />
    </div>
  );
}

/* 详情弹窗底部：AI数据洞察打字机 + 合规提示（固定高度避免错乱） */
function DetailAiInsight({ detail }) {
  const lvlText = detail.level === 'hi' ? '红灯（高关注）' : detail.level === 'mid' ? '黄灯（中关注）' : '绿灯（观察）';
  const msg = `该生判定为${lvlText}，同学院同年级消费分位 P${Math.round(Number(detail.pct) || 0)}，观察窗就餐 ${detail.meals} 顿、单顿均价 ${Number(detail.price).toFixed(2)} 元。请辅导员/资助岗结合谈心谈话人工复核后按流程处理，请勿直接向学生提及「被系统识别」。`;
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setShown(msg.slice(0, i));
      if (i >= msg.length) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [msg]);
  return (
    <div className="dw-ai-block">
      <div className="dw-ai-head"><img src="./v2-xixi.png" alt="锡锡" className="dw-ai-ava" /><span className="dw-ai-tag">AI数据洞察</span></div>
      <div className="dw-ai-text">{shown}<span className="caret" /></div>
    </div>
  );
}

export function FundingWorkbench({ onBack, toast }) {
  const [win, setWin] = useState(30);
  const [filters, setFilters] = useState({ college: '', grade: '', level: '', q: '' });
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    document.body.classList.toggle('v2-modal-open', !!detail);
    return () => document.body.classList.remove('v2-modal-open');
  }, [detail]);
  const [fdTab, setFdTab] = useState('signal');
  useEffect(() => { setFdTab('signal'); }, [detail]);
  const [k, setK] = useState(null);
  const [colleges, setColleges] = useState(null);
  const [list, setList] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const listFresh = useRef(true);
  const [pageNum, setPageNum] = useState(1);
  const [hist, setHist] = useState(null);
  const histTotal = (hist || []).reduce((a, b) => a + (b.n || 0), 0);

  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const authHeaders = token ? { Authorization: 'Bearer ' + token } : {};

  useEffect(() => {
    setK(null);
    setColleges(null);
    setHist(null);
    listFresh.current = true;
    fetch(`${API_BASE}/insight/funding/overview?windowDays=${win}`, { headers: authHeaders })
      .then((r) => r.json()).then((j) => { if (j.code === 200) setK(j.data); else { setK({ err: j.message }); toast('加载失败：' + (j.message || '')); } }).catch((e) => { setK({ err: e.message }); });
    fetch(`${API_BASE}/insight/funding/colleges?windowDays=${win}`, { headers: authHeaders })
      .then((r) => r.json()).then((j) => setColleges(j.data || [])).catch(() => setColleges([]));
    fetch(`${API_BASE}/insight/funding/histogram?windowDays=${win}`, { headers: authHeaders })
      .then((r) => r.json()).then((j) => setHist(j.data || [])).catch(() => setHist([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win]);

  useEffect(() => {
    // 仅首次/切窗清空显示大 loading；翻页/筛选保留旧表叠加加载态
    setList((prev) => (listFresh.current ? null : prev));
    const p = new URLSearchParams({ windowDays: win, page: pageNum, size: 20 });
    if (filters.level) p.set('level', filters.level);
    if (filters.college) p.set('college', filters.college);
    if (filters.q) p.set('q', filters.q);
    const fresh = listFresh.current;
    listFresh.current = false;
    fetch(`${API_BASE}/insight/funding/students?` + p, { headers: authHeaders })
      .then((r) => r.json()).then((j) => { setList(j.data || { records: [], total: 0 }); setListLoading(false); })
      .catch(() => { setList({ records: [], total: 0 }); setListLoading(false); });
    if (!fresh) setListLoading(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win, filters.level, filters.college, filters.q, pageNum]);

  useEffect(() => { setPageNum(1); }, [win, filters.level, filters.college, filters.q]);

  const rows = ((list && list.records) || []).filter((r) => !filters.grade || r.grade === filters.grade);
  const collegeNames = (colleges || []).map((c) => c.n);

  const maxC = Math.max(1, ...(colleges || []).map((d) => (d.hi || 0) + (d.mid || 0) + (d.watch || 0)));
  const [expOpen, setExpOpen] = useState(false);
  const expMeta = () => [
    '观察窗:近 ' + win + ' 天' + (k && k.range ? '（' + k.range + '）' : ''),
    '导出时间:' + new Date().toLocaleString('zh-CN'),
    '当前筛选:学院=' + (filters.college || '全部') + ' / 档位=' + (filters.level ? LVL[filters.level][0] : '全部') + (filters.q ? ' / 关键词=' + filters.q : ''),
    '说明:本名单为AI数据洞察生成的资助工作线索，不构成困难认定，请结合人工核实后按流程处理',
  ];
  const expHead = () => ['学号', '姓名', '学院', '年级', '档位', '月就餐(顿)', '单顿均价(元)', '月食堂支出(元)', '消费分位'];
  const expRows = () => rows.map((s) => [s.id, s.name, s.college, s.grade, LVL[s.level][0], s.meals, Number(s.price).toFixed(2), s.spend, 'P' + Math.round(Number(s.pct) || 0)]);
  const doExport = (fmt) => {
    setExpOpen(false);
    if (!rows.length) { toast('当前筛选下没有可导出的数据'); return; }
    const args = { title: '精准资助分析 · 线索名单', meta: expMeta(), head: expHead(), rows: expRows(), filename: '精准资助线索名单' };
    (fmt === 'excel' ? exportExcel : exportCsv)(args);
    toast('已导出 ' + rows.length + ' 条（' + (fmt === 'excel' ? 'Excel' : 'CSV') + '）· 正式版将写入审计日志');
  };

  return (
    <>
      <div className="v2-body" style={{ maxWidth: 1560 }}>
        <button className="v2-btn ghost" onClick={onBack} style={{ marginBottom: 12 }}>← 返回数据洞察</button>
        <div className="v2-page-head">
          <div>
            <div className="v2-ph-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              精准资助分析
              <span className="v2-method-tip" tabIndex={0}>
                <Icon name="info" size={15} />
                <span className="v2-method-pop">
                  <b>分析维度</b>
                  基于「暖心饭卡」模式，从一卡通消费行为提取多维信号：
                  <br />· <b>就餐频次</b>——观察窗内食堂就餐次数（达标门槛 ≥40 顿，确保可比性）
                  <br />· <b>消费水平</b>——单顿均价、观察窗食堂总支出
                  <br />· <b>参照基准</b>——同学院、同年级达标人群内的分位排名（PERCENT_RANK，控制院系与年级消费结构差异）
                  <br />· <b>数据范围</b>——食堂/餐厅终端消费（终端字典识别），金额分→元换算
                  <br /><b>红黄绿灯规则</b>
                  <br />· <b>红灯（高关注）</b>：同学院同年级单顿均价分位 <b>P5 以下</b>（最省的 5%），建议优先复核
                  <br />· <b>黄灯（中关注）</b>：分位 <b>P5 – P15</b>，建议纳入观察
                  <br />· <b>绿灯（观察）</b>：分位 <b>P15 – P40</b>，低置信，仅供参考
                  <br /><b>重要提示</b>：结果为AI数据洞察生成的工作线索，不构成困难认定；请务必结合谈心谈话、家庭情况等人工复核。
                </span>
              </span>
            </div>
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

        {k && k.err && <div className="v2-notice warn" style={{ marginTop: 14 }}><span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span><span>加载失败：{k.err}，请刷新重试</span></div>}
        {!k && <FundingSkeleton />}
        {k && !k.err && (<>
        <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          {[
            { lb: '观察窗', vl: `${win}天`, cmp: k.range, bar: 'var(--p-t4)' },
            { lb: '活跃消费人数', vl: (k.active || 0).toLocaleString(), cmp: '数据日期 ' + k.dataDate, bar: 'var(--p-t4)' },
            { lb: '就餐达标人数', vl: (k.eligible || 0).toLocaleString(), cmp: '观察窗内食堂就餐 ≥40 顿', bar: 'var(--p-success)' },
            { lb: '红灯线索', vl: (k.hi || 0).toLocaleString(), cmp: '同学院同年级 P5 以下 · 红灯', bar: 'var(--abad)' },
            { lb: '黄灯线索', vl: (k.mid || 0).toLocaleString(), cmp: 'P5 – P15', bar: '#FBBF24' },
            { lb: '绿灯线索', vl: (k.watch || 0).toLocaleString(), cmp: 'P15 – P40 · 参考', bar: 'var(--p-success)' },
          ].map((x) => (
            <div key={x.lb} className="v2-kpi">
              <span className="bar" style={{ background: x.bar }} />
              <div className="lb">{x.lb}</div>
              <div className="vl">{x.vl}</div>
              <div className="cmp">{x.cmp}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14 }}>
          <div className="v2-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="ct">各学院线索分布</div><div className="cs">同学院同年级基准分位口径 · 红灯/黄灯/绿灯</div></div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--p-t3)' }}>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#E5484D', boxShadow: '0 0 4px #E5484D88', marginRight: 4 }} />红灯（高关注）</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 4px #F59E0B88', marginRight: 4 }} />黄灯（中关注）</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 4px #10B98188', marginRight: 4 }} />绿灯（观察）</span>
              </div>
            </div>
            {(colleges || []).map((d) => (
              <div key={d.n} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 150 }}>{d.n}</span>
                <div className="v2-hbar-track" title={`${d.n}：高${d.hi} / 中${d.mid} / 观察${d.watch}`}>
                  <div style={{ width: `${(d.hi / maxC) * 100}%`, background: '#E5484D' }} />
                  <div style={{ width: `${(d.mid / maxC) * 100}%`, background: '#F59E0B' }} />
                  <div style={{ width: `${(d.watch / maxC) * 100}%`, background: '#10B981' }} />
                </div>
                <span className="v2-hbar-val">{d.hi + d.mid + d.watch} 人</span>
              </div>
            ))}
          </div>
          <div className="v2-card">
            <div className="ct">单顿均价分位分布<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--p-t4)', marginLeft: 8 }}>达标 {histTotal} 人</span></div>
            <div className="cs">每个学生与其同学院同年级同学比较单顿均价 · 越靠左越省 · 红=P5 以下 · 黄=P5–15 · 绿=P15–40</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 150, marginTop: 16 }}>
              {(hist || []).map((b) => {
                const maxN = Math.max(1, ...(hist || []).map((x) => x.n));
                const pct = histTotal ? Math.round((b.n / histTotal) * 100) : 0;
                const color = b.light === 'hi' ? '#E5484D' : b.light === 'mid' ? '#F59E0B' : b.light === 'watch' ? '#10B981' : '#CBD5E1';
                return (
                  <div key={b.bucket} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                    title={`${b.bucket}：${b.n} 人（${pct}%）${b.light ? (b.light === 'hi' ? ' · 红灯' : b.light === 'mid' ? ' · 黄灯' : ' · 绿灯') : ''}`}>
                    <div style={{ fontSize: 8.5, color: b.light ? (b.light === 'hi' ? '#C53030' : b.light === 'mid' ? '#B45309' : '#047857') : 'var(--p-t4)', fontVariantNumeric: 'tabular-nums', marginBottom: 2, whiteSpace: 'nowrap' }}>{pct}%</div>
                    <div style={{ width: '100%', height: `${Math.max(3, (b.n / maxN) * 100)}%`, background: color, opacity: b.light ? 1 : 0.7, borderRadius: 2 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px dashed #F59E0B', margin: '6px 0 0 15%', position: 'relative' }}>
              <span style={{ position: 'absolute', right: 4, top: -16, fontSize: 10, color: '#B45309', fontWeight: 600 }}>黄/绿分界 P15</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--p-t4)', marginTop: 4 }}>
              <span>P0（最省）</span><span>P25</span><span>P50（中位）</span><span>P75</span><span>P100（最高）</span>
            </div>
            <div className="v2-notice warn" style={{ marginTop: 10, fontSize: 11, padding: '7px 11px' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="warn" size={13} /></span>
              <span>读图：柱越靠左表示"吃得越省"。各学院独立计算分位后汇总为全校分布，人数与占比 hover 柱可见；红色区（P0–5）即红灯线索人群。</span>
            </div>
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
            <option value="hi">红灯（高关注）</option><option value="mid">黄灯（中关注）</option><option value="watch">绿灯（观察）</option>
          </select>
          <input className="v2-search" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="搜索学号 / 姓名" />
          <button className="v2-btn ghost" onClick={() => { setFilters({ college: '', grade: '', level: '', q: '' }); toast('筛选已重置'); }}>重置</button>
          <span style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <button className="v2-btn" onClick={() => setExpOpen((v) => !v)} onBlur={() => setTimeout(() => setExpOpen(false), 180)}>⤓ 导出名单 ▾</button>
            {expOpen && (
              <div className="v2-exp-menu" onMouseDown={(e) => e.preventDefault()}>
                <button onMouseDown={() => doExport('excel')}><Icon name="doclog" size={14} /> 导出 Excel（.xls）</button>
                <button onMouseDown={() => doExport('csv')}><Icon name="doclog" size={14} /> 导出 CSV（.csv）</button>
                <div className="hint">导出当前筛选 · 共 {rows.length} 条</div>
              </div>
            )}
          </div>
        </div>
        {!list ? (
          <div className="v2-tbl-wrap"><XixiLoading text="AI分析中…" /></div>
        ) : (
        <div className={'v2-tbl-wrap' + (listLoading ? ' v2-tbl-loading' : '')}>
          {listLoading && <div className="v2-tbl-mask"><span className="bar" /><span className="bar" /><span className="bar" /></div>}
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
                  <td><span className={`v2-light ${s.level}`}><i className="bulb" /><span className="lt">{LVL[s.level][0]}</span></span></td>
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
          <div className="v2-tbl-foot">
            <span>共 {list ? list.total : '…'} 条线索 · 默认按 红 → 黄 → 绿 排序 · 当前筛选：{filters.college || '全部学院'} / {filters.grade || '全部年级'} / {filters.level ? LVL[filters.level][0] : '全部档位'}</span>
            <div className="v2-pager">
              <button disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)}>‹</button>
              <button className={pageNum === 1 ? 'on' : ''} onClick={() => setPageNum(1)}>1</button>
              {list && list.total > 20 && <button className={pageNum === 2 ? 'on' : ''} onClick={() => setPageNum(2)}>2</button>}
              {list && list.total > 40 && <button className={pageNum === 3 ? 'on' : ''} onClick={() => setPageNum(3)}>3</button>}
              {list && list.total > 60 && <span className="v2-pager-more">…</span>}
              {list && list.total > 60 && <button className={pageNum === Math.ceil(list.total / 20) ? 'on' : ''} onClick={() => setPageNum(Math.ceil(list.total / 20))}>{Math.ceil(list.total / 20)}</button>}
              <button disabled={!list || pageNum >= Math.ceil((list.total || 1) / 20)} onClick={() => setPageNum(pageNum + 1)}>›</button>
            </div>
          </div>
        </div>
        )}
        <div className="v2-notice warn" style={{ marginTop: 16 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
          <span>本页结果为<b>AI数据洞察生成的资助工作线索</b>，不构成困难认定。请结合谈心谈话、家庭情况复核后按学校资助流程处理；学生个人信息仅限授权岗位查看，导出操作将记录审计日志。</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--p-t4)', marginTop: 12 }}>数据源：一卡通消费（终端含餐厅/食堂）· 宿管学籍映射 · 只读数仓实时查询 · 观察窗 {k.range}</div>
        </>)}
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
                <span className={`v2-light ${detail.level}`} style={{ fontSize: 12 }}><i className="bulb" /><span className="lt">{LVL[detail.level][0]}</span></span>
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
              <div className="dw-tabs">
                <button className={fdTab === 'signal' ? 'on' : ''} onClick={() => setFdTab('signal')}>信号分解</button>
                <button className={fdTab === 'check' ? 'on' : ''} onClick={() => setFdTab('check')}>排除项核验</button>
              </div>
              {fdTab === 'signal' && (<>
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
              </>)}
              {fdTab === 'check' && (<>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', margin: '12px 0 9px' }}>排除项核验</div>
              {[['观察窗内请假离校 0 天（无「人不在校」干扰）'], ['消费数据覆盖 29 / 30 天（完整性达标）'], ['无大额异常消费（单笔 ≤ 25 元）']].map((t) => (
                <div key={t} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: 'var(--p-t2)', padding: '6px 0' }}>
                  <span style={{ color: 'var(--p-success)', fontWeight: 700 }}>✓</span>{t}
                </div>
              ))}
              </>)}
              <DetailAiInsight detail={detail} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
