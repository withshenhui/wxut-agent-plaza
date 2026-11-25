import React, { useState, useEffect } from 'react';
import { apiBase } from '../api/request';
import { Icon, XixiLoading } from './ui.jsx';

/** 就业工作台（洞察频道第 5 工作台）：岗位库 / 意向 / 供需对照 / 重点帮扶 */
export function EmploymentWorkbench({ onBack, toast, user, dataScope }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const tk = localStorage.getItem('user_token');
    fetch(`${apiBase}/employment/admin/overview`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} })
      .then((r) => r.json())
      .then((j) => { if (j.code === 200) setData(j.data || {}); else setErr(j.message || '加载失败'); })
      .catch((e) => setErr(e.message || '加载失败'));
  }, []);

  const scopeName = dataScope === 'all' ? '全校数据' : '本院数据';

  const Bar = ({ name, value, max, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '9px 0', fontSize: 12.5 }}>
      <span style={{ width: 108, color: 'var(--p-t2)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      <span style={{ flex: 1, height: 10, background: 'var(--p-fill)', borderRadius: 100, overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', borderRadius: 100, width: Math.max(3, (value / max) * 100) + '%', background: color || 'linear-gradient(90deg,#7C93F9,#4A6CF7)' }} />
      </span>
      <span style={{ width: 52, textAlign: 'right', color: 'var(--p-t3)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );

  const normCity = (c) => (String(c == null ? '' : c).replace(/[\[\]"]/g, '').split(',').filter(Boolean).join('、')) || '未填';
  const cityList = (arr) => (arr || []).filter((x) => x && x.city).slice(0, 8);
  const maxOf = (arr) => Math.max(1, ...(arr || []).map((x) => Number(x.n) || 0));

  return (
    <>
      <div className="v2-sec-head">
        <a className="v2t-back" onClick={onBack} role="button" tabIndex={0}>
          <Icon name="back" size={14} />返回频道
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2>就业工作台</h2>
          <span className="v2-tag blue">{scopeName}</span>
        </div>
        <p>就业意向 · 人岗匹配 · 供需对照 · 重点帮扶 —— 数据范围随账号所属学院</p>
      </div>
      <div className="v2-body">
        <div className="v2-ai-banner" style={{ marginBottom: 16 }}>
          <div className="xab-avatar"><img src="./v2-xixi.png" alt="锡锡" /></div>
          <div className="xab-body">
            <span className="xab-label">AI就业洞察</span>
            <span className="xab-text">岗位库来自多家公开招聘平台，每日自动同步；学生通过「智慧就业助手」对话即可获得个性化推荐。</span>
          </div>
        </div>

        {!data && !err && <XixiLoading text="正在汇总就业数据…" />}
        {err && <div className="v2-empty">{err}</div>}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <div className="v2-card"><div style={{ fontSize: 26, fontWeight: 800 }}>{data.jobTotal ?? 0}</div><div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 3 }}>在库校招岗位</div></div>
              <div className="v2-card"><div style={{ fontSize: 26, fontWeight: 800 }}>{(data.jobByCity || []).length}</div><div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 3 }}>岗位覆盖城市数</div></div>
              <div className="v2-card"><div style={{ fontSize: 26, fontWeight: 800 }}>{data.intentTotal ?? 0}</div><div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 3 }}>已填就业意向（学生）</div></div>
              <div className="v2-card"><div style={{ fontSize: 26, fontWeight: 800 }}>{data.recTotal ?? 0}</div><div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 3 }}>已生成推荐次数</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div className="v2-card">
                <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>岗位供给 · 城市分布</div>
                {cityList(data.jobByCity).length === 0 && <div className="v2-empty" style={{ padding: 18 }}>暂无岗位数据</div>}
                {cityList(data.jobByCity).map((x) => <Bar key={x.city} name={x.city} value={Number(x.n)} max={maxOf(cityList(data.jobByCity))} color="linear-gradient(90deg,#8FD3AE,#1F9254)" />)}
              </div>
              <div className="v2-card">
                <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>学生意向 · 城市分布</div>
                {cityList(data.intentByCity).length === 0 && <div className="v2-empty" style={{ padding: 18, lineHeight: 1.8 }}>暂无学生意向数据——学生使用「智慧就业助手」对话并表达意向后自动汇总</div>}
                {cityList(data.intentByCity).map((x) => <Bar key={x.city} name={normCity(x.city)} value={Number(x.n)} max={maxOf(cityList(data.intentByCity))} />)}
              </div>
            </div>

            <div className="v2-card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>重点帮扶名单</div>
              <div className="v2-empty" style={{ padding: 18, lineHeight: 1.8 }}>
                名单口径：未填意向或匹配分偏低的学生。当前数据积累中——学生使用就业助手后，此处将自动生成需重点关注的名单与建议动作。
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ===== 对话内组件：学生学籍档案卡（登录自动带出，供学生核对） ===== */
export function StudentProfileCard({ profile }) {
  if (!profile || (!profile.name && !profile.major)) return null;
  const rows = [
    ['姓名', profile.name],
    ['学号', profile.studentNo],
    ['学院', profile.college],
    ['专业', profile.major],
    ['年级', profile.grade],
    ['班级', profile.className],
    ['性别', profile.gender],
    ['生源地', profile.origin],
  ].filter((r) => r[1]);
  return (
    <div className="emp-profile">
      <div className="hd">
        <span className="t">我的学籍档案</span>
        <span className="s">登录自动带出 · 仅用于本次岗位匹配</span>
      </div>
      <div className="bd">
        {rows.map(([k, v]) => (
          <div className="it" key={k}><span className="k">{k}</span><span className="v" title={String(v)}>{String(v)}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ===== 对话内组件（智慧就业助手）：意向引导卡 + 岗位卡片（与原型同款） ===== */
export function EmploymentIntentCard({ guide, onSubmit }) {
  const [city, setCity] = useState([]);
  const [type, setType] = useState('全职');
  const [pay, setPay] = useState('不限');
  const tg = (c) => {
    if (c === '不限') { setCity(['不限']); return; }
    const n = city.filter((x) => x !== '不限');
    setCity(n.includes(c) ? n.filter((x) => x !== c) : [...n, c]);
  };
  return (
    <div className="emp-intent">
      <div className="row"><div className="lbl">意向城市（可多选）</div><div className="emp-chips">
        {(guide.cities || []).map((c) => <span key={c} className={'emp-chip' + (city.includes(c) ? ' on' : '')} onClick={() => tg(c)}>{c}</span>)}
      </div></div>
      <div className="row"><div className="lbl">岗位类型</div><div className="emp-chips">
        {(guide.types || []).map((t) => <span key={t} className={'emp-chip' + (type === t ? ' on' : '')} onClick={() => setType(t)}>{t}</span>)}
      </div></div>
      <div className="row"><div className="lbl">期望月薪</div><div className="emp-chips">
        {(guide.pays || []).map((x) => <span key={x} className={'emp-chip' + (pay === x ? ' on' : '')} onClick={() => setPay(x)}>{x}</span>)}
      </div></div>
      <button className="emp-go" onClick={() => {
        const cities = city.length ? city.join('、') : '不限';
        onSubmit({
          city: city.length ? JSON.stringify(city.filter((c) => c !== '不限')) : '',
          jobType: type === '实习' ? 'intern' : (type === '都看' ? 'any' : 'fulltime'),
          salaryExpect: pay === '不限' ? '' : pay,
        }, `意向：城市 ${cities} · ${type} · 期望 ${pay}，帮我推荐合适的岗位`);
      }}>为我生成岗位推荐</button>
    </div>
  );
}

/** 薪资/福利拆分：库里的 salary_text 混有福利文案（如"五险一金，年薪8-12万"）→ 拆出薪资区间，其余作为「待遇」 */
function splitPay(raw) {
  const t = String(raw || '').trim();
  if (!t) return { salary: '面议', benefit: '' };
  const re = /((月薪|年薪|综合|薪资|待遇)?\s*\d+(\.\d+)?\s*[-~至]\s*\d+(\.\d+)?\s*(万|元|k|K|千)?\s*(\/月|\/年|元\/月|元\/年|每月|每年|月|年)?|(月薪|年薪|综合|薪资|待遇)?\s*\d+(\.\d+)?\s*(万|元|k|K|千)\s*(\/月|\/年|元\/月|元\/年|每月|每年|月|年)?)/;
  const m = t.match(re);
  if (!m) return { salary: '面议', benefit: /面议|面谈|详谈|从优/.test(t) ? '' : t };
  const salary = m[0].trim();
  let benefit = t.replace(salary, '').replace(/^[，,、;；\s|]+|[，,、;；\s|]+$/g, '');
  if (benefit && !/[\u4e00-\u9fa5]/.test(benefit)) benefit = '';
  if (/^(月薪|年薪|薪资|待遇|综合)$/.test(benefit)) benefit = '';
  return { salary, benefit };
}

export function EmploymentJobCards({ jobs, onAsk }) {
  const color = (v) => (v >= 85 ? '#1F9254' : v >= 70 ? '#4A6CF7' : v >= 60 ? '#F59E0B' : '#A9B2C0');
  const ring = (v) => {
    const c = color(v || 0); const r = 19; const C = 2 * Math.PI * r; const off = C * (1 - (v || 0) / 100);
    return (
      <div className="emp-score" title={'匹配分 ' + v}>
        <svg width="46" height="46">
          <circle cx="23" cy="23" r={r} fill="none" stroke="#F1F3F9" strokeWidth="5" />
          <circle cx="23" cy="23" r={r} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C.toFixed(1)} strokeDashoffset={off.toFixed(1)} />
        </svg>
        <span className="n" style={{ color: c }}>{v}</span>
      </div>
    );
  };
  return (
    <div className="emp-jobs">
      <div className="emp-jobs-hint">已结合你的<b>专业与就业意向</b>完成匹配，按匹配度为你呈现前 <b>{(jobs || []).length}</b> 条：</div>
      {(jobs || []).map((j, i) => (
        <div className="emp-job" key={j.id != null ? j.id : i}>
          <div className="emp-job-top">
            {ring(j.score)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="emp-job-t">{j.title}</div>
              <div className="emp-job-c">{[j.company, j.city].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="emp-job-pay">
              <div className="v">{splitPay(j.salary_text).salary}</div>
              <div className="k">薪资</div>
            </div>
          </div>
          <div className="emp-job-meta">
            {(() => { const jt = /实习|实训/.test(j.title || '') ? '实习' : '全职'; return <span className={'v2-tag ' + (jt === '实习' ? 'amber' : 'blue')}>{jt}</span>; })()}
            {j.edu_req ? <span className="v2-tag grey">{j.edu_req}</span> : null}
            <span className="v2-tag grey">匹配分 {j.score}</span>
            {j.hire_count ? <span className="v2-tag grey">招 {j.hire_count} 人</span> : null}
          </div>
          {(j.reason || j.gaps) ? (
            <div className="emp-why">
              <div className="w">{j.reason ? <><b>为什么推荐：</b>{j.reason}</> : null}</div>
              <div className="g">{j.gaps ? <><b>可以补的短板：</b>{j.gaps}</> : null}</div>
            </div>
          ) : null}
          {splitPay(j.salary_text).benefit ? (
            <div className="emp-benefit"><b>待遇：</b>{splitPay(j.salary_text).benefit}</div>
          ) : null}
          <div className="emp-src">
            来源：{j.source === '91job' ? '公开招聘平台' : (j.source || '公开校招渠道')}
            {j.url ? <a href={j.url} target="_blank" rel="noreferrer">查看原文</a> : null}
            　信息仅供参考，以招聘单位官方发布为准
          </div>
        </div>
      ))}
      {/* 快捷追问（对齐原型） */}
      {onAsk && (
        <div className="emp-quick">
          <span className="q-lbl">你可以继续问：</span>
          {['第二个岗位要什么技能', '只看实习', '按薪资排序'].map((q) => (
            <span key={q} className="emp-chip" onClick={() => onAsk(q)}>{q}</span>
          ))}
        </div>
      )}
    </div>
  );
}
