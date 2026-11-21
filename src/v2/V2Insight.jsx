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

        {/* 运营三连：模型服务 / 知识库规划 / 制度问答 */}
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
      <div className="xab-avatar"><img src="data:image/png;base64,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" alt="锡锡" /></div>
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
      <div className="dw-ai-head"><img src="data:image/png;base64,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" alt="锡锡" className="dw-ai-ava" /><span className="dw-ai-tag">AI数据洞察</span></div>
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
