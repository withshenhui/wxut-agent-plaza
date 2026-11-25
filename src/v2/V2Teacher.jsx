import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTemplates, searchTeachers, pageRecords, getRecord, createRecord, updateRecord, deleteRecord, streamUrl, regenUrl, aiMaterial, getFormMemory, uploadTemplate } from '../api/form';
import { apiBase } from '../api/request';
import { Icon, XixiLoading, Modal, confirmDialog } from './ui.jsx';

/* ============ AI教师工作台频道（智能填报首个工作台） ============ */
/* 交互定稿依据 docs/智能填报_原型.html（2026-11-21 用户逐轮打磨版） */

const TYPE_ICON = {
  mine: 'file-text', dep: 'users', pub: 'globe',
};

function WarnBar({ children }) {
  return (
    <div className="v2t-warn">
      <Icon name="warn" size={14} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

/* ---------- AI教师工作台 · 能力目录（分类 + 卡片） ----------
   左侧分类筛选；可用卡仅「智能填报」，其余为「规划中」占位（暂无后端）。 */
const WB_CATS = [
  { key: 'form', label: '智能填报' },
  { key: 'teach', label: '教学教研' },
  { key: 'office', label: '公文办公' },
  { key: 'research', label: '科研辅助' },
  { key: 'student', label: '学生工作' },
];
const WB_CARDS = [
  { t: '智能填报', cat: 'form', avail: true, ic: 'doclog',
    d: '年度考核、职称评审等高频表格：数仓字段自动带出，总结类材料 AI 起草，导出保持原版式 Word 文件。仅可为本人填报。',
    tags: [{ c: 'blue', x: '4 套模板' }, { c: 'green', x: '可导出 Word' }] },
  { t: '教案与课件大纲', cat: 'teach', ic: 'book', d: '按课程标准与章节一键生成单元教案、课件大纲，可直接编辑。' },
  { t: '出题组卷', cat: 'teach', ic: 'clipboard', d: '选择/填空/简答/实操批量出题，自动匹配答案、难度分级并组卷。' },
  { t: 'PPT 一键制作', cat: 'teach', ic: 'chart', d: '把大纲要点转成演示文稿，自动套用校模板，导出可编辑文件。' },
  { t: '成绩分析报告', cat: 'teach', ic: 'grad', d: '班级成绩分布、不及格预警与试卷难度一页报告，学期末一键生成。' },
  { t: '公文写作助手', cat: 'office', ic: 'briefcase', d: '通知、请示、报告等一键起草，按校内公文格式输出。' },
  { t: '会议纪要', cat: 'office', ic: 'headset', d: '录音转写并提取要点与待办，一键生成规范会议纪要。' },
  { t: '表格智能清洗合并', cat: 'office', ic: 'wrench', d: '各部门乱格式 Excel 自动统一列名、合并多表并透视汇总。' },
  { t: '批量文档处理', cat: 'office', ic: 'folder', d: 'PDF 拆分/合并/格式转换与关键信息提取，批量处理省时。' },
  { t: '中英文献翻译润色', cat: 'office', ic: 'globe', d: '学术翻译 + 语法润色 + 参考文献格式化，保持术语一致。' },
  { t: '科研申报辅助', cat: 'research', ic: 'flask', d: '申报书/论文结构建议与文献综述提纲，附写作要点。' },
  { t: '评语批量生成', cat: 'student', ic: 'chat', d: '结合成绩、考勤与活动数据，为全班学生逐一生成学期评语初稿。' },
];

/* ---------- 频道首页 ---------- */
export function TeacherHome({ user, requireLogin, toast, openWizard, onNav }) {
  const [tab, setTab] = useState('records');
  const [cat, setCat] = useState('all');
  const [records, setRecords] = useState(null);
  const [recordsErr, setRecordsErr] = useState('');

  const loadRecords = useCallback(() => {
    setRecordsErr('');
    pageRecords({ page: 1, size: 50 }).then((j) => setRecords(j?.records || []))
      .catch((e) => { setRecordsErr(e.message || '加载失败'); setRecords([]); });
  }, []);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const delRec = async (id) => {
    if (!(await confirmDialog({ title: '删除填报记录', text: '确定删除该填报记录？删除后不可恢复。', okText: '删除', danger: true }))) return;
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
        <div className="v2-mdl-layout">
          <aside className="v2-mdl-filter">
            <div className="fh"><span>分类</span></div>
            <div className="fgrp">
              <label className={`fopt${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
                <span className="lb">全部</span><em>{WB_CARDS.length}</em>
              </label>
              {WB_CATS.map((c) => (
                <label key={c.key} className={`fopt${cat === c.key ? ' on' : ''}`} onClick={() => setCat(c.key)}>
                  <span className="lb">{c.label}</span>
                  <em>{WB_CARDS.filter((x) => x.cat === c.key).length}</em>
                </label>
              ))}
            </div>
          </aside>
          <div>
            {WB_CATS.filter((c) => cat === 'all' || c.key === cat).map((c) => {
              const items = WB_CARDS.filter((x) => x.cat === c.key);
              const avail = items.filter((x) => x.avail).length;
              return (
                <div key={c.key}>
                  <div className="v2t-sec-head">
                    <div className="v2t-sec-t">{c.label}
                      <span className="v2t-cnt">{avail} 个可用 · {items.length - avail} 个规划中</span>
                    </div>
                  </div>
                  <div className="v2t-wb-grid">
                    {items.map((x) => (x.avail ? (
                      <div className="v2t-wb-card" role="button" tabIndex={0} key={x.t}
                        onClick={() => { if (!requireLogin('智能填报需要登录后使用')) return; openWizard(); }}>
                        <div className="v2t-wb-ic"><Icon name={x.ic} size={21} /></div>
                        <div className="v2t-wb-t">{x.t}</div>
                        <div className="v2t-wb-d">{x.d}</div>
                        <div className="v2t-wb-meta">{(x.tags || []).map((t, i) => <span key={i} className={`v2t-tag ${t.c}`}>{t.x}</span>)}</div>
                        <span className="v2t-go">进入工作台<Icon name="chevR" size={13} /></span>
                      </div>
                    ) : (
                      <div className="v2t-wb-card dim" key={x.t}>
                        <div className="v2t-wb-ic"><Icon name={x.ic} size={21} /></div>
                        <div className="v2t-wb-t">{x.t}</div>
                        <div className="v2t-wb-d">{x.d}</div>
                        <div className="v2t-wb-meta"><span className="v2t-tag grey">规划中</span></div>
                      </div>
                    )))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="v2t-sec-head" style={{ marginTop: 20 }}>
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
                <th>记录</th><th>模板</th><th>填报教师</th><th>进度</th><th>状态</th><th>创建时间</th><th>更新时间</th><th style={{ width: 130 }}>操作</th>
              </tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--aink)', fontWeight: 600 }}>{r.name}</td>
                    <td>{r.templateName}</td><td>{r.teacherName}</td>
                    <td className="num">{r.fillCount} / {r.totalCount}</td>
                    <td>{stTag(r.status)}</td>
                    <td>{r.createdAt}</td>
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
/** 「需手动确认」中的下拉型字段与其选项（默认取首项，必须与界面显示一致地落库） */
const NEED_SELECT = { '政治面貌': ['党员', '群众', '民主党派'], '岗位类别': ['专业技术', '管理', '工勤'] };
/** 官方原版式文档标题（无映射则直接用模板名） */
const DOC_TITLES = { '年度考核登记表': '江苏省事业单位工作人员年度考核登记表' };
/** 字段分组标题（g1 作为表头块不单列标题） */
const GROUP_TITLES = { g2: '学历与学位', g3: '科研业绩', g4: '教学情况', g5: '年度考核', g6: '述职与规划' };

/* ---------- 纸面预览：按所选模板的字段分组动态渲染（step3 起草中 / step4 导出预览 共用） ---------- */
function PreviewDoc({ tpl, fields, summary, khnf, streaming, withOpinions }) {
  if (!tpl) return null;
  const src = (fields && fields.length) ? fields : (tpl.fields || []);
  // 起草流式阶段 fields 按索引写入可能稀疏（含空洞）→ 必须过滤掉空项，否则读 f.g 抛错
  const vis = src.filter((f) => f && f.g !== 'gm' && f.g !== 'g0' && f.label !== '考核年度');
  const groups = [];
  vis.forEach((f) => {
    const g = f.g || 'g1';
    let grp = groups.find((x) => x.g === g);
    if (!grp) { grp = { g, items: [] }; groups.push(grp); }
    grp.items.push(f);
  });
  const valOf = (f) => (f.key === SUMMARY_KEY && summary) || f.val || '';
  const rows = [];
  groups.forEach((grp) => {
    const isSummaryGrp = grp.items.some((f) => /总\s*结/.test(f.label || ''));
    const title = isSummaryGrp ? '本人总结' : (GROUP_TITLES[grp.g] || '');
    if (title) rows.push({ t: 'head', title });
    let buf = [];
    const flush = () => { if (buf.length) { rows.push({ t: 'pair', items: buf }); buf = []; } };
    grp.items.forEach((f) => {
      if (f.src === 'ai') { flush(); rows.push({ t: 'full', f }); }
      else { buf.push(f); if (buf.length >= 3) flush(); }
    });
    flush();
  });
  return (
    <div className="v2t-doc">
      <div className="d-title">{DOC_TITLES[tpl.name] || tpl.name}</div>
      {tpl.name === '年度考核登记表' && <div className="d-sub">（{khnf ? `${khnf}年度` : '年度分析中'}）</div>}
      <div className="d-unit">单　位：无锡职业技术大学</div>
      <table className="doc-tbl"><tbody>
        {rows.map((r, i) => {
          if (r.t === 'head') return <tr key={i}><td className="grp" colSpan={6}>{r.title}</td></tr>;
          if (r.t === 'full') {
            const f = r.f; const v = valOf(f);
            return <tr key={i}><td className="lb">{f.label}</td><td className="full" colSpan={5}>
              <div className="doc-full">{v || <span className="doc-empty">{streaming ? '锡锡正在起草…' : '（待生成）'}</span>}</div>
            </td></tr>;
          }
          const cells = [];
          r.items.forEach((f) => {
            cells.push(<td className="lb" key={`${f.label}-l`}>{f.label}</td>);
            cells.push(<td className="vl" key={`${f.label}-v`}>{valOf(f)}</td>);
          });
          while (cells.length < 6) { const k = `pad${cells.length}`; cells.push(<td className="lb" key={`${k}l`} />, <td className="vl" key={`${k}v`} />); }
          return <tr key={i}>{cells}</tr>;
        })}
      </tbody></table>
      <div className="doc-sign">本人签名：</div>
      {withOpinions && (
        <table className="doc-op"><tbody>
          {['主管领导评鉴意见', '考核委员会（小组）审核意见', '单位负责人意见', '本人意见', '未确定等次或其他情况说明'].map((o) => (
            <tr key={o}><td className="op-lb">{o}</td><td className="op-bd">（线下签署）</td></tr>
          ))}
        </tbody></table>
      )}
    </div>
  );
}

export function FormWizard({ user, toast, onExit, openRecordId, initialTplId, initialStep }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(initialStep >= 1 && initialStep <= 4 ? initialStep : 1);
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
  const [aiBusy, setAiBusy] = useState('');
  const [askDraft, setAskDraft] = useState(null);   // 该栏目已有内容时，统一弹窗二次确认（替代 window.confirm）
  const [memPrefill, setMemPrefill] = useState({}); // 由「记忆」预填的素材字段（key→true），可一键清除
  const esRef = useRef(null);
  const logRef = useRef(null);
  const fieldsRef = useRef(null);
  const initTplRef = useRef(initialTplId);   // 地址栏带入的模板（仅用于首选定）
  const pfRef = useRef(null);
  const matsRef = useRef({});
  const [parsing, setParsing] = useState(false);
  const [parseRes, setParseRes] = useState(null);
  const [tplUploading, setTplUploading] = useState(false);
  const tplUpRef = useRef(null);

  /** 切换步骤并同步地址栏 #/teacher/form/{模板id}/{步骤}[/记录id]（记录段让刷新/分享可恢复数据） */
  const goStep = (n, tplOverride) => {
    setStep(n);
    const t = tplOverride != null ? tplOverride : tplId;
    try { navigate('/teacher/form/' + (t || 0) + '/' + n + (record && record.id ? '/' + record.id : ''), { replace: true }); } catch (e) { /* noop */ }
  };
  const parseUpload = async (fileList) => {
    const f = fileList && fileList[0];
    if (!f) return;
    if (!record || !record.id) { toast('请先完成填报生成记录后再上传'); return; }
    const lower = (f.name || '').toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.xlsx') && !lower.endsWith('.docx')) { toast('仅支持 PDF / Word / Excel 文件'); return; }
    setParsing(true); setParseRes(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const token = localStorage.getItem('user_token');
      const r = await fetch(`${apiBase}/form/records/${record.id}/parse-upload`, {
        method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.code !== 200) throw new Error(j.message || '解析失败');
      const rj = await getRecord(record.id);
      setRecord(rj); setFields(rj.fields || []);
      setParseRes(j.data || {});
      toast(`已从文件中回填 ${(j.data && j.data.count) || 0} 项空白字段`);
    } catch (e) {
      toast(e.message || '解析失败');
    } finally { setParsing(false); }
  };

  /* 打开已有记录：恢复数据并直达对应步骤；地址栏带上模板与记录段（刷新可直接恢复） */
  useEffect(() => {
    if (!openRecordId) return;
    getRecord(openRecordId).then((r) => {
      if (!r) { toast('记录不存在'); onExit(); return; }
      setRecord(r);
      setTplId(r.templateId);
      setFields(r.fields || []);
      setSummary((r.fields || []).find((f) => f.key === SUMMARY_KEY)?.val || '');
      const target = initialStep && initialStep >= 2 && initialStep <= 4 ? initialStep : 4;
      // URL 直接写完整三段（tplId state 此时未更新，闭包里是旧值——曾致 /0/4 错误地址）
      try { navigate('/teacher/form/' + (r.templateId || 0) + '/' + target + '/' + openRecordId, { replace: true }); } catch (e) { /* noop */ }
      setStep(target);
    }).catch((e) => { toast(e.message || '加载记录失败'); onExit(); });
    return () => { if (esRef.current) esRef.current.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRecordId]);

  /* 记录 id 就绪后补地址栏记录段（step2 落库即生效，之后任何一步刷新都可恢复） */
  useEffect(() => {
    if (!record || !record.id) return;
    try {
      const seg = location.hash.split('/');
      const cur = seg[seg.length - 1];
      if (String(cur) !== String(record.id)) {
        navigate('/teacher/form/' + (tplId || 0) + '/' + step + '/' + record.id, { replace: true });
      }
    } catch (e) { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record && record.id]);

  useEffect(() => {
    // 默认不预选任何模板（由用户自行选择，或选「自定义格式」）
    listTemplates().then(setTemplates).catch((e) => toast('模板加载失败：' + e.message));
  }, [toast]);

  useEffect(() => { matsRef.current = mats; });

  // 记忆预填（User Memory → Smart Prefill）：选定模板后（新建填报，非编辑记录），把本人上次在本模板填写的内容带入空字段
  useEffect(() => {
    if (!tplId || openRecordId) return;
    let alive = true;
    getFormMemory(tplId).then((list) => {
      if (!alive || !Array.isArray(list) || !list.length) return;
      const byKey = {};
      list.forEach((x) => { if (x && x.key && x.value) byKey[x.key] = x.value; });
      const cur = matsRef.current || {};
      const next = { ...cur };
      const hit = {};
      Object.keys(byKey).forEach((k) => { if (!String(next[k] || '').trim()) { next[k] = byKey[k]; hit[k] = true; } });
      if (Object.keys(hit).length) {
        setMats(next);
        setMemPrefill((p) => ({ ...p, ...hit }));
      }
      setNeed((nd) => {
        const n = { ...nd };
        list.forEach((x) => { if (x && x.label && x.value && !String(n[x.label] || '').trim()) n[x.label] = x.value; });
        return n;
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, [tplId, openRecordId, toast]);

  const tpl = (templates || []).find((t) => t.id === tplId) || null;
  const khnf = ((record && record.fields) || fields).find((x) => x.key === '_khnf')?.val || '';
  const matFields = (tpl?.fields || []).filter((f) => f.src === 'material');
  const needFields = (tpl?.fields || []).filter((f) => f.src === 'need');
  const dbFields = (tpl?.fields || []).filter((f) => f.src === 'db');

  const matStat = (f) => {
    const v = (mats[f.key] || '').trim();
    const required = (f.hint || '').includes('必填');
    if (required) return v ? { cls: 'filled', t: `已填 ${v.length} 字` } : { cls: 'empty', t: '必填' };
    return v ? { cls: 'filled', t: `已填 ${v.length} 字` } : { cls: 'opt', t: '选填' };
  };

  const runAiMaterial = async (f, cur) => {
    setAiBusy(f.key);
    try {
      const r = await aiMaterial(f.key, f.label, cur, tplId);
      const text = (r && r.text) || '';
      if (!text) { toast('AI 未返回内容，请手动填写'); return; }
      setMats((m) => ({ ...m, [f.key]: cur ? cur + '\n' + text : text }));
      toast('AI 已生成要点，请核对修改后使用');
    } catch (e) {
      toast(e.message || 'AI 填写失败');
    } finally { setAiBusy(''); }
  };
  const doAiMaterial = async (f) => {
    if (!requireLoginAi()) return;
    if (aiBusy) { toast('AI 正在起草中，请稍候'); return; }
    const cur = (mats[f.key] || '').trim();
    if (cur) { setAskDraft({ f, cur }); return; }   // 已有内容 → 统一弹窗二次确认
    runAiMaterial(f, cur);
  };
  const requireLoginAi = () => !!user;

  /** 选择模板：同步地址栏 #/teacher/form/{模板id}/{步骤} */
  const selectTpl = (id) => {
    setTplId(id);
    navigate('/teacher/form/' + id + '/' + step, { replace: true });
  };

  /** 自定义格式：上传文件 → 解析成自定义模板并选中 */
  const uploadCustomTpl = async (fileList) => {
    const f = fileList && fileList[0];
    if (!f) return;
    if (!requireLoginAi()) return;
    setTplId(null);   // 选「自定义格式」即取消其它模板的选中态
    setTplUploading(true);
    try {
      const t = await uploadTemplate(f);
      const list = await listTemplates();
      setTemplates(list);
      if (t && t.id) { initTplRef.current = t.id; selectTpl(t.id); }
      toast('已按你的格式创建模板，可直接填报');
    } catch (e) {
      toast(e.message || '上传失败，请确认文件为含表格/栏目的 docx、xlsx 或 pdf');
    } finally { setTplUploading(false); }
  };

  const startFill = async () => {
    const ji = matFields.find((f) => (f.hint || '').includes('必填'));
    if (ji && !(mats[ji.key] || '').trim()) { toast(`「${ji.label}」为必填素材，请至少提供一条`); return; }
    try {
      const allFields = (tpl.fields || []).map((f) => ({
        ...f,
        val: f.src === 'material' ? (mats[f.key] || '')
          : f.src === 'need' ? (need[f.label] || (NEED_SELECT[f.label] ? NEED_SELECT[f.label][0] : ''))
            : '',
      }));
      const rid = await createRecord({ templateId: tplId, fields: allFields });
      const rj = await getRecord(rid);
      setRecord(rj);
      goStep(3);
      runStream(rid);
    } catch (e) { toast(e.message || '创建记录失败'); }
  };

  const runStream = (rid) => {
    setStreaming(true); setLogLines([]); setStages({}); setFields([]); setSummary('');
    const es = new EventSource(streamUrl(rid));
    esRef.current = es;
    const cur = { fields: [], summary: '' };
    let total = 0;
    let finished = false;
    es.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      if (d.type === 'start') { total = d.total || 0; setLogLines((L) => [...L, { k: 'SYSTEM', v: `流水线就绪 · 共 ${d.total} 项字段`, sys: true }]); }
      if (d.type === 'stage') setStages((s) => ({ ...s, [d.stage]: { state: d.state, text: d.text } }));
      if (d.type === 'field') {
        cur.fields[d.index] = d; setFields([...cur.fields]);
        const pct = (d.idx && d.total) ? `（${Math.round(d.idx / d.total * 100)}%）` : '';
        pushLog(d.label + (d.idx && d.total ? ` ${d.idx}/${d.total}` : ''),
          d.src === 'need' ? (d.val ? '按手动确认填写' + pct : '待手动确认') : d.val ? `已带出：${d.val}${pct}` : '待填');
      }
      if (d.type === 'nstart') pushLog(d.label, 'AI 正在起草…');
      if (d.type === 'delta' && d.index !== undefined) {
        const f = cur.fields[d.index];
        if (f && f.key === SUMMARY_KEY) { cur.summary += d.chunk; setSummary(cur.summary); }
        else if (f) { f.val = (f.val || '') + d.chunk; setFields([...cur.fields]); }
      }
      if (d.type === 'nend' && d.index !== undefined) { const f = cur.fields[d.index]; if (f) { f.val = d.val; setFields([...cur.fields]); } }
      if (d.type === 'done') {
        finished = true; es.close(); setStreaming(false);
        getRecord(rid).then((rec) => { setRecord(rec); setFields(rec.fields || []); setSummary((rec.fields || []).find((f) => f.key === SUMMARY_KEY)?.val || ''); goStep(4); }).catch(() => goStep(4));
      }
      if (d.type === 'error') { finished = true; es.close(); setStreaming(false); toast(d.message || '流水线异常'); }
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    };
    es.onerror = () => {
      es.close(); setStreaming(false);
      if (finished) return;
      toast('AI 连接中断，锡锡仍在后台生成，稍后将自动恢复…');
      // 后端不依赖连接存活会跑完落库：轮询记录，总结生成后自动进入步骤4
      let n = 0;
      const poll = setInterval(async () => {
        n += 1;
        try {
          const rec = await getRecord(rid);
          const sum = (rec.fields || []).find((f) => f.key === SUMMARY_KEY)?.val || '';
          if (sum) {
            clearInterval(poll);
            setRecord(rec); setFields(rec.fields || []); setSummary(sum); goStep(4);
            toast('AI 填报已完成，请核对');
          } else if (n >= 20) {
            clearInterval(poll);
            toast('后台生成时间较长，请稍后从「我的填报记录 · 继续填报」查看');
          }
        } catch { /* 记录暂时不可读，继续轮询 */ }
      }, 15000);
    };
  };

  const pushLog = (k, v, amb) => {
    const d = new Date();
    const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => `0${x}`.slice(-2)).join(':');
    setLogLines((L) => [...L, { k, v, amb, ts }]);
  };

  /** 统一落库：字段核对（基本信息/手动项）+ 本人总结一并保存；status 显式传入（完成语义） */
  const saveAll = async (silent, status) => {
    if (!record) return false;
    const fs = fields.map((f) => (f.key === SUMMARY_KEY ? { ...f, val: summary, edited: true } : f));
    try {
      await updateRecord(record.id, status ? { fields: fs, status } : { fields: fs });
      if (!silent) toast('已保存');
      return true;
    } catch (e) { toast(e.message || '保存失败'); return false; }
  };
  const saveSummary = () => saveAll(false);
  /** 离开 / 导出前静默落库；点「完成」= 显式置 done（列表即时显示已完成，再次进入可完整恢复） */
  const finish = async () => { await saveAll(true, 'done'); onExit(); };
  const leaveStep4 = async () => { await saveAll(true); goStep(2); };
  const exportWord = async () => { if (await saveAll(true)) doExport(); };
  /** 导出 PDF：走浏览器打印（打印对话框选「存储为 PDF」）——所见即预览版式，无需服务端转换 */
  const exportPdf = async () => {
    if (!(await saveAll(true))) return;
    toast('已打开打印面板：目标选择「存储为 PDF」即可保存');
    setTimeout(() => { try { window.print(); } catch (e) { /* noop */ } }, 400);
  };
  const [expMenu, setExpMenu] = useState(false);
  const pickExport = (fn) => { setExpMenu(false); fn(); };
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
    es.onerror = () => { es.close(); setStreaming(false); toast('AI 润色连接中断，请稍后重试'); };
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
      <a className="v2t-back" onClick={() => (step === 4 ? finish() : onExit())} role="button" tabIndex={0}>
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
                  onClick={() => selectTpl(t.id)} role="button" tabIndex={0}>
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
              <div className={`v2t-tpl-card custom${tplUploading ? ' sel' : ''}`}
                onClick={() => { if (!tplUploading) { setTplId(null); tplUpRef.current && tplUpRef.current.click(); } }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (!tplUploading) { setTplId(null); uploadCustomTpl(e.dataTransfer.files); } }}
                role="button" tabIndex={0} title="上传你自己的格式文件，自动识别字段生成模板">
                <input type="file" ref={tplUpRef} accept=".pdf,.xlsx,.docx" hidden
                  onChange={(e) => { uploadCustomTpl(e.target.files); e.target.value = ''; }} />
                <div className="t-ic"><Icon name="upload" size={19} /></div>
                <div className="t-name">{tplUploading ? '锡锡正在识别格式…' : '自定义格式'}</div>
                <div className="t-desc">除以上模板外，也可用自己的格式：上传 docx / xlsx / pdf，系统自动识别字段并生成可填报模板</div>
                <div className="t-meta"><span className="v2t-tag blue">PDF / Word / Excel</span></div>
              </div>
            </div>
          )}
          <div className="v2t-actions">
            <div className="v2t-hint"><Icon name="info" size={13} />带「可导出 Word」标记的模板已内置原版式文件，导出保持官方表格样式</div>
            <button className="v2-btn primary" onClick={() => goStep(2)}>下一步：确认信息 · 填素材<Icon name="chevR" size={13} /></button>
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
                    {NEED_SELECT[f.label] ? (
                      <select className="v2t-inp" value={need[f.label] || NEED_SELECT[f.label][0]} onChange={(e) => setNeed({ ...need, [f.label]: e.target.value })}>
                        {NEED_SELECT[f.label].map((o) => <option key={o}>{o}</option>)}
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
                        <div className="m-tt"><div className="m-t">{f.label}{required && <span style={{ color: 'var(--p-danger)' }}> *</span>}</div><div className="m-hint">{f.hint}</div>
                          {memPrefill[f.key] && (
                            <span className="v2-mem-tag" title="来自你上次的填写 · 点击清除" onClick={(e) => { e.stopPropagation(); setMats((m) => ({ ...m, [f.key]: '' })); setMemPrefill((p) => ({ ...p, [f.key]: false })); }}>
                              <Icon name="book" size={11} />记忆 · 清除
                            </span>
                          )}
                        </div>
                        <span className="m-state" style={st.cls === 'filled' ? { color: '#0B7A4B', background: '#E2F5EC' } : st.cls === 'empty' ? { color: '#B45309', background: '#FEF3C7' } : { color: 'var(--p-t3)', background: 'var(--p-fill)' }}>{st.t}</span>
                        {required && (
                          <button type="button" className="v2t-ai-fill-btn" disabled={aiBusy === f.key}
                            onClick={(e) => { e.stopPropagation(); doAiMaterial(f); }}
                            title="AI 结合数仓事实生成该栏目要点">
                            {aiBusy === f.key ? '起草中…' : '✦ AI填写'}
                          </button>
                        )}
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
              <button className="v2-btn ghost" onClick={() => goStep(1)}><Icon name="back" size={13} />上一步</button>
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
            <div className="pc-t" style={{ marginBottom: 12 }}>
              <span className="v2t-tag ai">AI数据填报生成</span>
              <span className="pc-hint">
                {streaming ? '本人总结正在起草' : (summary ? '本人总结已生成 · 可核对修改' : '等待 AI 起草')}
                {streaming && <span className="caret" />}
              </span>
            </div>
            <PreviewDoc tpl={tpl} fields={fields} summary={summary} khnf={khnf} streaming={streaming} />
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="v2t-tag blue">{dbFields.length} 项数仓带出 · {needFields.length} 项手动确认</span>
                  <button className="v2-btn ghost" style={{ height: 30 }} onClick={() => saveAll(false)} disabled={streaming}>保存</button>
                </span>
              </div>
              <div className="v2t-pv-fields">
                {fields.filter((f) => f.g === 'g1').map((f) => (
                  <div className="pv-f" key={f.label}>
                    <div className="l"><span>{f.label}</span><span className={`mini-tag ${f.src === 'db' ? 'db' : 'mn'}`}>{f.src === 'db' ? '数仓' : '手动'}</span></div>
                    <input className="v2t-inp" value={f.val || ''} readOnly={f.src === 'db'}
                      onChange={(e) => setFields(fields.map((x) => (x.label === f.label ? { ...x, val: e.target.value, edited: true } : x)))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="v2t-card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                <span className="v2t-sec-t" style={{ margin: 0 }}>本人总结<span className="v2t-cnt">{summary.length} 字</span></span>
                <button className="v2t-regen-btn" onClick={polish} disabled={streaming}>
                  <img className="rg-xixi" src="data:image/png;base64,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" alt="锡锡" />{streaming ? '润色中…' : 'AI润色'}
                </button>
              </div>
              <textarea className="v2t-inp-ta sum-ta" value={summary} onChange={(e) => setSummary(e.target.value)} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                <span className="v2t-tag ai">AI数据填报生成 · 请逐句核对</span>
                <button className="v2-btn ghost" style={{ height: 30 }} onClick={saveSummary}>保存修改</button>
              </div>
            </div>
            <WarnBar>导出文件为官方原版式 Word：内容仅写入基本信息与本人总结，主管领导评鉴等意见区保持空白，需线下手写签署。AI 生成内容请核对后使用。</WarnBar>
          </div>
          <div className="v2t-pv-sticky">
            <div className="v2t-card">
              <div className="pc-head">
                <div className="pc-t">导出预览<span className="v2t-cnt">A4 · 原版式</span></div>
              </div>
              <PreviewDoc tpl={tpl} fields={fields} summary={summary} khnf={khnf}
                withOpinions={tpl?.name === '年度考核登记表'} />
              <div className="v2t-doc-note">意见与签章区不参与 AI 填报，导出后线下完成</div>
            </div>
            <div className="v2t-actions" style={{ marginTop: 14 }}>
              <button className="v2-btn ghost" onClick={leaveStep4}><Icon name="back" size={13} />返回修改素材</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <button className="v2-btn ghost" onClick={() => setExpMenu(!expMenu)} disabled={exporting}>
                    <Icon name="download" size={14} />{exporting ? '生成中…' : '导出'}<span style={{ fontSize: 10, marginLeft: 4 }}>▾</span>
                  </button>
                  {expMenu && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setExpMenu(false)} />
                      <div className="v2t-exp-menu">
                        <button className="v2t-exp-item" onClick={() => pickExport(exportWord)}>
                          <Icon name="download" size={14} /><span><b>Word 文档</b><small>.docx · 官方原版式 · 意见区留白线下签署</small></span>
                        </button>
                        <button className="v2t-exp-item" onClick={() => pickExport(exportPdf)}>
                          <Icon name="doclog" size={14} /><span><b>PDF</b><small>打印面板「存储为 PDF」· 版式与预览一致</small></span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button className="v2-btn primary" onClick={finish}>完成</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {askDraft && (
        <Modal
          title="该栏目已有内容"
          width={460}
          onClose={() => setAskDraft(null)}
          footer={
            <>
              <button className="v2-btn ghost" onClick={() => setAskDraft(null)}>取消</button>
              <button className="v2-btn" onClick={() => { const d = askDraft; setAskDraft(null); runAiMaterial(d.f, d.cur); }}>继续生成</button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--p-t2)', lineHeight: 1.9, margin: 0 }}>
            「{askDraft.f.label}」已有内容。AI 建议将要点追加在末尾（不覆盖已写内容），是否继续生成？
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- 频道容器（按子路由分发） ---------- */
export default function V2Teacher({ user, requireLogin, toast, wizard, onExitWizard, openRecordId, openWizard, onNav, initialTplId, initialStep }) {
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
  if (wizard) return <FormWizard user={user} toast={toast} onExit={onExitWizard} openRecordId={openRecordId} initialTplId={initialTplId} initialStep={initialStep} />;
  return <TeacherHome user={user} requireLogin={requireLogin} toast={toast} openWizard={openWizard} onNav={onNav} />;
}
