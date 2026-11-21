import React, { useState, useEffect, useRef } from 'react';
import { Icon, XixiLoading } from './ui.jsx';
import { exportCsv, exportExcel } from './exportUtil.js';

const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
const LVL = { hi: ['红灯', 'hi'], mid: ['黄灯', 'mid'], watch: ['绿灯', 'watch'] };

/* 场景注册：口径+KPI标签+详情信号文案 */
export const SCENES = {
  safety: {
    title: '学生安全分析',
    sub: '基于宿管考勤的晚归 / 未归寝多频次识别 · 面向学工与保卫条线',
    ic: 'warn',
    bannerDone: (k, w) => `安全信号已完成分析：近 ${w} 天识别红灯（高关注）${k.hi} 人、黄灯（中关注）${k.mid} 人。红灯人群未归寝达 8 次及以上（高频），建议逐一核实去向；绿灯为偶发未归（1–2 次，多数有请假或正当原因）；当前请假在册 ${k.onLeave} 人。`,
    kpis: (k, w) => [
      { lb: '观察窗', vl: `${w}天`, cmp: k.range, bar: 'var(--p-t4)' },
      { lb: '在册住宿人数', vl: (k.active || 0).toLocaleString(), cmp: '数据日期 ' + k.dataDate, bar: 'var(--p-t4)' },
      { lb: '请假在册', vl: (k.onLeave || 0).toLocaleString(), cmp: '当前日期在请假区间内', bar: '#8B5CF6' },
      { lb: '红灯线索', vl: (k.hi || 0).toLocaleString(), cmp: '未归寝 ≥8 次（高频）', bar: '#E5484D' },
      { lb: '黄灯线索', vl: (k.mid || 0).toLocaleString(), cmp: '未归 3–7 次（多次）', bar: '#F59E0B' },
      { lb: '绿灯线索', vl: (k.watch || 0).toLocaleString(), cmp: '未归 1–2 次（偶发，多数有因）', bar: '#10B981' },
    ],
    m1Label: '未归寝(次)', m2Label: '晚归(次)',
    summary: (r) => `未归${r.m1}次${r.m2 > 0 ? ' · 晚归' + r.m2 + '次' : ''}${r.m1 >= 5 ? ' · 高频未归' : r.m1 >= 3 ? ' · 多次未归' : ' · 频繁晚归'}`,
    miniKpis: (r) => [['未归寝', `${r.m1} 次`], ['晚归', `${r.m2} 次`], ['频次合计', r.m1 + r.m2], ['风险档位', LVL[r.level] ? LVL[r.level][0] : '']],
    detailSignals: (r) => [
      ['未归寝次数', `${r.m1} 次`, r.m1 >= 8],
      ['晚归次数（22:30 后）', `${r.m2} 次`, false],
      ['风险组合评分', r.m1 + r.m2 + ' 分（频次合计）', false],
    ],
    methodTip: '分析维度：观察窗内宿管考勤明细（state=6 为未归寝；time≥22:30 为晚归）。红黄绿灯规则：红灯=未归≥8次（高频）；黄灯=未归3–7次（多次）；绿灯=未归1–2次（偶发，多数有请假或正当原因）。注：数仓晚归时间字段（time≥22:30）近30天仅3条记录，晚归信号不可用，口径仅基于未归频次；未归≠违纪，请结合请假记录核验（详情弹窗提供逐日交叉）。',
  },
  academic: {
    title: '学业预警分析',
    sub: '基于成绩数据的挂科门数与平均分识别 · 面向学工与教务条线',
    ic: 'grad',
    bannerDone: (k) => `学业信号已完成分析：${k.range} 识别红灯（高关注）${k.hi} 人、黄灯（中关注）${k.mid} 人。红灯人群挂科达 3 门及以上，建议尽快约谈并制定学业帮扶计划。`,
    kpis: (k) => [
      { lb: '统计学期', vl: (k.dataDate || '').replace(/-1$/, ' 上').replace(/-2$/, ' 下'), cmp: k.range, bar: 'var(--p-t4)' },
      { lb: '有成绩学生', vl: (k.active || 0).toLocaleString(), cmp: '本学期有课程成绩记录', bar: 'var(--p-t4)' },
      { lb: '纳入统计', vl: (k.eligible || 0).toLocaleString(), cmp: '至少 1 门成绩', bar: 'var(--p-t4)' },
      { lb: '红灯预警', vl: (k.hi || 0).toLocaleString(), cmp: '挂科 ≥3 门 · 数仓成绩停更中', bar: '#E5484D' },
      { lb: '黄灯预警', vl: (k.mid || 0).toLocaleString(), cmp: '挂科 2 门', bar: '#F59E0B' },
      { lb: '绿灯关注', vl: (k.watch || 0).toLocaleString(), cmp: '挂科 1 门且均分<65', bar: '#10B981' },
    ],
    m1Label: '挂科(门)', m2Label: '平均分',
    summary: (r) => `挂科${r.m1}门 · 均分${Number(r.m2).toFixed(1)}${r.m1 >= 3 ? ' · 学业风险高' : r.m1 === 2 ? ' · 需关注' : ' · 偏低'}`,
    miniKpis: (r) => [['挂科', `${r.m1} 门`], ['平均分', Number(r.m2).toFixed(1)], ['修读', `${r.score} 门`], ['预警档位', LVL[r.level] ? LVL[r.level][0] : '']],
    detailSignals: (r) => [
      ['挂科门数（成绩<60）', `${r.m1} 门`, r.m1 >= 3],
      ['学期平均分', `${Number(r.m2).toFixed(1)} 分`, Number(r.m2) < 65],
      ['修读课程数', `${r.score} 门`, false],
    ],
    methodTip: '分析维度：最近有完整成绩的学期（数仓成绩 2022-2023-1 后停更，系统自动取最新有数学期），按学生聚合挂科门数（总成绩<60）与平均分。红黄绿灯规则：红灯=挂科≥3门；黄灯=挂科2门；绿灯=挂科1门且平均分<65。数仓成绩数据 2022-2023-1 学期后未再同步，本分析基于最新可用学期；如需最新成绩请推动教务成绩数据接入数仓后自动切换。',
  },
  mental: {
    title: '学生心理健康关怀',
    sub: '消费骤降 + 归寝异常多信号组合识别 · 面向学工与心理中心（仅作关怀参考）',
    ic: 'heart',
    bannerDone: (k) => `关怀信号已完成分析：近 30 天识别红灯（高关注）${k.hi} 人、黄灯（中关注）${k.mid} 人。红灯人群同时出现"食堂消费骤降（≥60%）与未归寝频次高（≥3次）"叠加信号，建议以关怀而非质询的方式接触。`,
    kpis: (k) => [
      { lb: '观察窗', vl: '30天', cmp: k.range, bar: 'var(--p-t4)' },
      { lb: '活跃消费人数', vl: (k.active || 0).toLocaleString(), cmp: '数据日期 ' + k.dataDate, bar: 'var(--p-t4)' },
      { lb: '触发信号人数', vl: (k.eligible || 0).toLocaleString(), cmp: '消费骤降或未归频次异常', bar: 'var(--p-t4)' },
      { lb: '红灯关怀', vl: (k.hi || 0).toLocaleString(), cmp: '消费降≥60% 且 未归≥3', bar: '#E5484D' },
      { lb: '黄灯关注', vl: (k.mid || 0).toLocaleString(), cmp: '消费降≥60%（未归<3）', bar: '#F59E0B' },
      { lb: '绿灯留意', vl: (k.watch || 0).toLocaleString(), cmp: '消费降 40–60%', bar: '#10B981' },
    ],
    m1Label: '消费降幅(%)', m2Label: '未归(次)',
    summary: (r) => `消费降${r.m1}%${r.m2 >= 3 ? ' · 未归' + r.m2 + '次（叠加）' : ''}${r.m1 >= 60 && r.m2 >= 3 ? ' · 多信号' : r.m1 >= 60 ? ' · 单信号' : ' · 轻度'}`,
    miniKpis: (r) => [['消费降幅', `${r.m1}%`], ['未归次数', `${r.m2} 次`], ['组合评分', r.score], ['关怀档位', LVL[r.level] ? LVL[r.level][0] : '']],
    detailSignals: (r) => [
      ['近15天食堂消费降幅', `${r.m1}%（对比前15天）`, r.m1 >= 60],
      ['观察窗未归寝次数', `${r.m2} 次`, r.m2 >= 3],
      ['组合评分', r.score + ' 分（降幅+未归×10）', false],
    ],
    methodTip: '分析维度：前15天 vs 近15天食堂消费对比（降幅≥40% 触发）+ 30天未归寝频次。红黄绿灯规则：红灯=消费降≥60% 且未归≥3次（多信号叠加）；黄灯=消费降≥60%（单信号）；绿灯=消费降40–60%。特别提示：消费变化可能源于减肥、实习、返乡等正常原因，本分析仅作关怀线索，绝不可作为心理问题判断依据，接触方式务必温和。',
  },
};

/* 通用场景工作台（复用资助分析全部交互范式） */
export function SceneWorkbench({ sceneKey, onBack, toast }) {
  const cfg = SCENES[sceneKey];
  const [win, setWin] = useState(30);
  const [k, setK] = useState(null);
  const [colleges, setColleges] = useState(null);
  const [list, setList] = useState(null);
  const [filters, setFilters] = useState({ college: '', grade: '', level: '', q: '' });
  const [pageNum, setPageNum] = useState(1);
  const [detail, setDetail] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const listFresh = useRef(true);
  useEffect(() => {
    document.body.classList.toggle('v2-modal-open', !!detail);
    return () => document.body.classList.remove('v2-modal-open');
  }, [detail]);
  const [detailData, setDetailData] = useState(null);
  const [dwTab, setDwTab] = useState('signal');

  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const authHeaders = token ? { Authorization: 'Bearer ' + token } : {};
  const hasWindow = sceneKey === 'safety';
  const base = `${API_BASE}/insight/scene/${sceneKey}`;

  useEffect(() => {
    setK(null); setColleges(null); listFresh.current = true;
    const qs = hasWindow ? `?windowDays=${win}` : '';
    fetch(base + '/overview' + qs, { headers: authHeaders }).then((r) => r.json())
      .then((j) => { if (j.code === 200) setK(j.data); else setK({ err: j.message }); }).catch((e) => setK({ err: e.message }));
    fetch(base + '/colleges' + qs, { headers: authHeaders }).then((r) => r.json())
      .then((j) => setColleges(j.data || [])).catch(() => setColleges([]));
    // eslint-disable-next-line
  }, [win, sceneKey]);

  useEffect(() => {
    // 仅首次/切场景/切窗清空显示大 loading；翻页/筛选保留旧表叠加加载态
    setList((prev) => (listFresh.current ? null : prev));
    const p = new URLSearchParams({ page: pageNum, size: 20 });
    if (hasWindow) p.set('windowDays', win);
    if (filters.level) p.set('level', filters.level);
    if (filters.college) p.set('college', filters.college);
    if (filters.q) p.set('q', filters.q);
    const fresh = listFresh.current;
    listFresh.current = false;
    fetch(base + '/students?' + p, { headers: authHeaders }).then((r) => r.json())
      .then((j) => { setList(j.data || { records: [], total: 0 }); setListLoading(false); })
      .catch(() => { setList({ records: [], total: 0 }); setListLoading(false); });
    if (!fresh) setListLoading(true);
    // eslint-disable-next-line
  }, [win, sceneKey, filters.level, filters.college, filters.q, pageNum]);
  useEffect(() => { setPageNum(1); }, [win, filters.level, filters.college, filters.q]);

  useEffect(() => { setDwTab('signal'); }, [detail]);
  useEffect(() => {
    if (!detail || (sceneKey !== 'safety' && sceneKey !== 'mental')) { setDetailData(null); return; }
    setDetailData(null);
    const p = new URLSearchParams({ studentId: detail.id });
    if (hasWindow) p.set('windowDays', win);
    fetch(`${API_BASE}/insight/scene/detail?` + p, { headers: authHeaders })
      .then((r) => r.json()).then((j) => setDetailData(j.data)).catch(() => setDetailData(null));
    // eslint-disable-next-line
  }, [detail]);

  const rows = ((list && list.records) || []).filter((r) => !filters.grade || r.grade === filters.grade);
  const collegeNames = (colleges || []).map((c) => c.n);
  const maxC = Math.max(1, ...(colleges || []).map((d) => (d.hi || 0) + (d.mid || 0) + (d.watch || 0)));
  const histTotal = (k && [k.hi, k.mid, k.watch].reduce((a, b) => a + (Number(b) || 0), 0)) || 0;

  const [expOpen, setExpOpen] = useState(false);
  const expMeta = () => {
    const m = [ '导出时间:' + new Date().toLocaleString('zh-CN'),
      '当前筛选:学院=' + (filters.college || '全部') + ' / 档位=' + (filters.level ? LVL[filters.level][0] : '全部') + (filters.q ? ' / 关键词=' + filters.q : '') ];
    if (hasWindow) m.unshift('观察窗:近 ' + win + ' 天' + (k && k.range ? '（' + k.range + '）' : ''));
    else if (k && k.range) m.unshift('统计范围:' + k.range);
    m.push('说明:本名单为AI数据洞察生成的工作线索，不构成任何定性结论，请结合人工核实后按流程处理');
    return m;
  };
  const expHead = () => ['学号', '姓名', '学院', '年级', '档位', cfg.m1Label, cfg.m2Label, '信号摘要'];
  const expRows = () => rows.map((r) => [r.id, r.name, r.college, r.grade,
    LVL[r.level] ? LVL[r.level][0] : r.level,
    sceneKey === 'mental' ? r.m1 + '%' : r.m1,
    sceneKey === 'academic' ? Number(r.m2).toFixed(1) : r.m2,
    cfg.summary(r)]);
  const doExport = (fmt) => {
    setExpOpen(false);
    if (!rows.length) { toast('当前筛选下没有可导出的数据'); return; }
    const args = { title: cfg.title + ' · 线索名单', meta: expMeta(), head: expHead(), rows: expRows(), filename: cfg.title + '_名单' };
    (fmt === 'excel' ? exportExcel : exportCsv)(args);
    toast('已导出 ' + rows.length + ' 条（' + (fmt === 'excel' ? 'Excel' : 'CSV') + '）· 正式版将写入审计日志');
  };

  return (
    <div className="v2-body" style={{ maxWidth: 1560 }}>
      <button className="v2-btn ghost" onClick={onBack} style={{ marginBottom: 12 }}>← 返回数据洞察</button>
      <div className="v2-page-head">
        <div>
          <div className="v2-ph-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {cfg.title}
            <span className="v2-method-tip" tabIndex={0}>
              <Icon name="info" size={15} />
              <span className="v2-method-pop"><b>{cfg.title} · 口径说明</b><br />{cfg.methodTip}</span>
            </span>
          </div>
          <div className="v2-ph-sub">{cfg.sub}</div>
        </div>
        {hasWindow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="v2-fresh-pill">数据截至 {k && k.dataDate ? k.dataDate : '…'}</span>
            <div className="v2-tabs">
              {[14, 30, 60, 90].map((w) => (
                <div key={w} className={`v2-tab${win === w ? ' on' : ''}`} onClick={() => setWin(w)}>近{w}天</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SceneBanner k={k} cfg={cfg} win={win} />

      {k && k.err && <div className="v2-notice warn" style={{ marginTop: 14 }}><span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span><span>加载失败：{k.err}，请刷新重试</span></div>}
      {!k && <FundingSkeletonLike />}
      {k && !k.err && (<>
        <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          {cfg.kpis(k, win).map((x) => (
            <div key={x.lb} className="v2-kpi">
              <span className="bar" style={{ background: x.bar }} />
              <div className="lb">{x.lb}</div><div className="vl">{x.vl}</div><div className="cmp">{x.cmp}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14 }}>
          <div className="v2-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="ct">各学院线索分布</div><div className="cs">红/黄/绿三档人数</div></div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--p-t3)' }}>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#E5484D', boxShadow: '0 0 4px #E5484D88', marginRight: 4 }} />红灯</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 4px #F59E0B88', marginRight: 4 }} />黄灯</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 4px #10B98188', marginRight: 4 }} />绿灯</span>
              </div>
            </div>
            {(colleges || []).map((d) => (
              <div key={d.n} className="v2-hbar-row">
                <span className="v2-hbar-name" style={{ width: 150 }}>{d.n}</span>
                <div className="v2-hbar-track" title={`${d.n}：红${d.hi} / 黄${d.mid} / 绿${d.watch}`}>
                  <div style={{ width: `${(d.hi / maxC) * 100}%`, background: '#E5484D' }} />
                  <div style={{ width: `${(d.mid / maxC) * 100}%`, background: '#F59E0B' }} />
                  <div style={{ width: `${(d.watch / maxC) * 100}%`, background: '#10B981' }} />
                </div>
                <span className="v2-hbar-val">{(d.hi || 0) + (d.mid || 0) + (d.watch || 0)} 人</span>
              </div>
            ))}
          </div>
          <div className="v2-card">
            <div className="ct">三档构成<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--p-t4)', marginLeft: 8 }}>共 {histTotal} 人</span></div>
            <div className="cs">红 → 黄 → 绿 递减关注度</div>
            {[['红灯', k.hi, '#E5484D'], ['黄灯', k.mid, '#F59E0B'], ['绿灯', k.watch, '#10B981']].map(([nm, v, c]) => {
              const pct = histTotal ? Math.round((Number(v) || 0) / histTotal * 100) : 0;
              return (
                <div key={nm} style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--p-t2)' }}>{nm}（{Number(v || 0).toLocaleString()} 人）</span>
                    <span style={{ color: 'var(--p-t4)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 14, borderRadius: 4, background: 'var(--p-fill)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
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
              <th style={{ textAlign: 'right' }}>{cfg.m1Label}</th><th style={{ textAlign: 'right' }}>{cfg.m2Label}</th>
              <th>信号摘要</th><th>操作</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="num">{r.id}</td><td>{r.name}</td><td>{r.college}</td><td>{r.grade}</td>
                  <td><span className={`v2-light ${r.level}`}><i className="bulb" /><span className="lt">{LVL[r.level] ? LVL[r.level][0] : ''}</span></span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{sceneKey === 'mental' ? r.m1 + '%' : r.m1}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{sceneKey === 'academic' ? Number(r.m2).toFixed(1) : r.m2}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--p-t4)' }}>{cfg.summary(r)}</td>
                  <td><button className="v2-link" onClick={() => setDetail(r)}>详情</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="v2-tbl-foot">
            <span>共 {list ? list.total : '…'} 条线索 · 默认按 红 → 黄 → 绿 排序 · 当前筛选：{filters.college || '全部学院'} / {filters.level ? LVL[filters.level][0] : '全部档位'}</span>
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
          <span>本页结果为<b>AI数据洞察生成的{cfg.title}线索</b>，仅供相应授权岗位参考，不构成任何定性结论{sceneKey === 'mental' ? '，更不可作为心理健康问题判断依据' : ''}。请结合实际情况人工核实后按学校相关工作流程处理；学生个人信息严格保密。</span>
        </div>
      </>)}

      {detail && (
        <div className="v2-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="v2-modal" style={{ width: 480 }}>
            <div className="v2-md-head">
              <div className="t">{detail.name} <span style={{ fontWeight: 400, color: 'var(--p-t4)', fontSize: 13 }}>{detail.id} · {detail.college} · {detail.grade}</span></div>
              <button className="v2-md-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="v2-md-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span className={`v2-light ${detail.level}`} style={{ fontSize: 12 }}><i className="bulb" /><span className="lt">{LVL[detail.level] ? LVL[detail.level][0] : ''}</span></span>
                <span style={{ fontSize: 12, color: 'var(--p-t4)' }}>{cfg.title}信号</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 18 }}>
                {cfg.miniKpis(detail).map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--p-fill)', borderRadius: 11, padding: '10px 11px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--p-t3)' }}>{l}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--aink)', marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
              {(sceneKey === 'safety' || sceneKey === 'mental') ? (
                <div className="dw-tabs">
                  <button className={dwTab === 'signal' ? 'on' : ''} onClick={() => setDwTab('signal')}>信号分解</button>
                  <button className={dwTab === 'leave' ? 'on' : ''} onClick={() => setDwTab('leave')}>明细 · 请假核验</button>
                </div>
              ) : null}
              {((sceneKey !== 'safety' && sceneKey !== 'mental') || dwTab === 'signal') && (<>
              <div style={{ fontSize: (sceneKey === 'safety' || sceneKey === 'mental') ? 13 : 13, fontWeight: 600, color: 'var(--aink)', margin: '4px 0 9px' }}>信号分解</div>
              {cfg.detailSignals(detail).map(([nm, v, low]) => (
                <div key={nm} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F6FA', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--p-t2)' }}>{nm}</span>
                  <span style={{ fontWeight: 600, color: low ? 'var(--abad)' : 'var(--aink)' }}>{v}{low ? ' · 显著异常' : ''}</span>
                </div>
              ))}
              </>)}
              {(sceneKey === 'safety' || sceneKey === 'mental') && dwTab === 'leave' && detailData && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', margin: '16px 0 6px' }}>
                    未归寝明细（{detailData.nights.length} 次 · 请假对应 {detailData.matched} 次 / 未请假 {detailData.unmatched} 次）
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--p-line2)', borderRadius: 9, padding: '4px 10px' }}>
                    {detailData.nights.map((n) => (
                      <div key={String(n.date)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F3F6FA', fontSize: 12 }}>
                        <span style={{ color: 'var(--p-t2)' }}>{String(n.date).slice(0, 10)}{n.state !== '6' ? ' · 晚归 ' + String(n.time).slice(0, 5) : ''}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: n.onLeave ? 'var(--p-success)' : 'var(--abad)' }}>{n.onLeave ? '✓ 已请假' : '✗ 未请假'}</span>
                      </div>
                    ))}
                  </div>
                  {detailData.leaves.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--aink)', margin: '10px 0 4px' }}>观察窗内请假记录</div>
                      {detailData.leaves.map((l, i) => (
                        <div key={i} style={{ fontSize: 11.5, color: 'var(--p-t3)', padding: '3px 0', lineHeight: 1.6 }}>
                          · {String(l.start_date).slice(0, 10)} ~ {String(l.end_date).slice(0, 10)}（{l.qjlx}）{l.reason ? '：' + l.reason : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <SceneDetailAI detail={detail} cfg={cfg} detailData={detailData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SceneBanner({ k, cfg, win }) {
  const [shown, setShown] = useState('');
  const msg = !k || k.err ? '正在接入数仓，正在识别红灯（高关注）与黄灯（中关注）线索…' : cfg.bannerDone(k, win);
  useEffect(() => {
    setShown('');
    let i = 0;
    const t = setInterval(() => { i += 2; setShown(msg.slice(0, i)); if (i >= msg.length) clearInterval(t); }, 30);
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

function SceneDetailAI({ detail, cfg, detailData }) {
  const lvlText = detail.level === 'hi' ? '红灯（高关注）' : detail.level === 'mid' ? '黄灯（中关注）' : '绿灯（观察）';
  let leaveNote = '';
  if (detailData && detailData.nights) {
    leaveNote = `经请假交叉核验：${detailData.nights.length} 次未归中 ${detailData.matched} 次有请假对应、${detailData.unmatched} 次未请假，请优先核实未请假日期的去向。`;
  }
  const msg = `该生在${cfg.title}中判定为${lvlText}。${cfg.detailSignals(detail).map(([a, b]) => a + ' ' + b).join('，')}。${leaveNote}请辅导员结合谈心谈话人工核实后按流程处理，注意方式方法。`;
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const t = setInterval(() => { i += 2; setShown(msg.slice(0, i)); if (i >= msg.length) clearInterval(t); }, 25);
    return () => clearInterval(t);
  }, [msg]);
  return (
    <div className="dw-ai-block">
      <div className="dw-ai-head"><img src="data:image/png;base64,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" alt="锡锡" className="dw-ai-ava" /><span className="dw-ai-tag">AI数据洞察</span></div>
      <div className="dw-ai-text">{shown}<span className="caret" /></div>
    </div>
  );
}

function FundingSkeletonLike() {
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
