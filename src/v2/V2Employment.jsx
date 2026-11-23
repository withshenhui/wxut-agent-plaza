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
            <span className="xab-text">岗位库来自公开校招渠道（江苏 91job 等），每日自动同步；学生通过「智慧就业助手」对话即可获得个性化推荐。</span>
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
