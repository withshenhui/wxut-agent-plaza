import React, { useState, useEffect } from 'react';
import { Icon, XixiLoading } from './ui.jsx';

const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
const LVL = { hi: ['红灯', 'hi'], mid: ['黄灯', 'mid'], watch: ['绿灯', 'watch'] };

/* 场景注册：口径+KPI标签+详情信号文案 */
export const SCENES = {
  safety: {
    title: '学生安全分析',
    sub: '基于宿管考勤的晚归 / 未归寝多频次识别 · 面向学工与保卫条线',
    ic: 'warn',
    bannerDone: (k, w) => `安全信号已完成分析：近 ${w} 天识别红灯（高关注）${k.hi} 人、黄灯（中关注）${k.mid} 人。红灯人群呈"未归寝频次高（≥5 次）或未归+晚归叠加"特征，建议逐一核实去向；当前请假在册 ${k.onLeave} 人。`,
    kpis: (k, w) => [
      { lb: '观察窗', vl: `${w}天`, cmp: k.range, bar: 'var(--p-t4)' },
      { lb: '在册住宿人数', vl: (k.active || 0).toLocaleString(), cmp: '数据日期 ' + k.dataDate, bar: 'var(--p-t4)' },
      { lb: '请假在册', vl: (k.onLeave || 0).toLocaleString(), cmp: '当前日期在请假区间内', bar: '#8B5CF6' },
      { lb: '红灯线索', vl: (k.hi || 0).toLocaleString(), cmp: '未归≥5 或 未归≥3+晚归≥3', bar: '#E5484D' },
      { lb: '黄灯线索', vl: (k.mid || 0).toLocaleString(), cmp: '未归 3–4 次', bar: '#F59E0B' },
      { lb: '绿灯线索', vl: (k.watch || 0).toLocaleString(), cmp: '晚归≥5（未归<3）', bar: '#10B981' },
    ],
    m1Label: '未归寝(次)', m2Label: '晚归(次)',
    summary: (r) => `未归${r.m1}次${r.m2 > 0 ? ' · 晚归' + r.m2 + '次' : ''}${r.m1 >= 5 ? ' · 高频未归' : r.m1 >= 3 ? ' · 多次未归' : ' · 频繁晚归'}`,
    miniKpis: (r) => [['未归寝', `${r.m1} 次`], ['晚归', `${r.m2} 次`], ['频次合计', r.m1 + r.m2], ['风险档位', LVL[r.level] ? LVL[r.level][0] : '']],
    detailSignals: (r) => [
      ['未归寝次数', `${r.m1} 次`, r.m1 >= 5],
      ['晚归次数（22:30 后）', `${r.m2} 次`, r.m1 >= 3 && r.m2 >= 3],
      ['风险组合评分', r.m1 + r.m2 + ' 分（频次合计）', false],
    ],
    methodTip: '分析维度：观察窗内宿管考勤明细（state=6 为未归寝；time≥22:30 为晚归）。红黄绿灯规则：红灯=未归≥5次 或 未归≥3且晚归≥3；黄灯=未归3–4次；绿灯=晚归≥5次且未归<3。注意：未归≠违纪（含请假晚归等），请结合请假记录核实。',
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
      { lb: '红灯预警', vl: (k.hi || 0).toLocaleString(), cmp: '挂科 ≥3 门', bar: '#E5484D' },
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
    methodTip: '分析维度：最近有完整成绩的学期（数仓成绩 2022-2023-1 后停更，系统自动取最新有数学期），按学生聚合挂科门数（总成绩<60）与平均分。红黄绿灯规则：红灯=挂科≥3门；黄灯=挂科2门；绿灯=挂科1门且平均分<65。建议结合教务系统最新成绩核实。',
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

  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const authHeaders = token ? { Authorization: 'Bearer ' + token } : {};
  const hasWindow = sceneKey === 'safety';
  const base = `${API_BASE}/insight/scene/${sceneKey}`;

  useEffect(() => {
    setK(null); setColleges(null);
    const qs = hasWindow ? `?windowDays=${win}` : '';
    fetch(base + '/overview' + qs, { headers: authHeaders }).then((r) => r.json())
      .then((j) => { if (j.code === 200) setK(j.data); else setK({ err: j.message }); }).catch((e) => setK({ err: e.message }));
    fetch(base + '/colleges' + qs, { headers: authHeaders }).then((r) => r.json())
      .then((j) => setColleges(j.data || [])).catch(() => setColleges([]));
    // eslint-disable-next-line
  }, [win, sceneKey]);

  useEffect(() => {
    setList(null);
    const p = new URLSearchParams({ page: pageNum, size: 20 });
    if (hasWindow) p.set('windowDays', win);
    if (filters.level) p.set('level', filters.level);
    if (filters.college) p.set('college', filters.college);
    if (filters.q) p.set('q', filters.q);
    fetch(base + '/students?' + p, { headers: authHeaders }).then((r) => r.json())
      .then((j) => setList(j.data || { records: [], total: 0 })).catch(() => setList({ records: [], total: 0 }));
    // eslint-disable-next-line
  }, [win, sceneKey, filters.level, filters.college, filters.q, pageNum]);
  useEffect(() => { setPageNum(1); }, [win, filters.level, filters.college, filters.q]);

  const rows = ((list && list.records) || []).filter((r) => !filters.grade || r.grade === filters.grade);
  const collegeNames = (colleges || []).map((c) => c.n);
  const maxC = Math.max(1, ...(colleges || []).map((d) => (d.hi || 0) + (d.mid || 0) + (d.watch || 0)));
  const histTotal = (k && [k.hi, k.mid, k.watch].reduce((a, b) => a + (Number(b) || 0), 0)) || 0;

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
          <button className="v2-btn" onClick={() => toast('导出功能即将开放')}>⤓ 导出名单</button>
        </div>

        {!list ? (
          <div className="v2-tbl-wrap"><XixiLoading text="锡锡正在翻阅名单…" sub="数仓查询中" /></div>
        ) : (
        <div className="v2-tbl-wrap">
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
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', margin: '4px 0 9px' }}>信号分解</div>
              {cfg.detailSignals(detail).map(([nm, v, low]) => (
                <div key={nm} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F6FA', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--p-t2)' }}>{nm}</span>
                  <span style={{ fontWeight: 600, color: low ? 'var(--abad)' : 'var(--aink)' }}>{v}{low ? ' · 显著异常' : ''}</span>
                </div>
              ))}
              <SceneDetailAI detail={detail} cfg={cfg} />
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
      <div className="xab-avatar"><img src="./v2-xixi.png" alt="锡锡" /></div>
      <div className="xab-body">
        <span className="xab-label"><Icon name="spark" size={11} /> AI数据洞察</span>
        <div className="xab-text">{shown}<span className="caret" /></div>
      </div>
    </div>
  );
}

function SceneDetailAI({ detail, cfg }) {
  const lvlText = detail.level === 'hi' ? '红灯（高关注）' : detail.level === 'mid' ? '黄灯（中关注）' : '绿灯（观察）';
  const msg = `AI数据洞察：该生在${cfg.title}中判定为${lvlText}。${cfg.detailSignals(detail).map(([a, b]) => a + ' ' + b).join('，')}。请辅导员结合谈心谈话人工核实后按流程处理，注意方式方法。`;
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const t = setInterval(() => { i += 2; setShown(msg.slice(0, i)); if (i >= msg.length) clearInterval(t); }, 25);
    return () => clearInterval(t);
  }, [msg]);
  return (
    <div className="dw-ai-block">
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
