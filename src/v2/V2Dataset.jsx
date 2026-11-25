import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon, XixiLoading, Modal, confirmDialog } from './ui.jsx';
import * as api from '../api/dataset';

/* AI 数据工场（一期）：接入 → 清洗 → 标注(LabelStudio) → 数据集版本 → 导出 */
const DEFAULT_STEPS = [['ingest', '数据接入'], ['clean', '清洗'], ['annot', '标注'], ['version', '数据集版本'], ['export', '导出']];
const ALL_RULES = [['trim', '空白裁剪'], ['dedupe', '精确去重'], ['near_dedupe', '近重复去重'], ['mask_id', '身份证脱敏'], ['mask_phone', '手机号脱敏'], ['strip_html', '去 HTML 标签'], ['lower', '转小写']];
const RULE_LABEL = Object.fromEntries(ALL_RULES);

export function DataWorkshop({ toast, user, onNeedLogin, resolved }) {
  const navigate = useNavigate();
  // 环节由后台注册表驱动：停用的环节不展示（开关即生效）
  const STEPS = (() => {
    const ch = (resolved && resolved.byKey && resolved.byKey['dataset'] && resolved.byKey['dataset'].children) || null;
    if (!ch) return DEFAULT_STEPS;
    const known = new Set(DEFAULT_STEPS.map((s) => s[0]));
    const out = ch.filter((c) => known.has(c.key) && c.enabled !== false).map((c) => [c.key, c.label || c.key]);
    return out.length ? out : DEFAULT_STEPS;
  })();
  const location = useLocation();
  const routeId = (location.pathname.match(/^\/dataset\/(\d+)/) || [])[1];
  const cur = routeId ? Number(routeId) : null;    // 路由驱动：#/dataset/{id}
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState(null);
  const [step, setStep] = useState('ingest');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const resRef = useRef(null);

  const loadList = () => { setErr(''); api.listDatasets().then((d) => setList(d || [])).catch((e) => { setErr(e.message || '加载失败'); setList([]); }); };
  useEffect(() => { loadList(); }, []);
  const loadDetail = (id, jump) => { setDetail(null); api.getDataset(id).then((d) => { setDetail(d); if (jump) { const dd = (d && d.dataset) || {}; const p = [(dd.item_count || 0) > 0, (dd.cleaned_count || 0) > 0, (dd.annotated_count || 0) > 0, ((d && d.versions) || []).length > 0]; const i = p.findIndex((x) => !x); setStep(STEPS[i < 0 ? 4 : i][0]); } }).catch((e) => { toast(e.message || '加载失败'); setDetail({ dataset: null }); }); };
  useEffect(() => { if (cur != null) loadDetail(cur, true); }, [cur]);

  if (!user && onNeedLogin) onNeedLogin && onNeedLogin('AI 数据工场需要登录后使用');

  const doCreate = async () => {
    if (!form.name.trim()) { toast('请填写数据集名称'); return; }
    setBusy(true);
    try { const id = await api.createDataset({ name: form.name, description: form.description }); toast('已创建'); setCreateOpen(false); setForm({ name: '', description: '' }); loadList(); navigate('/dataset/' + id); }
    catch (e) { toast(e.message || '创建失败'); } finally { setBusy(false); }
  };
  const doDelete = async (ds) => {
    if (!(await confirmDialog({ title: '删除数据集', text: `确认删除「${ds.name}」及其全部条目/任务/版本？不可恢复。`, okText: '删除', danger: true }))) return;
    try { await api.deleteDataset(ds.id); toast('已删除'); if (cur === ds.id) navigate('/dataset'); loadList(); } catch (e) { toast(e.message || '删除失败'); }
  };

  /* ---------- 列表 ---------- */
  if (cur == null) return (
    <>
      <div className="v2-sec-head kbx-head">
        <div>
          <h2>AI 数据工场</h2>
          <p>接入 → 清洗 → 标注 → 数据集版本 → 导出，为校本 / 垂域模型微调提供数据闭环</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={13} /> 新建数据集</button>
      </div>
      <div className="v2-body">
      <div className="v2-ai-banner" style={{ marginBottom: 16 }}>
        <div className="xab-avatar"><img src="./v2-xixi.png" alt="锡锡" /></div>
        <div className="xab-body"><span className="xab-label">AI数据工场</span><span className="xab-text">支持 CSV / JSON / JSONL / TXT / DOCX / PDF 接入，内置去重与敏感信息脱敏，标注环节由 AI数据工场承载并回填，导出 Alpaca / ShareGPT / JSONL。</span></div>
      </div>
      {err && <div className="v2-empty">{err}</div>}
      {list === null && <XixiLoading text="加载数据集…" />}
      {list && list.length === 0 && <div className="v2-empty">还没有数据集，点击右上角「新建数据集」开始</div>}
      {list && list.length > 0 && (
        <div className="v2-card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['名称', '条目', '已清洗', '已标注', '创建时间', '操作'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--p-t3)', borderBottom: '1.5px solid var(--p-line)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--p-line2)' }}>
                    <a className="v2-link" onClick={() => { navigate('/dataset/' + d.id); setStep('ingest'); }}>{d.name}</a>
                    {d.description ? <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginTop: 2 }}>{d.description}</div> : null}
                  </td>
                  <td style={TD}>{d.item_count ?? 0}</td>
                  <td style={TD}>{d.cleaned_count ?? 0}</td>
                  <td style={TD}>{d.annotated_count ?? 0}</td>
                  <td style={{ ...TD, color: 'var(--p-t4)', fontSize: 12 }}>{String(d.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td style={TD}><button className="v2-link" onClick={() => { navigate('/dataset/' + d.id); setStep('ingest'); }}>进入</button><button className="v2-link danger" style={{ marginLeft: 10 }} onClick={() => doDelete(d)}>删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <Modal title="新建数据集" width={520} onClose={() => setCreateOpen(false)}
          footer={<><button className="v2-btn ghost" onClick={() => setCreateOpen(false)}>取消</button><button className="v2-btn" disabled={busy} onClick={doCreate}>创建</button></>}>
          <div className="v2-fm-row"><span className="v2-fm-label req">名称</span><div className="v2-fm-body"><input className="v2-fm-i" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：校本问答微调集" /></div></div>
          <div className="v2-fm-row"><span className="v2-fm-label">描述</span><div className="v2-fm-body"><input className="v2-fm-i" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="可选" /></div></div>
        </Modal>
      )}
      </div>
    </>
  );

  /* ---------- 详情（五步） ---------- */
  const ds = detail && detail.dataset;
  const dd = ds || {};
  const verCount = ((detail && detail.versions) || []).length;
  const prog = [(dd.item_count || 0) > 0, (dd.cleaned_count || 0) > 0, (dd.annotated_count || 0) > 0, verCount > 0, verCount > 0];
  const stageIdx = [prog[0], prog[1], prog[2], prog[3]].findIndex((x) => !x);
  const stageLabel = stageIdx === -1 ? '已完成，可导出' : STEPS[stageIdx][1];
  const stepIdx = STEPS.findIndex((s) => s[0] === step) + 1;
  const stepper = (
    <div className="v2t-stepper">
      {[['数据接入', '上传 / 数仓入库'], ['清洗', '去重 · 脱敏 · 标准化'], ['标注', 'AI数据工场标注'], ['数据集版本', '快照 · 血缘'], ['导出', 'Alpaca / ShareGPT / JSONL']].map((s, i) => (
        <React.Fragment key={s[0]}>
          {i > 0 && <div className={'v2t-st-line' + (prog[i - 1] ? ' done' : '')} />}
          <div className={'v2t-st' + (stepIdx === i + 1 ? ' live' : prog[i] ? ' done' : '')} onClick={() => setStep(STEPS[i][0])} style={{ cursor: 'pointer' }}>
            <div className="dot">{i + 1}</div>
            <div><div className="s-lb">{s[0]}</div><div className="s-sub">{s[1]}</div></div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  const reload = () => loadDetail(cur);

  return (
    <>
      <div className="v2-sec-head kbx-detail-head" style={{ paddingTop: 16 }}>
        <a className="v2t-back" onClick={() => { navigate('/dataset'); setDetail(null); }} role="button" tabIndex={0}><Icon name="back" size={14} />返回列表</a>
        <h2>{ds ? ds.name : '数据集'}</h2>
        <p>{ds ? `条目 ${ds.item_count ?? 0} · 已清洗 ${ds.cleaned_count ?? 0} · 已标注 ${ds.annotated_count ?? 0}` : ''}</p>
      </div>
      <div className="v2-body">
      {ds && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
          <span className="v2-tag blue" style={{ padding: '3px 10px', ...(stageIdx === -1 ? { background: '#E7F6EC', color: '#1F9254' } : {}) }}>当前阶段：{stageLabel}</span>
          <span style={{ color: 'var(--p-t2)' }}>
            {prog[0] ? '✓' : '○'} 接入 {dd.item_count || 0} 条 ·
            {prog[1] ? ' ✓' : ' ○'} 清洗 {dd.cleaned_count || 0} ·
            {prog[2] ? ' ✓' : ' ○'} 标注 {dd.annotated_count || 0} ·
            {prog[3] ? ' ✓' : ' ○'} 版本 {verCount}
          </span>
        </div>
      )}
      {stepper}
      {ds && (
        <>
          <StepIngest id={cur} step={step} detail={detail} reload={reload} toast={toast} fileRef={fileRef} />
          <StepClean id={cur} step={step} detail={detail} reload={reload} toast={toast} busy={busy} setBusy={setBusy} />
          <StepAnnot id={cur} step={step} detail={detail} reload={reload} toast={toast} resRef={resRef} />
          <StepVersion id={cur} step={step} detail={detail} reload={reload} toast={toast} />
          <StepExport id={cur} step={step} detail={detail} />
        </>
      )}
      {ds && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <button className="v2-btn ghost" disabled={stepIdx <= 1} onClick={() => setStep(STEPS[stepIdx - 2][0])}><Icon name="back" size={13} /> 上一步</button>
          {stepIdx < STEPS.length
            ? <button className="v2-btn primary" onClick={() => setStep(STEPS[stepIdx][0])}>下一步：{STEPS[stepIdx][1]} <Icon name="chevR" size={13} /></button>
            : <span style={{ fontSize: 12.5, color: 'var(--p-t4)' }}>已到最后一步，完成导出即结束</span>}
        </div>
      )}
      </div>
    </>
  );
}
const TD = { padding: '10px 12px', borderBottom: '1px solid var(--p-line2)', fontSize: 13 };

/* ===== 步骤1：接入 ===== */
function StepIngest({ id, step, detail, reload, toast, fileRef }) {
  const [p, setP] = useState(1);
  const [items, setItems] = useState(null);
  useEffect(() => { if (step === 'ingest') api.listItems(id, { page: p, size: 10 }).then(setItems).catch(() => setItems({ records: [], total: 0 })); }, [id, step, p]);
  if (step !== 'ingest') return null;
  const up = async (e) => {
    const f = e.target.files[0]; if (!f) return; e.target.value = '';
    try { const r = await api.uploadFile(id, f); toast(`已解析 ${r.parsed} 条`); reload(); setP(1); } catch (err) { toast(err.message || '上传失败'); }
  };
  return (
    <div className="v2-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 800 }}>数据接入</div><div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 2 }}>支持 CSV / JSON / JSONL / TXT / DOCX / PDF，按行/按条（PDF 每页、DOCX 每段）为样本（单次上限 5 万条）</div></div>
        <input ref={fileRef} type="file" accept=".csv,.json,.jsonl,.txt,.tsv,.docx,.pdf" style={{ display: 'none' }} onChange={up} />
        <button className="v2-btn" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="plus" size={14} /> 上传文件</button>
      </div>
      {items === null ? <XixiLoading text="加载条目…" /> : items.records.length === 0 ? <div className="v2-empty">暂无条目，上传文件后自动解析入库</div> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['#', '状态', '预览'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, color: 'var(--p-t3)', borderBottom: '1.5px solid var(--p-line)' }}>{h}</th>)}</tr></thead>
            <tbody>{items.records.map((r) => (
              <tr key={r.id}><td style={TD}>{r.seq}</td><td style={TD}><span className="v2-tag grey">{r.clean_status === 'cleaned' ? '已清洗' : r.clean_status === 'dropped' ? '已丢弃' : '原始'}</span></td><td style={{ ...TD, color: 'var(--p-t2)' }}>{r.preview}</td></tr>
            ))}</tbody>
          </table>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5, color: 'var(--p-t3)' }}>
            <span>共 {items.total} 条</span>
            <button className="v2-link" disabled={p <= 1} onClick={() => setP(p - 1)}>上一页</button>
            <span>第 {p} 页</span>
            <button className="v2-link" disabled={p * 10 >= items.total} onClick={() => setP(p + 1)}>下一页</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ===== 步骤2：清洗 ===== */
function StepClean({ id, step, detail, reload, toast, busy, setBusy }) {
  const init = detail && detail.rules ? detail.rules.map((r) => r.rule_type) : ['trim', 'dedupe', 'mask_id', 'mask_phone', 'strip_html'];
  const [sel, setSel] = useState(null);
  const [report, setReport] = useState(null);
  const [th, setTh] = useState({ nearDupThreshold: 3, minLen: 6 });
  const cur = sel || init;
  useEffect(() => { setSel(null); setReport(null); }, [id, step]);
  if (step !== 'clean') return null;
  const toggle = (k) => setSel(cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);
  const run = async () => {
    setBusy(true);
    try { const r = await api.runClean(id, cur.map((k) => ({ ruleType: k })), th); setReport(r); toast('清洗完成'); reload(); }
    catch (e) { toast(e.message || '清洗失败'); } finally { setBusy(false); }
  };
  return (
    <div className="v2-card">
      <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>清洗（原始数据保留）</div>
      <div style={{ fontSize: 12, color: 'var(--p-t3)', marginBottom: 12 }}>勾选规则后运行；清洗结果写入「清洗后」字段，原始不删除</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {ALL_RULES.map(([k, lb]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px', borderRadius: 9, border: '1px solid ' + (cur.includes(k) ? 'var(--el-primary)' : 'var(--p-line2)'), background: cur.includes(k) ? 'var(--p-fill)' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={cur.includes(k)} onChange={() => toggle(k)} />{lb}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', margin: '2px 0 14px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--p-t3)' }}>近重复阈值(汉明距离)</span>
          <input className="v2-fm-i" style={{ width: 56 }} type="number" min="0" max="16" value={th.nearDupThreshold} onChange={(e) => setTh({ ...th, nearDupThreshold: e.target.value })} title="越小越严格（0=几乎完全相同才算重复）" />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--p-t3)' }}>近重复生效最小长度</span>
          <input className="v2-fm-i" style={{ width: 56 }} type="number" min="0" value={th.minLen} onChange={(e) => setTh({ ...th, minLen: e.target.value })} title="短于该长度的样本不参与近重复判定，避免误删" />
        </div>
      </div>
      <button className="v2-btn" disabled={busy || cur.length === 0} onClick={run}>{busy ? '清洗中…' : '运行清洗'}</button>
      {report && (
        <div style={{ marginTop: 14 }}>
          <div className="v2-notice blue">本次清洗：共 {report.total} 条 → 保留 {report.cleaned} 条、丢弃 {report.dropped} 条。</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
            <div className="v2-card" style={{ margin: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>分规则命中</div>
              {(report.rules || []).map((r) => (
                <div key={r.rule} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: '1px solid var(--p-line2)' }}>
                  <span style={{ color: 'var(--p-t2)' }}>{RULE_LABEL[r.rule] || r.rule}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: r.hits > 0 ? 'var(--aink)' : 'var(--p-t4)' }}>{r.hits} 条</span>
                </div>
              ))}
            </div>
            <div className="v2-card" style={{ margin: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>清洗后自检</div>
              {(() => { const a = (report.residual || {}).idcard, b = (report.residual || {}).phone, ok = (a + b) === 0; return (
                <>
                  <div style={{ fontSize: 12.5, lineHeight: 1.9, color: ok ? 'var(--p-success)' : '#D14343' }}>
                    PII 残留：身份证 <b>{a ?? '—'}</b> 条 · 手机号 <b>{b ?? '—'}</b> 条 {ok ? '✓ 无残留' : '✗ 存在残留，请检查规则'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginTop: 6, lineHeight: 1.7 }}>自检 = 对清洗后文本再扫一遍身份证 / 手机号正则，命中应为 0；命中&gt;0 说明脱敏规则未覆盖。</div>
                </>
              ); })()}
            </div>
          </div>
          {report.metrics && (
            <div className="v2-card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>质量指标（清洗前 → 清洗后）</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead><tr>{['指标', '清洗前', '清洗后'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--p-t3)', borderBottom: '1.5px solid var(--p-line)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[['样本数', (m) => m.total], ['平均长度(字)', (m) => m.avgLen], ['含 PII 条数', (m) => m.pii], ['重复条数', (m) => m.dup], ['空样本', (m) => m.empty]].map(([lb, f]) => (
                    <tr key={lb}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--p-line2)' }}>{lb}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--p-line2)', color: 'var(--p-t3)' }}>{f(report.metrics.before)}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--p-line2)', color: 'var(--aink)', fontWeight: 600 }}>{f(report.metrics.after)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '6px 8px' }}>长度分布</td>
                    <td style={{ padding: '6px 8px', color: 'var(--p-t3)' }}>{(report.metrics.before.hist || []).join(' / ')}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--p-t3)' }}>{(report.metrics.after.hist || []).join(' / ')}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginTop: 6 }}>长度分布桶：&lt;20 / 20-50 / 50-100 / 100-300 / 300+ 字</div>
            </div>
          )}
          {(report.samples || []).length > 0 && (
            <div className="v2-card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>清洗前后对照（示例 {(report.samples || []).length} 条）</div>
              <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginBottom: 8 }}>被规则改动过的样本，逐条对照原文与清洗后结果</div>
              {(report.samples || []).map((s, i) => (
                <div key={i} style={{ borderBottom: '1px solid var(--p-line2)', padding: '9px 0', fontSize: 12.5 }}>
                  <div style={{ color: 'var(--p-t4)' }}>原文　　<span style={{ color: 'var(--p-t3)' }}>{s.raw}</span></div>
                  <div style={{ color: 'var(--p-t4)', marginTop: 4 }}>清洗后　<span style={{ color: 'var(--p-t1)' }}>{s.clean}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== 步骤3：标注 ===== */
function StepAnnot({ id, step, detail, reload, toast, resRef }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', instruction: '', template: 'text_classification' });
  const [busy, setBusy] = useState(false);
  if (step !== 'annot') return null;
  const tasks = (detail && detail.annotTasks) || [];
  const doCreate = async () => {
    setBusy(true);
    try { await api.createAnnotTask(id, form); toast('标注任务已创建'); setOpen(false); setForm({ name: '', instruction: '', template: 'text_classification' }); reload(); }
    catch (e) { toast(e.message || '创建失败'); } finally { setBusy(false); }
  };
  const doImport = async (e) => {
    const f = e.target.files[0]; if (!f) return; e.target.value = '';
    const tid = e.target.dataset.tid;
    try { const r = await api.importAnnotResult(id, tid, f); toast(`已导入 ${r.imported} 条标注结果`); reload(); } catch (err) { toast(err.message || '导入失败'); }
  };
  const doPush = async (tid) => { try { const r = await api.pushTask(id, tid); toast(`已推送到标注平台（项目 ${r.projectId}，${r.pushed} 条）`); reload(); } catch (e) { toast(e.message || '推送失败'); } };
  const doPull = async (tid) => { try { const r = await api.pullResult(id, tid); toast(`已从平台拉取 ${r.imported} 条标注结果`); reload(); } catch (e) { toast(e.message || '拉取失败'); } };
  return (
    <div className="v2-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 800 }}>标注</div><div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 2 }}>建任务 → 推送到 AI数据工场标注 → 回传结果</div></div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {(detail && detail.labelstudio) ? <a className="btn-primary" href={detail.labelstudio} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="ext" size={13} /> 打开标注平台</a> : null}
          <button className="v2-btn" onClick={() => setOpen(true)}><Icon name="plus" size={14} /> 新建标注任务</button>
        </div>
      </div>
      {tasks.length === 0 ? <div className="v2-empty">暂无标注任务</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['任务', '模板', '总数', '已标注', '状态', '操作'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, color: 'var(--p-t3)', borderBottom: '1.5px solid var(--p-line)' }}>{h}</th>)}</tr></thead>
          <tbody>{tasks.map((t) => (
            <tr key={t.id}>
              <td style={TD}>{t.name || ('任务#' + t.id)}</td>
              <td style={TD}>{t.template === 'text_classification' ? '文本分类' : t.template}</td>
              <td style={TD}>{t.total}</td><td style={TD}>{t.done}</td>
              <td style={TD}><span className="v2-tag grey">{t.status === 'imported' ? '已回传' : t.status === 'exported' ? '已导出' : '待导出'}</span></td>
              <td style={TD}>
                {detail && detail.labelstudioReady ? (
                  <>
                    <button className="v2-link" onClick={() => doPush(t.id)}>推送</button>
                    <button className="v2-link" style={{ marginLeft: 10 }} onClick={() => doPull(t.id)}>拉取</button>
                    <span style={{ color: 'var(--p-line2)', margin: '0 10px' }}>|</span>
                  </>
                ) : null}
                <a className="v2-link" style={{ textDecoration: 'none' }} href={api.exportLsUrl(id, t.id)}>导出标注任务</a>
                <span className="v2-link" style={{ marginLeft: 10, cursor: 'pointer' }}><label style={{ cursor: 'pointer' }}>导入结果<input type="file" accept=".json" style={{ display: 'none' }} data-tid={t.id} onChange={doImport} /></label></span>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {open && (
        <Modal title="新建标注任务" width={560} onClose={() => setOpen(false)}
          footer={<><button className="v2-btn ghost" onClick={() => setOpen(false)}>取消</button><button className="v2-btn" disabled={busy} onClick={doCreate}>创建</button></>}>
          <div className="v2-fm-row"><span className="v2-fm-label req">任务名</span><div className="v2-fm-body"><input className="v2-fm-i" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：问答质量标注" /></div></div>
          <div className="v2-fm-row"><span className="v2-fm-label">模板</span><div className="v2-fm-body"><select className="v2-select" value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })}><option value="text_classification">文本分类</option><option value="qa_quality">问答质量</option><option value="ner">实体标注(NER)</option></select></div></div>
          <div className="v2-fm-row"><span className="v2-fm-label">标注说明</span><div className="v2-fm-body"><input className="v2-fm-i" value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} placeholder="给标注员的说明" /></div></div>
        </Modal>
      )}
    </div>
  );
}

/* ===== 步骤4：版本 ===== */
function StepVersion({ id, step, detail, reload, toast }) {
  const [form, setForm] = useState({ name: '', trainRatio: 80 });
  const [busy, setBusy] = useState(false);
  const [lin, setLin] = useState(null);
  if (step !== 'version') return null;
  const vers = (detail && detail.versions) || [];
  const doCreate = async () => {
    setBusy(true);
    try { const lineage = JSON.stringify({ cleanRules: ((detail && detail.rules) || []).map((r) => ({ rule: r.rule_type, params: r.params })), trainRatio: form.trainRatio, at: new Date().toISOString() }); const r = await api.createVersion(id, { ...form, lineage }); toast(`已创建版本 v${r.version}（${r.item_count} 条）`); setForm({ name: '', trainRatio: 80 }); reload(); }
    catch (e) { toast(e.message || '创建失败'); } finally { setBusy(false); }
  };
  return (
    <div className="v2-card">
      <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>数据集版本</div>
      <div style={{ fontSize: 12, color: 'var(--p-t3)', marginBottom: 12 }}>对当前清洗后的数据集打版本快照并记录血缘（清洗/标注参数）</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="v2-fm-i" style={{ width: 220 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="版本名（可选）" />
        <span style={{ fontSize: 12.5, color: 'var(--p-t3)' }}>训练集比例</span>
        <input className="v2-fm-i" style={{ width: 70 }} type="number" value={form.trainRatio} onChange={(e) => setForm({ ...form, trainRatio: e.target.value })} />
        <span style={{ fontSize: 12.5, color: 'var(--p-t3)' }}>%</span>
        <button className="v2-btn" disabled={busy} onClick={doCreate}>创建版本</button>
      </div>
      {lin && (
        <Modal title={'版本血缘 · v' + lin.version} width={620} onClose={() => setLin(null)}
          footer={<button className="v2-btn" onClick={() => setLin(null)}>关闭</button>}>
          <div style={{ fontSize: 12, color: 'var(--p-t3)', marginBottom: 8 }}>记录该版本生成时的清洗规则 / 参数，用于复现与审计</div>
          <pre style={{ background: 'var(--p-fill)', borderRadius: 10, padding: 14, fontSize: 12, lineHeight: 1.7, maxHeight: 360, overflow: 'auto' }}>
            {(() => { try { return JSON.stringify(JSON.parse(lin.lineage || 'null'), null, 2); } catch { return lin.lineage || '（无血缘记录）'; } })()}
          </pre>
        </Modal>
      )}
      {vers.length === 0 ? <div className="v2-empty">暂无版本</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['版本', '名称', '条目', '训练/验证', '创建时间', '血缘'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, color: 'var(--p-t3)', borderBottom: '1.5px solid var(--p-line)' }}>{h}</th>)}</tr></thead>
          <tbody>{vers.map((v) => (
            <tr key={v.id}><td style={TD}>v{v.version}</td><td style={TD}>{v.name}</td><td style={TD}>{v.item_count}</td><td style={TD}>{v.train_ratio} / {100 - v.train_ratio}</td><td style={{ ...TD, color: 'var(--p-t4)', fontSize: 12 }}>{String(v.created_at || '').slice(0, 16).replace('T', ' ')}</td><td style={TD}><a className="v2-link" onClick={() => setLin(v)}>查看</a></td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

/* ===== 步骤5：导出 ===== */
function StepExport({ id, step, detail }) {
  if (step !== 'export') return null;
  const fmts = [['alpaca', 'Alpaca（JSON）', 'instruction/input/output 指令微调格式'], ['sharegpt', 'ShareGPT（JSON）', '多轮对话格式'], ['jsonl', 'JSONL（一行一条）', '通用微调格式']];
  return (
    <div className="v2-card">
      <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>导出</div>
      <div style={{ fontSize: 12, color: 'var(--p-t3)', marginBottom: 14 }}>导出当前数据集的清洗后数据（不导出去重丢弃项）</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {fmts.map(([k, t, d]) => (
          <div key={k} style={{ border: '1px solid var(--p-line2)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
            <div style={{ fontSize: 12, color: 'var(--p-t3)', margin: '6px 0 12px', lineHeight: 1.7 }}>{d}</div>
            <a className="v2-btn" href={api.exportUrl(id, k)} style={{ display: 'inline-flex', textDecoration: 'none' }}><Icon name="download" size={14} /> 下载</a>
          </div>
        ))}
      </div>
    </div>
  );
}
