import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listTemplates, searchTeachers, pageRecords, getRecord, createRecord, updateRecord, deleteRecord, streamUrl, regenUrl } from '../api/form';
import { apiBase } from '../api/request';
import { Icon, XixiLoading } from './ui.jsx';

/* ============ AI教师工作台频道（智能填报首个工作台） ============ */
/* 交互定稿依据 docs/智能填报_原型.html（2026-11-21 用户逐轮打磨版） */

const TYPE_ICON = {
  mine: 'file-text', dep: 'users', pub: 'globe',
};

function AiBanner({ badge, text }) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [text]);
  return (
    <div className="v2t-banner">
      <img className="v2t-banner-xixi" src="./v2-xixi.png" alt="锡锡" />
      <div>
        <div className="v2t-banner-t"><span className="v2t-banner-badge">{badge}</span>锡锡已就绪</div>
        <div className="v2t-banner-txt">{typed}<span className="v2t-cur">|</span></div>
      </div>
    </div>
  );
}

function WarnBar({ children }) {
  return (
    <div className="v2t-warn">
      <Icon name="warn" size={14} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

/* ---------- 频道首页 ---------- */
export function TeacherHome({ user, requireLogin, toast, openWizard, onNav }) {
  const [tab, setTab] = useState('records');
  const [records, setRecords] = useState(null);
  const [recordsErr, setRecordsErr] = useState('');

  const loadRecords = useCallback(() => {
    setRecordsErr('');
    pageRecords({ page: 1, size: 50 }).then((j) => setRecords(j?.records || []))
      .catch((e) => { setRecordsErr(e.message || '加载失败'); setRecords([]); });
  }, []);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const delRec = async (id) => {
    if (!window.confirm('确定删除该填报记录？')) return;
    try { await deleteRecord(id); toast('记录已删除'); loadRecords(); } catch (e) { toast(e.message || '删除失败'); }
  };

  const stTag = (s) => (s === 'done' ? <span className="v2t-tag green">已完成</span>
    : s === 'todo' ? <span className="v2t-tag amber">待补充</span> : <span className="v2t-tag blue">进行中</span>);

  return (
    <div className="v2-body v2t-body">
      <div className="v2t-chan-head">
        <div className="v2t-kicker">TEACHER AI WORKBENCH</div>
        <h1>AI教师工作台</h1>
        <div className="v2t-sub">为教学与管理工作减负 · 数仓数据自动带出、填报材料 AI 起草、按原版式一键导出 · 面向全校教职工</div>
      </div>
      <div className="v2t-dash">
        <AiBanner badge="AI数据填报" text="已接入教职工数仓与预置模板；选择模板开始填报，需要动笔的部分交给锡锡来起草。" />
        <div className="v2t-sec-head"><div className="v2t-sec-t">智能填报工作台<span className="v2t-cnt">1 个可用 · 3 个规划中</span></div></div>
        <div className="v2t-wb-grid">
          <div className="v2t-wb-card" role="button" tabIndex={0}
            onClick={() => { if (!requireLogin('智能填报需要登录后使用')) return; openWizard(); }}>
            <div className="v2t-wb-ic"><Icon name="doclog" size={21} /></div>
            <div className="v2t-wb-t">智能填报</div>
            <div className="v2t-wb-d">年度考核、职称评审等高频表格：数仓字段自动带出，总结类材料 AI 起草，导出保持原版式 Word 文件。仅可为本人填报。</div>
            <div className="v2t-wb-meta"><span className="v2t-tag blue">4 套模板</span><span className="v2t-tag green">可导出 Word</span></div>
            <span className="v2t-go">进入工作台<Icon name="chevR" size={13} /></span>
          </div>
          {[
            { t: '公文写作助手', d: '通知、请示、报告、会议纪要一键起草，按校内公文格式输出。', ic: 'edit' },
            { t: '成绩分析报告', d: '班级成绩分布、不及格预警与试卷难度一页报告，学期末一键生成。', ic: 'chart' },
            { t: '评语批量生成', d: '结合成绩、考勤与活动数据，为全班学生逐一生成学期评语初稿。', ic: 'chat' },
          ].map((c) => (
            <div className="v2t-wb-card dim" key={c.t}>
              <div className="v2t-wb-ic"><Icon name={c.ic} size={21} /></div>
              <div className="v2t-wb-t">{c.t}</div>
              <div className="v2t-wb-d">{c.d}</div>
              <div className="v2t-wb-meta"><span className="v2t-tag grey">规划中</span></div>
            </div>
          ))}
        </div>

        <div className="v2t-sec-head" style={{ marginTop: 4 }}>
          <div className="v2t-sec-t">我的填报记录<span className="v2t-cnt">仅本人可见</span></div>
        </div>
        {!user ? (
          <div className="v2-empty">登录后可查看填报记录</div>
        ) : records === null ? (
          <XixiLoading text="AI加载数据中" />
        ) : recordsErr ? (
          <div className="v2-empty">加载失败：{recordsErr}</div>
        ) : records.length === 0 ? (
          <div className="v2-empty">还没有填报记录，从上方「智能填报」进入</div>
        ) : (
          <div className="v2t-tbl-wrap">
            <table>
              <thead><tr>
                <th>记录</th><th>模板</th><th>填报教师</th><th>进度</th><th>状态</th><th>更新时间</th><th style={{ width: 130 }}>操作</th>
              </tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--aink)', fontWeight: 600 }}>{r.name}</td>
                    <td>{r.templateName}</td><td>{r.teacherName}</td>
                    <td className="num">{r.fillCount} / {r.totalCount}</td>
                    <td>{stTag(r.status)}</td>
                    <td>{r.updatedAt}</td>
                    <td>
                      <span className="v2t-link" onClick={() => { if (!requireLogin()) return; openWizard(r.id); }}>继续填报</span>
                      <span className="v2t-link danger" onClick={() => delRec(r.id)}>删除</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 四步向导 ---------- */
const MATERIAL_IDS = ['matJi', 'matDe', 'matNeng', 'matQin', 'matLian', 'matQt'];
const SUMMARY_KEY = 'summary1';

export function FormWizard({ user, toast, onExit, openRecordId }) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState(null);
  const [tplId, setTplId] = useState(null);
  const [need, setNeed] = useState({});
  const [mats, setMats] = useState({});
  const [record, setRecord] = useState(null);
  const [fields, setFields] = useState([]);
  const [stages, setStages] = useState({});
  const [logLines, setLogLines] = useState([]);
  const [summary, setSummary] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const esRef = useRef(null);
  const logRef = useRef(null);
  const fieldsRef = useRef(null);

  /* 打开已有记录：跳过 1/2/3 步直接进预览 */
  useEffect(() => {
    if (!openRecordId) return;
    getRecord(openRecordId).then((r) => {
      if (!r) { toast('记录不存在'); onExit(); return; }
      setRecord(r);
      setTplId(r.templateId);
      setFields(r.fields || []);
      setSummary((r.fields || []).find((f) => f.key === SUMMARY_KEY)?.val || '');
      setStep(4);
    }).catch((e) => { toast(e.message || '加载记录失败'); onExit(); });
    return () => { if (esRef.current) esRef.current.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRecordId]);

  useEffect(() => {
    listTemplates().then((list) => {
      setTemplates(list);
      const kh = list.find((t) => t.name && t.name.includes('年度考核登记表'));
      if (kh) setTplId(kh.id);
    }).catch((e) => toast('模板加载失败：' + e.message));
  }, [toast]);

  const tpl = (templates || []).find((t) => t.id === tplId) || null;
  const matFields = (tpl?.fields || []).filter((f) => f.src === 'material');
  const needFields = (tpl?.fields || []).filter((f) => f.src === 'need');
  const dbFields = (tpl?.fields || []).filter((f) => f.src === 'db');

  const matStat = (f) => {
    const v = (mats[f.key] || '').trim();
    const required = (f.hint || '').includes('必填');
    if (required) return v ? { cls: 'filled', t: `已填 ${v.length} 字` } : { cls: 'empty', t: '必填' };
    return v ? { cls: 'filled', t: `已填 ${v.length} 字` } : { cls: 'opt', t: '选填' };
  };

  const startFill = async () => {
    const ji = matFields.find((f) => (f.hint || '').includes('必填'));
    if (ji && !(mats[ji.key] || '').trim()) { toast(`「${ji.label}」为必填素材，请至少提供一条`); return; }
    try {
      const allFields = (tpl.fields || []).map((f) => ({
        ...f, val: f.src === 'material' ? (mats[f.key] || '') : f.src === 'need' ? (need[f.label] || '') : '',
      }));
      const rid = await createRecord({ templateId: tplId, fields: allFields });
      const rj = await getRecord(rid);
      setRecord(rj);
      setStep(3);
      runStream(rid);
    } catch (e) { toast(e.message || '创建记录失败'); }
  };

  const runStream = (rid) => {
    setStreaming(true); setLogLines([]); setStages({}); setFields([]); setSummary('');
    const es = new EventSource(streamUrl(rid));
    esRef.current = es;
    const cur = { fields: [], summary: '' };
    es.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      if (d.type === 'start') setLogLines((L) => [...L, { k: 'SYSTEM', v: `流水线就绪 · 共 ${d.total} 项字段`, sys: true }]);
      if (d.type === 'stage') setStages((s) => ({ ...s, [d.stage]: { state: d.state, text: d.text } }));
      if (d.type === 'field') { cur.fields[d.index] = d; setFields([...cur.fields]); pushLog(d.label, d.src === 'need' ? (d.val ? '按手动确认填写' : '待手动确认') : d.val ? `已带出：${d.val}` : '待填'); }
      if (d.type === 'nstart') pushLog(d.label, 'AI 正在起草…');
      if (d.type === 'delta' && d.index !== undefined) {
        const f = cur.fields[d.index];
        if (f && f.key === SUMMARY_KEY) { cur.summary += d.chunk; setSummary(cur.summary); }
        else if (f) { f.val = (f.val || '') + d.chunk; setFields([...cur.fields]); }
      }
      if (d.type === 'nend' && d.index !== undefined) { const f = cur.fields[d.index]; if (f) { f.val = d.val; setFields([...cur.fields]); } }
      if (d.type === 'done') {
        es.close(); setStreaming(false);
        getRecord(rid).then((rec) => { setRecord(rec); setFields(rec.fields || []); setSummary((rec.fields || []).find((f) => f.key === SUMMARY_KEY)?.val || ''); setStep(4); }).catch(() => setStep(4));
      }
      if (d.type === 'error') { es.close(); setStreaming(false); toast(d.message || '流水线异常'); }
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    };
    es.onerror = () => { es.close(); setStreaming(false); };
  };

  const pushLog = (k, v, amb) => {
    const d = new Date();
    const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => `0${x}`.slice(-2)).join(':');
    setLogLines((L) => [...L, { k, v, amb, ts }]);
  };

  const saveSummary = async () => {
    if (!record) return;
    const fs = fields.map((f) => (f.key === SUMMARY_KEY ? { ...f, val: summary } : f));
    try { await updateRecord(record.id, { fields: fs }); toast('已保存'); } catch (e) { toast(e.message || '保存失败'); }
  };
  const polish = () => {
    if (!record || streaming) return;
    // 保存当前内容后单字段重新起草（AI润色语义：按现有内容+素材重写）
    const idx = fields.findIndex((f) => f.key === SUMMARY_KEY);
    if (idx < 0) return;
    const es = new EventSource(regenUrl(record.id, idx));
    esRef.current = es;
    setStreaming(true);
    let acc = '';
    es.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      if (d.type === 'delta') { acc += d.chunk; setSummary(acc); }
      if (d.type === 'done') {
        es.close(); setStreaming(false);
        const fs = fields.map((f) => (f.key === SUMMARY_KEY ? { ...f, val: acc } : f));
        setFields(fs); updateRecord(record.id, { fields: fs }).catch(() => {});
        toast('AI润色完成 · 请核对');
      }
      if (d.type === 'error') { es.close(); setStreaming(false); toast(d.message || '润色失败'); }
    };
    es.onerror = () => { es.close(); setStreaming(false); };
  };
  const doExport = () => {
    if (!record) return;
    setExporting(true);
    const token = localStorage.getItem('user_token') || '';
    fetch(`${apiBase}/form/records/${record.id}/export?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.msg || '导出失败'); }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${record.name || '年度考核登记表'}.docx`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast('已导出 Word · 意见与签章区留白线下签署');
        if (fieldsRef.current) fieldsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch((e) => toast(e.message))
      .finally(() => setExporting(false));
  };

  const stepper = (
    <div className="v2t-stepper">
      {[['选择模板', '确定填报表格'], ['确认信息 · 填素材', '登录自动带出 + 工作要点'], ['AI 智能填报', '直填字段 · 起草总结'], ['预览 · 导出', '核对编辑 · 下载文件']].map((s, i) => (
        <React.Fragment key={s[0]}>
          {i > 0 && <div className={`v2t-st-line${step > i ? ' done' : ''}`} />}
          <div className={`v2t-st${step === i + 1 ? ' live' : step > i + 1 ? ' done' : ''}`}>
            <div className="dot">{i + 1}</div>
            <div><div className="s-lb">{s[0]}</div><div className="s-sub">{s[1]}</div></div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="v2-body v2t-body">
      <a className="v2t-back" onClick={onExit} role="button" tabIndex={0}>
        <Icon name="back" size={14} />返回频道
      </a>
      <div className="v2t-wiz-title">智能填报<span className="chip-tpl">{tpl?.name || '年度考核登记表'}</span></div>
      {stepper}

      {/* 步骤 1：选模板 */}
      {step === 1 && (
        <div>
          {!templates ? <XixiLoading text="AI加载数据中" /> : (
            <div className="v2t-tpl-grid">
              {templates.map((t) => (
                <div key={t.id} className={`v2t-tpl-card${tplId === t.id ? ' sel' : ''}`}
                  onClick={() => setTplId(t.id)} role="button" tabIndex={0}>
                  <div className="t-check">{tplId === t.id && <Icon name="check" size={11} />}</div>
                  <div className="t-ic"><Icon name="doclog" size={19} /></div>
                  <div className="t-name">{t.name}</div>
                  <div className="t-desc">{t.description}</div>
                  <div className="t-meta">
                    {t.hasFile && <span className="v2t-tag green">可导出 Word</span>}
                    {t.source === 'preset' && t.hasFile && <span className="v2t-tag blue">实模板</span>}
                    <span className="v2t-tag grey">{t.fieldCount} 项字段</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="v2t-actions">
            <div className="v2t-hint"><Icon name="info" size={13} />带「可导出 Word」标记的模板已内置原版式文件，导出保持官方表格样式</div>
            <button className="v2-btn primary" onClick={() => setStep(2)}>下一步：确认信息 · 填素材<Icon name="chevR" size={13} /></button>
          </div>
        </div>
      )}

      {/* 步骤 2：确认信息 + 素材 */}
      {step === 2 && (
        <div className="v2t-s2-grid">
          <div>
            <div className="v2t-card">
              <div className="lbl req">填报教师</div>
              <div className="v2t-self-card">
                <div className="sf-ava">{(user?.nickname || user?.username || '师').slice(0, 1)}</div>
                <div className="sf-body">
                  <div className="sf-nm">{user?.nickname || user?.username}<span className="v2t-tag blue" style={{ marginLeft: 8 }}>登录身份</span></div>
                  <div className="sf-sub">工号 {user?.username} · 统一身份认证自动带出</div>
                </div>
                <span className="v2t-tag green">仅可为本人填报</span>
              </div>
              <div className="v2t-tp-grid">
                {dbFields.map((f) => (
                  <div className="tp-item" key={f.label}>
                    <div className="l"><span>{f.label}</span><span className="mini-tag db">数仓</span></div>
                    <div className="v">AI 填报时自动带出</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="v2t-card" style={{ marginTop: 16 }}>
              <div className="lbl">需手动确认</div>
              <div className="v2t-manual-grid">
                {needFields.map((f) => (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, color: 'var(--p-t4)', marginBottom: 4 }}>{f.label}</div>
                    {f.label === '政治面貌' ? (
                      <select className="v2t-inp" value={need[f.label] || '党员'} onChange={(e) => setNeed({ ...need, [f.label]: e.target.value })}>
                        {['党员', '群众', '民主党派'].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.label === '岗位类别' ? (
                      <select className="v2t-inp" value={need[f.label] || '专业技术'} onChange={(e) => setNeed({ ...need, [f.label]: e.target.value })}>
                        {['专业技术', '管理', '工勤'].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="v2t-inp" value={need[f.label] || ''} placeholder={f.hint || '请填写'} onChange={(e) => setNeed({ ...need, [f.label]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--p-t4)', marginTop: 9 }}>数仓暂未采集以上项，请按实际任职情况确认</div>
            </div>
          </div>
          <div>
            <div className="v2t-card">
              <div className="v2t-sec-t" style={{ marginBottom: 4 }}>本人总结素材<span className="v2t-cnt">供 AI 起草「本 人 总 结」使用</span></div>
              <div style={{ fontSize: 12, color: 'var(--p-t3)', marginBottom: 13 }}>按"德、能、勤、绩、廉"框架分节提供要点，点击节标题展开填写；AI 只使用您给出的素材与数仓事实，不编造内容。</div>
              <div className="v2t-mat-grid">
                {matFields.map((f) => {
                  const st = matStat(f);
                  const required = (f.hint || '').includes('必填');
                  return (
                    <div key={f.key} className={`v2t-mat${required ? ' req-mat open' : ' ' + (mats[f.key] ? ' open' : '')}`} id={`wrap-${f.key}`}>
                      <div className="m-head" onClick={(e) => e.currentTarget.parentElement.classList.toggle('open')} role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.parentElement.classList.toggle('open'); } }}>
                        <div className="m-badge">{f.label.slice(0, 1)}</div>
                        <div className="m-tt"><div className="m-t">{f.label}{required && <span style={{ color: 'var(--p-danger)' }}> *</span>}</div><div className="m-hint">{f.hint}</div></div>
                        <span className="m-state" style={st.cls === 'filled' ? { color: '#0B7A4B', background: '#E2F5EC' } : st.cls === 'empty' ? { color: '#B45309', background: '#FEF3C7' } : { color: 'var(--p-t3)', background: 'var(--p-fill)' }}>{st.t}</span>
                        <span className="m-arr"><Icon name="chevD" size={15} /></span>
                      </div>
                      <div className="m-body">
                        <textarea className="v2t-inp-ta" value={mats[f.key] || ''} placeholder="每行一条要点"
                          onChange={(e) => setMats({ ...mats, [f.key]: e.target.value })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <WarnBar>AI 起草的总结仅基于以上素材与数仓事实，未提供的部分将以通用表述带过；生成后请逐句核对再导出。个人信息仅用于本次填报，不做留存共享。</WarnBar>
            <div className="v2t-actions" style={{ marginTop: 14 }}>
              <button className="v2-btn ghost" onClick={() => setStep(1)}><Icon name="back" size={13} />上一步</button>
              <button className="v2-btn primary" onClick={startFill}>开始 AI 填报<Icon name="spark" size={13} /></button>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：AI 填报流水线 */}
      {step === 3 && (
        <div className="v2t-s2-grid">
          <div className="v2t-card">
            <div className="lbl" style={{ marginBottom: 11 }}>填报进度</div>
            {['parse', 'fetch', 'generate'].map((k, i) => {
              const st = stages[k];
              const names = { parse: '解析模板 · 识别字段与分组', fetch: `检索教职工数仓（${user?.username || ''}）`, generate: '直填字段 · AI 起草本人总结' };
              return (
                <div key={k} className={`v2t-stg${st ? (st.state === 'done' ? ' done' : ' live') : ''}`}>
                  <div className="s-dot">{st?.state === 'done' ? <Icon name="check" size={12} /> : i + 1}</div>
                  <div className="s-tx">{names[k]}</div>
                  <div className="s-st">{st ? (st.state === 'done' ? '完成' : <span><span className="spin" />进行中</span>) : '等待'}</div>
                </div>
              );
            })}
            <div className="v2t-fieldlog" ref={logRef}>
              {logLines.map((l, i) => (
                <div key={i} className={`lg${l.sys ? ' sys' : ''}`}><span className="t">{l.ts}</span><span className="k">{l.k}</span><span className={`v${l.amb ? ' amb' : ''}`}>{l.v}</span></div>
              ))}
            </div>
          </div>
          <div className="v2t-card">
            <div className="pc-t" style={{ marginBottom: 12 }}><span className="v2t-tag ai">AI数据填报生成</span>本人总结正在起草{streaming && <span className="v2t-cur" style={{ marginLeft: 4 }}>|</span>}</div>
            <div className="v2t-doc">
              <div className="d-title">江苏省事业单位工作人员年度考核登记表</div>
              <div className="d-sub">（2025年度）</div>
              <div className="d-unit">单　位：无锡职业技术大学</div>
              <div className="doc-sum-wrap">
                <div className="doc-sum-title">本 人 总 结</div>
                <div className="doc-sum" style={{ minHeight: 260 }}>{summary || '（等待 AI 起草…）'}</div>
                <div className="doc-sign">本人签名：</div>
              </div>
            </div>
            <div className="v2t-doc-note">纸面预览即导出效果 · 意见与签章区保持空白，线下手写签署</div>
          </div>
        </div>
      )}

      {/* 步骤 4：预览编辑 + 导出 */}
      {step === 4 && (
        <div className="v2t-s2-grid">
          <div>
            <div className="v2t-card" ref={fieldsRef}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                <span className="v2t-sec-t" style={{ margin: 0 }}>字段核对</span>
                <span className="v2t-tag blue">{dbFields.length} 项数仓带出 · {needFields.length} 项手动确认</span>
              </div>
              <div className="v2t-pv-fields">
                {fields.filter((f) => f.g === 'g1').map((f) => (
                  <div className="pv-f" key={f.label}>
                    <div className="l"><span>{f.label}</span><span className={`mini-tag ${f.src === 'db' ? 'db' : 'mn'}`}>{f.src === 'db' ? '数仓' : '手动'}</span></div>
                    <input className="v2t-inp" value={f.val || ''} readOnly={f.src === 'db'}
                      onChange={(e) => setFields(fields.map((x) => (x.label === f.label ? { ...x, val: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="v2t-card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                <span className="v2t-sec-t" style={{ margin: 0 }}>本人总结<span className="v2t-cnt">{summary.length} 字</span></span>
                <button className="v2t-regen-btn" onClick={polish} disabled={streaming}>
                  <img className="rg-xixi" src="./v2-xixi.png" alt="锡锡" />{streaming ? '润色中…' : 'AI润色'}
                </button>
              </div>
              <textarea className="v2t-inp-ta sum-ta" value={summary} onChange={(e) => setSummary(e.target.value)} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                <span className="v2t-tag ai">AI数据填报生成 · 请逐句核对</span>
                <button className="v2-btn ghost" style={{ height: 30 }} onClick={saveSummary}>保存修改</button>
              </div>
            </div>
            <WarnBar>导出文件为官方原版式 Word：内容仅写入基本信息与本人总结，主管领导评鉴等意见区保持空白，需线下手写签署。AI 生成内容请核对后使用。</WarnBar>
            <div className="v2t-actions" style={{ marginTop: 14 }}>
              <button className="v2-btn ghost" onClick={() => setStep(2)}><Icon name="back" size={13} />返回修改素材</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="v2-btn ghost" onClick={doExport} disabled={exporting}>
                  <Icon name="download" size={14} />{exporting ? '生成中…' : '导出 Word 文档'}
                </button>
                <button className="v2-btn primary" onClick={onExit}>完成</button>
              </div>
            </div>
          </div>
          <div className="v2t-pv-sticky">
            <div className="v2t-card">
              <div className="pc-head">
                <div className="pc-t">导出预览<span className="v2t-cnt">A4 · 原版式</span></div>
              </div>
              <div className="v2t-doc">
                <div className="d-title">江苏省事业单位工作人员年度考核登记表</div>
                <div className="d-sub">（2025年度）</div>
                <div className="d-unit">单　位：无锡职业技术大学</div>
                <table className="doc-tbl">
                  <tbody>
                    {[['姓名', '性别', '出生年月'], ['民族', '政治面貌', '文化程度'], ['岗位类别', '岗位等级', '岗位名称']].map((row) => (
                      <tr key={row[0]}>
                        {row.map((label) => {
                          const f = fields.find((x) => x.label === label);
                          return <React.Fragment key={label}><td className="lb">{label}</td><td className="vl">{f?.val || ''}</td></React.Fragment>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="doc-sum-wrap">
                  <div className="doc-sum-title">本 人 总 结</div>
                  <div className="doc-sum" style={{ minHeight: 120, whiteSpace: 'pre-wrap' }}>{summary}</div>
                  <div className="doc-sign">本人签名：</div>
                </div>
                <table className="doc-op"><tbody>
                  {['主管领导评鉴意见', '考核委员会（小组）审核意见', '单位负责人意见', '本人意见', '未确定等次或其他情况说明'].map((o) => (
                    <tr key={o}><td className="op-lb">{o}</td><td className="op-bd">（线下签署）</td></tr>
                  ))}
                </tbody></table>
              </div>
              <div className="v2t-doc-note">意见与签章区不参与 AI 填报，导出后线下完成</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 频道容器（按子路由分发） ---------- */
export default function V2Teacher({ user, requireLogin, toast, wizard, onExitWizard, openRecordId, openWizard, onNav }) {
  if (wizard && !user) {
    return (
      <div className="v2-body v2t-body">
        <a className="v2t-back" onClick={() => onNav('teacher')} role="button" tabIndex={0}>
          <Icon name="back" size={14} />返回频道
        </a>
        <div className="v2-empty">智能填报需要登录后使用，请先通过统一身份认证登录</div>
      </div>
    );
  }
  if (wizard) return <FormWizard user={user} toast={toast} onExit={onExitWizard} openRecordId={openRecordId} />;
  return <TeacherHome user={user} requireLogin={requireLogin} toast={toast} openWizard={openWizard} onNav={onNav} />;
}
