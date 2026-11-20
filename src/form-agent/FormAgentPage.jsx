import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageLayout from '../components/PageLayout';
import { useUser } from '../UserContext';
import { apiBase } from '../api/request';
import {
  listTemplates, uploadTemplate, updateTemplate, deleteTemplate,
  searchTeachers, pageRecords, getRecord, createRecord, updateRecord, deleteRecord,
} from '../api/form';
import FaIconDefs, { Ic } from './icons';
import './formagent.css';

/* ================= 常量 ================= */
const GROUPS = [
  { id: 'g1', name: '基本信息', n: '一', c: '#4A6CF7', bg: '#ECF0FF' },
  { id: 'g2', name: '学历学位', n: '二', c: '#0E9F8A', bg: '#E4F8F4' },
  { id: 'g3', name: '科研业绩', n: '三', c: '#7C5CFC', bg: '#F3EFFF' },
  { id: 'g4', name: '教学评价', n: '四', c: '#D97706', bg: '#FCF3E3' },
  { id: 'g5', name: '考核与荣誉', n: '五', c: '#0891B2', bg: '#E3F6FA' },
  { id: 'g6', name: '个人陈述', n: '六', c: '#DB2777', bg: '#FCE9F2' },
];
const groupOf = (id) => GROUPS.find((g) => g.id === id) || { id, name: '其他字段', n: '·', c: '#64748B', bg: '#F1F5F9' };
const TPL_COLORS = [
  { c: '#4A6CF7', bg: '#ECF0FF', icon: 'form' },
  { c: '#0E9F8A', bg: '#E4F8F4', icon: 'user' },
  { c: '#D97706', bg: '#FCF3E3', icon: 'guide' },
  { c: '#7C5CFC', bg: '#F3EFFF', icon: 'cpu' },
  { c: '#0891B2', bg: '#E3F6FA', icon: 'file' },
];
const tplSkin = (t, i = 0) => TPL_COLORS[(t.id || i) % TPL_COLORS.length];
const STMAP = { done: ['g', '已完成'], todo: ['o', '待补充'], draft: ['n', '进行中'] };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DSRC = [
  { icon: 'user', c: '#4A6CF7', bg: '#ECF0FF', t: '教职工主表', s: '在岗教师 · 每日快照', st: '已连接' },
  { icon: 'book', c: '#0E9F8A', bg: '#E4F8F4', t: '学历学位', s: '覆盖最高学历记录', st: '已连接' },
  { icon: 'cpu', c: '#7C5CFC', bg: '#F3EFFF', t: '科研系统', s: '论文 · 专利 · 项目 · 经费', st: '已连接' },
  { icon: 'eye', c: '#D97706', bg: '#FCF3E3', t: '教学评价', s: '评教 · 督导 · 同行', st: '已连接' },
  { icon: 'guide', c: '#0891B2', bg: '#E3F6FA', t: '年度考核', s: '近三年考核结果', st: '已连接' },
  { icon: 'form', c: '#DB2777', bg: '#FCE9F2', t: '自定义模板', s: '上传解析 · 映射记忆复用', st: '已启用' },
];
const HELPS = [
  ['如何开始一次填报？', '从「选择模板」进入，选用预置模板或上传自定义表格；确认填报人后，系统自动解析模板字段并从教师数据仓检索数据完成填写。'],
  ['数据是从哪里来的？', '结构化字段（工号、学历、论文、专利、项目、经费、评教、考核等）直接来自校内教师数据仓快照，每项均可查看数据依据；叙述性内容由大模型基于数仓事实起草，需人工核对。'],
  ['为什么有些字段需要我补充？', '联系电话、邮箱、籍贯等隐私字段不出数仓；部分数据源仍在接入中。这些字段标记为「需补充」，在导出前填写即可。'],
  ['导出会保留原表格版式吗？', '导出 Word / Excel 为文档格式下载，PDF 使用浏览器打印；黄色底纹单元格在导出前均可直接点击修改，修改会同步到填报记录。'],
  ['同一模板下次还要重新映射吗？', '不需要。上传的自定义模板首次解析后建立字段清单并记忆，二次使用时直接复用。'],
  ['填报内容谁可以看到？', '填报数据仅填报人本人与学院管理员可见，所有生成与导出行为留痕于填报记录。'],
];
const AI_SUGG = ['民族填什么？', '代表作论文怎么选？', '考核结果代码含义', '如何导出保留版式'];
function aiAnswer(q) {
  if (q.includes('民族') || q.includes('汉族')) return '民族字段来自教职工主表（代码 01）。数仓暂无民族代码字典，按惯例推断为「汉族」，置信度 62%——建议您按实际情况核对后再提交。';
  if (q.includes('代表作') || q.includes('论文怎么选')) return '代表作论文由大模型按「近三年 + 第一作者 + 期刊层次」从论文表（数仓）检索排序起草。您可以点击字段右侧的「重新生成」按钮重新起草，或直接在字段中编辑替换。';
  if (q.includes('考核') || q.includes('代码')) return '年度考核结果为数仓代码：01 推断为优秀、02 合格、03 基本合格（代码无官方字典，仅供参考）。近三年考核已自动带入，如与人事处口径不符请以人事处为准。';
  if (q.includes('导出') || q.includes('版式')) return '导出 Word / Excel 为文档格式下载，PDF 使用浏览器打印。黄色底纹单元格在导出前均可直接点击修改，修改会同步到填报记录。';
  if (q.includes('电话') || q.includes('邮箱') || q.includes('隐私')) return '联系电话、邮箱、证件号等隐私字段不出数仓，需您手动填写；这也保证了只有本人能补充敏感信息。';
  if (q.includes('映射') || q.includes('模板')) return '上传的自定义模板首次解析后建立字段清单并记忆，二次使用直接复用；管理员可在模板库中编辑或停用模板。';
  if (q.includes('谁') && q.includes('看')) return '填报数据仅填报人本人与学院管理员可见，生成、修改、导出行为均留痕于填报记录。';
  if (q.includes('经费') || q.includes('横向')) return '横向项目按「负责人姓名 + 成员表工号」双口径统计，经费到账按项目关联汇总，单位万元。口径可在字段卡片的「数据依据」里查看。';
  return '这个问题我可以帮您查询：\n· 字段的数据来源与统计口径\n· 叙述性内容的重新起草与润色\n· 导出版式与填写规范\n您也可以直接描述遇到的问题。';
}

/* ================= 页面 ================= */
export default function FormAgentPage() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const [view, setView] = useState('home');
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);
  const [loading, setLoading] = useState(true);

  const [templates, setTemplates] = useState([]);
  const [templateError, setTemplateError] = useState(false);

  // 上传解析弹层
  const [upModal, setUpModal] = useState(null); // {fileName, meta, step, result:{id,name,fieldCount}}
  const [uploading, setUploading] = useState(false);
  // 模板编辑弹层
  const [editTpl, setEditTpl] = useState(null);
  // 删除确认（delTpl=模板 / delRecRow=记录）
  const [delTpl, setDelTpl] = useState(null);
  const [delRecRow, setDelRecRow] = useState(null);
  // 抽屉
  const [drawer, setDrawer] = useState(null); // {title, body}
  // 帮助 / 通知
  const [helpOn, setHelpOn] = useState(false);
  const [bellOn, setBellOn] = useState(false);
  // AI 助手
  const [aiOn, setAiOn] = useState(false);
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState('');

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
  }, []);

  /* ---------- 模板加载 ---------- */
  const loadTemplates = useCallback(() => {
    return listTemplates(true)
      .then((list) => { setTemplateError(false); setTemplates(list || []); })
      .catch(() => setTemplateError(true));
  }, [toast]);

  useEffect(() => {
    loadTemplates().finally(() => setLoading(false));
  }, [loadTemplates]);

  /* ---------- 向导状态 ---------- */
  const [wiz, setWiz] = useState({
    open: false, tpl: null, step: 1, teacher: null,
    recordId: null, fields: [], total: 0, filled: 0, running: false, finished: false,
    pipe: { parse: '', fetch: '', generate: '' }, pipeState: {},
  });
  const [teachers, setTeachers] = useState([]);
  const [pickQ, setPickQ] = useState('');
  const esRef = useRef(null);
  const valCache = useRef({}); // index -> streaming text

  const loadTeachers = useCallback((kw) => {
    searchTeachers(kw || '')
      .then((list) => setTeachers(list || []))
      .catch(() => setTeachers([]));
  }, []);

  useEffect(() => {
    if (view === 'wizard' && wiz.step === 1 && !teachers.length) loadTeachers(pickQ);
  }, [view, wiz.step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (esRef.current) esRef.current.close(); }, []);

  const pageRef = useRef(null);
  const goto = (v) => { setView(v); pageRef.current?.closest('.el-content')?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); };

  const startWizard = (tpl) => {
    setDrawer(null);
    setWiz({ open: true, tpl, step: 1, teacher: null, recordId: null, fields: [], total: 0, filled: 0, running: false, finished: false, pipe: { parse: '', fetch: '', generate: '' }, pipeState: {} });
    setTeachers([]); setPickQ('');
    goto('wizard');
    setTimeout(() => loadTeachers(''), 40);
  };

  /* ---------- SSE 填写 ---------- */
  const beginFill = (teacher) => {
    const tpl = wiz.tpl;
    setUploading(true);
    createRecord({
      name: `${tpl.name} · ${teacher.name}`,
      templateId: tpl.id,
      teacherId: teacher.zgh || teacher.id || '',
      teacherName: teacher.name,
    }).then((recordId) => {
      setUploading(false);
      setWiz((w) => ({ ...w, recordId, teacher, step: 2, running: true, fields: [], total: 0, filled: 0 }));
      openStream(recordId);
    }).catch((e) => {
      setUploading(false);
      toast(`创建填报任务失败：${e.message}`);
    });
  };

  const openStream = (recordId) => {
    if (esRef.current) esRef.current.close();
    const token = encodeURIComponent(localStorage.getItem('user_token') || '');
    const es = new EventSource(`${apiBase}/form/records/${recordId}/stream?token=${token}`);
    esRef.current = es;
    es.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      handleEvent(d);
    };
    es.onerror = () => { es.close(); };
  };

  const handleEvent = (d) => {
    setWiz((w) => {
      const nw = { ...w };
      if (d.type === 'start') { nw.total = d.total; nw.fields = Array.from({ length: d.total }, () => null); }
      else if (d.type === 'stage') {
        nw.pipe = { ...nw.pipe, [d.stage]: d.text };
        nw.pipeState = { ...nw.pipeState, [d.stage]: d.state };
      } else if (d.type === 'field') {
        nw.fields = nw.fields.map((f, i) => (i === d.index ? { ...d, done: true, editing: false } : f));
        if (d.src !== 'need' || (d.val && d.val.trim())) nw.filled += 1;
      } else if (d.type === 'nstart') {
        valCache.current[d.index] = '';
        nw.fields = nw.fields.map((f, i) => (i === d.index ? { label: d.label, g: (w.fields[i] || {}).g || 'g6', src: 'ai', conf: 0.9, val: '', done: false, generating: true } : f));
      } else if (d.type === 'delta') {
        valCache.current[d.index] = (valCache.current[d.index] || '') + d.chunk;
        const txt = valCache.current[d.index];
        nw.fields = nw.fields.map((f, i) => (i === d.index ? { ...f, val: txt, generating: true, done: false } : f));
      } else if (d.type === 'nend') {
        delete valCache.current[d.index];
        nw.fields = nw.fields.map((f, i) => (i === d.index ? { ...f, val: d.val, generating: false, done: true } : f));
        nw.filled += 1;
      } else if (d.type === 'stage_done' || (d.type === 'stage' && d.stage === 'generate' && d.state === 'done')) {
        nw.running = false; nw.finished = true;
      } else if (d.type === 'done') {
        nw.running = false; nw.finished = true;
        nw.filled = d.fillCount; nw.total = d.total;
      } else if (d.type === 'error') {
        nw.running = false;
        toast(`填写流水线异常：${d.message}`);
      }
      return nw;
    });
  };

  const regen = (index) => {
    if (!wiz.recordId) { toast('该字段暂不可重新生成'); return; }
    const token = encodeURIComponent(localStorage.getItem('user_token') || '');
    fetch(`${apiBase}/form/records/${wiz.recordId}/regen?index=${index}&token=${token}`)
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error('重新生成失败');
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split('\n\n'); buf = parts.pop();
          parts.forEach((p) => {
            const line = p.split('\n').find((l) => l.startsWith('data:'));
            if (line) { try { handleEvent(JSON.parse(line.slice(5).trim())); } catch { /* ignore */ } }
          });
        }
      })
      .catch((e) => toast(e.message));
    setWiz((w) => ({ ...w, fields: w.fields.map((f, i) => (i === index ? { ...f, generating: true, done: false, val: '' } : f)) }));
    toast('正在重新起草该字段');
  };

  const editField = (index, text) => {
    setWiz((w) => ({ ...w, fields: w.fields.map((f, i) => (i === index ? { ...f, val: text, edited: true } : f)) }));
  };

  /* ---------- 保存与导出 ---------- */
  const persist = (extra = {}) => {
    if (!wiz.recordId) return Promise.resolve();
    const fields = wiz.fields.filter(Boolean).map((f) => ({
      label: f.label, g: f.g, src: f.src, key: f.key || '', conf: f.conf || 0,
      hint: f.hint || '', basis: f.basis || '', val: f.val || '',
    }));
    const need = fields.filter((f) => f.src === 'need' && !f.val.trim()).length;
    return updateRecord(wiz.recordId, { fields, ...extra })
      .then(() => ({ need }))
      .catch((e) => { toast(`保存失败：${e.message}`); return { need, fail: true }; });
  };

  const saveRecord = () => {
    persist().then(({ need, fail }) => {
      if (fail) return;
      toast(need ? `已保存 · ${need} 项待补充` : '已保存至填报记录');
      goto('records');
      setWiz((w) => ({ ...w, open: false }));
    });
  };

  const exportAs = (fmt) => {
    const rows = Array.from(document.querySelectorAll('.fa-page table.form tr'));
    if (!rows.length) return;
    const html = Array.from(rows).map((tr) => `<tr>${tr.innerHTML}</tr>`).join('');
    if (fmt === 'pdf') { window.print(); return; }
    const doc = fmt === 'docx'
      ? `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>table{border-collapse:collapse}td,th{border:1px solid #666;padding:6px 10px;font-size:12pt;font-family:"宋体"}td.lbl{background:#F2F2F2}</style></head><body><h2 style="text-align:center">${esc(wiz.tpl?.name || '填报表')}</h2><table>${html}</table></body></html>`
      : `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${html}</table></body></html>`;
    const blob = new Blob(['\ufeff', doc], { type: fmt === 'docx' ? 'application/msword' : 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${wiz.tpl?.name || '填报表'}.${fmt === 'docx' ? 'doc' : 'xls'}`;
    a.click();
    URL.revokeObjectURL(a.href);
    const mark = fmt === 'docx' ? 'Word' : 'Excel';
    persist({ exportFormats: mark }).then(() => toast(`已导出 ${mark} 文件，可在填报记录中查看`));
  };

  /* ---------- AI 助手（本地答疑） ---------- */
  const aiSend = (qRaw) => {
    const q = (qRaw ?? aiInput).trim();
    if (!q) return;
    setAiInput('');
    setAiMsgs((m) => [...m, { role: 'u', text: q }]);
    const full = aiAnswer(q);
    setAiMsgs((m) => [...m, { role: 'a', text: '', typing: true }]);
    let p = 0;
    const step = () => {
      p += 3;
      const txt = full.slice(0, p);
      setAiMsgs((m) => {
        const cp = [...m];
        cp[cp.length - 1] = { role: 'a', text: txt, typing: p < full.length };
        return cp;
      });
      if (p < full.length) setTimeout(step, 18);
    };
    setTimeout(step, 300);
  };

  /* ---------- 上传 ---------- */
  const fileRef = useRef(null);
  const onFile = (file) => {
    if (!file) return;
    setUploading(true);
    setUpModal({ fileName: file.name, meta: `${(file.size / 1024).toFixed(1)} KB · 上传于 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`, step: 1, result: null });
    uploadTemplate(file, file.name.replace(/\.[^.]+$/, ''))
      .then((t) => {
        setUploading(false);
        setUpModal((m) => ({ ...m, step: 3, result: t }));
        loadTemplates();
      })
      .catch((e) => {
        setUploading(false);
        setUpModal(null);
        toast(`模板解析失败：${e.message}`);
      });
  };

  const useUploaded = () => {
    const t = upModal?.result;
    setUpModal(null);
    if (!t) return;
    toast('模板已保存，开始填报');
    loadTemplates().then(() => startWizard({ id: t.id, name: t.name || upModal?.fileName, description: '', source: 'custom' }));
  };
  const onlySave = () => {
    setUpModal(null);
    toast('模板已存入模板库');
    goto('library');
  };

  /* ---------- 模板编辑 / 删除 ---------- */
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 1 });
  const openEdit = (t) => { setEditTpl(t); setEditForm({ name: t.name, description: t.description || '', status: t.status ?? 1 }); };
  const saveEdit = () => {
    updateTemplate(editTpl.id, editForm)
      .then(() => { setEditTpl(null); toast('模板已更新'); loadTemplates(); })
      .catch((e) => toast(`保存失败：${e.message}`));
  };
  const doDeleteTpl = () => {
    deleteTemplate(delTpl.id)
      .then(() => { setDelTpl(null); toast('模板已删除'); loadTemplates(); })
      .catch((e) => { setDelTpl(null); toast(`删除失败：${e.message}`); });
  };

  /* ---------- 记录 ---------- */
  const [rec, setRec] = useState({ page: 1, size: 10, keyword: '', status: '', tplName: '', rows: [], total: 0 });
  const [recordError, setRecordError] = useState(false);
  const recordRequest = useRef(0);
  const loadRecords = useCallback((patch = {}) => {
    const requestId = ++recordRequest.current;
    const st = { ...rec, ...patch };
    setRec(s => ({ ...s, ...patch }));
    return pageRecords({ page: st.page, size: st.size, keyword: st.keyword || undefined, status: st.status || undefined, tplName: st.tplName || undefined })
      .then((r) => {
        if (recordRequest.current !== requestId) return;
        setRecordError(false);
        setRec(s => ({ ...s, rows: r.records || [], total: r.total || 0 }));
      })
      .catch(() => { if (recordRequest.current === requestId) setRecordError(true); });
  }, [rec, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (view === 'records' || view === 'home') loadRecords({ page: 1, keyword: '', tplName: '', status: '' }); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRec = (row) => {
    getRecord(row.id).then((detail) => {
      const fields = detail.fields || [];
      const need = fields.filter((f) => f.src === 'need' && !(f.val || '').trim()).length;
      const st = row.status || 'done';
      const steps = [
        ['模板解析', `识别 ${row.totalCount || fields.length} 项字段 · 建立映射`, 'done'],
        ['数仓检索', '教师数据仓多表检索', 'done'],
        ['内容生成', st === 'draft' ? '部分叙述内容未完成' : '结构化直填 + 大模型起草完成', st === 'draft' ? 'live' : 'done'],
        ['人工核对', st === 'done' && !need ? '已确认' : need ? `待补充 ${need} 项` : '待核对', st === 'done' && !need ? 'done' : 'need'],
      ];
      setDrawer({
        title: '填报详情',
        body: (
          <div>
            <div className="kv">
              <i>任务名称</i><b>{row.name}</b>
              <i>使用模板</i><b>{row.templateName}</b>
              <i>填报人</i><b>{row.teacherName}</b>
              <i>完成度</i><b>{row.fillCount} / {row.totalCount} 项{row.totalCount ? `（${Math.round((row.fillCount / row.totalCount) * 100)}%）` : ''}</b>
              <i>状态</i><b><span className={`pill ${STMAP[st]?.[0] || 'n'}`}>{STMAP[st]?.[1] || st}</span></b>
              <i>已导出</i><b>{row.exportFormats || '—'}</b>
              <i>生成时间</i><b>{row.createdAt}</b>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>处理过程</div>
              {steps.map((s) => (
                <div key={s[0]} style={{ display: 'flex', gap: 11, padding: '8px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flex: 'none', background: s[2] === 'done' ? 'var(--ok)' : s[2] === 'live' ? 'var(--pri)' : 'var(--warn)' }} />
                  <div><b style={{ fontSize: 13 }}>{s[0]}</b><div style={{ fontSize: 12, color: 'var(--ink3)' }}>{s[1]}</div></div>
                </div>
              ))}
            </div>
          </div>
        ),
      });
    }).catch((e) => toast(`详情加载失败：${e.message}`));
  };

  const doDelRec = (row) => {
    deleteRecord(row.id).then(() => { toast('记录已删除'); loadRecords(); }).catch((e) => toast(e.message));
  };

  /* ================= 渲染辅助 ================= */
  const TplCard = ({ t, ctx }) => {
    const skin = tplSkin(t);
    const custom = t.source === 'custom' || t.source === 'upload';
    const active = t.status === 0 ? false : true;
    return (
      <div className="tpl-card" onClick={() => (ctx === 'lib' && isAdmin ? openEdit(t) : startWizard(t))}>
        {t.status === 0 && <span className="badge-new" style={{ color: 'var(--ink3)', background: 'var(--fill)' }}>已停用</span>}
        {t.tag === 'hot' && <span className="badge-new">高频</span>}
        <div className="tc-top">
          <div className="tc-ic" style={{ background: skin.bg, color: skin.c }}><Ic n={skin.icon} /></div>
          <div style={{ minWidth: 0 }}>
            <b>{t.name}</b>
            <span className="tc-sub">{custom ? '自定义模板' : '预置模板'} · {t.fieldCount ?? '—'} 项字段</span>
          </div>
        </div>
        <div className="tc-desc">{t.description || '上传解析自动建立字段清单，可用于 AI 填报。'}</div>
        <div className="tc-meta">
          {t.fieldCount != null && <span className="pill b">{t.fieldCount} 项字段</span>}
          {custom && <span className="pill n">自定义</span>}
          {custom && <span className={`pill ${active ? 'g' : 'n'}`}>{active ? '启用中' : '已停用'}</span>}
        </div>
        <div className="tc-cta">
          {ctx === 'lib' && isAdmin ? (
            <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>点击编辑模板信息与启停</span>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{t.fileType ? `源文件 ${String(t.fileType).toUpperCase()}` : ''}</span>
          )}
          <span className="use">{ctx === 'lib' && isAdmin ? '管理模板' : '用此模板填报'} <Ic n="arrowL" style={{ transform: 'rotate(180deg)' }} /></span>
        </div>
      </div>
    );
  };

  const FieldRow = ({ f, i }) => {
    if (!f) {
      return (
        <div className="fld">
          <div className="fl-l">…</div>
          <div className="fl-v"><span className="vwait"><span className="d" /><span className="d" /><span className="d" />&nbsp;等待解析…</span></div>
          <div className="fl-r" />
        </div>
      );
    }
    const g = groupOf(f.g);
    const srcPill = f.src === 'db'
      ? <span className="src db"><Ic n="db" />数仓直填</span>
      : f.src === 'ai'
        ? <span className="src ai"><Ic n="wand" />大模型起草</span>
        : <span className="src need"><Ic n="alert" />需补充</span>;
    const conf = f.conf ? (
      <span className={`conf ${f.conf < 0.85 ? 'warn' : ''}`}>
        <span className="cb"><i style={{ width: `${Math.round(f.conf * 100)}%` }} /></span>
        {Math.round(f.conf * 100)}%
      </span>
    ) : null;
    let valHtml;
    if (f.generating) {
      valHtml = <div className="vgen"><Ic n="wand" /><div className="gtxt">{f.val || ''}<span className="cur" /></div></div>;
    } else if (!f.done && f.src !== 'need') {
      valHtml = <span className="vwait"><span className="d" /><span className="d" /><span className="d" />&nbsp;等待填写…</span>;
    } else if (f.src === 'need' && !(f.val || '').trim() && !f.edited) {
      valHtml = <span className="vempty" contentEditable suppressContentEditableWarning onBlur={(e) => editField(i, e.currentTarget.textContent.trim())}>{f.hint || '点击填写'}</span>;
    } else {
      valHtml = <span className="vtxt" contentEditable suppressContentEditableWarning onBlur={(e) => editField(i, e.currentTarget.textContent.trim())}>{f.val || ''}</span>;
    }
    return (
      <div className={`fld ${f.src === 'need' && !(f.val || '').trim() ? 'em' : ''}`}>
        <div className="fl-l">
          {f.label}
          {f.src === 'need' && <span className="fl-lk"><Ic n="alert" />手动填写</span>}
        </div>
        <div className="fl-v">{valHtml}</div>
        <div className="fl-r">
          {srcPill}{conf}
          <div className="acts">
            <button title="查看数据依据" onClick={() => {
              const el = document.getElementById(`fa-why-${i}`);
              if (el) el.classList.toggle('on');
            }}><Ic n="info" /></button>
            {f.src === 'ai' && <button title="重新生成" onClick={() => regen(i)}><Ic n="refresh" /></button>}
          </div>
        </div>
        <div className="basis" id={`fa-why-${i}`}><Ic n="db" /><div><b style={{ display: 'block', fontSize: 12, marginBottom: 2 }}>数据依据</b>{f.basis || '—'}</div></div>
      </div>
    );
  };

  const groupCount = (gid) => {
    const fs = wiz.fields.map((f, i) => ({ f, i })).filter((x) => x.f && x.f.g === gid);
    const dn = fs.filter((x) => x.f.src !== 'need' || (x.f.val || '').trim()).length;
    return { fs, dn };
  };

  const wizStepCls = (n) => `wzs${wiz.step < n ? '' : wiz.step === n ? ' on' : ' done'}`;

  /* ================= 主渲染 ================= */
  const needCount = wiz.fields.filter((f) => f && f.src === 'need' && !(f.val || '').trim()).length;
  const shownTemplates = templates.filter((t) => isAdmin || t.status !== 0);
  const presetT = shownTemplates.filter((t) => t.source !== 'custom' && t.source !== 'upload');
  const customT = shownTemplates.filter((t) => t.source === 'custom' || t.source === 'upload');
  const recordFailure = <div className="empty"><Ic n="hist" /><b>填报记录加载失败</b><button className="btn sm" onClick={() => loadRecords()}>重新加载</button></div>;
  const templateEmpty = <div className="empty"><Ic n="form" /><b>{templateError ? '模板加载失败' : '暂无可用模板'}</b>
    {templateError ? <button className="btn sm" onClick={loadTemplates}>重新加载</button> : <span>管理员上传并启用后，将在这里显示。</span>}</div>;

  return (
    <PageLayout title="智能填报" activePath="/form-agent" isSidebarCollapsed={collapsed} setIsSidebarCollapsed={setCollapsed}>
      <FaIconDefs />
      <div className="fa-page posrel" ref={pageRef}>
        {/* 骨架 */}
        <div className={`skload${loading ? ' on' : ''}`}>
          <div className="sk" style={{ width: 180, height: 26, marginBottom: 18 }} />
          <div className="sk" style={{ width: '100%', height: 120, marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
            {[0, 1, 2, 3].map((i) => <div key={i} className="sk" style={{ height: 82 }} />)}
          </div>
          <div className="sk" style={{ width: '100%', height: 300 }} />
        </div>

        {view !== 'wizard' && <nav className="work-nav" aria-label="智能填报导航">
          {[['home', '工作台'], ['templates', '选择模板'], ['library', '模板库'], ['records', '填报记录']].map(([id, label]) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => goto(id)}>{label}</button>)}
          <button className="work-help" onClick={() => setHelpOn(true)}><Ic n="info" />填报帮助</button>
        </nav>}
        {/* ============ 首页 ============ */}
        <div className={`fview${view === 'home' ? ' on' : ''}`}>
          <header className="work-hero">
            <div><div className="work-kicker">无锡职业技术大学 · 教师服务</div>
              <h2>智能填报工作台</h2>
              <p>选择一份模板，自动带入校内数据，核对后即可导出。</p>
              <button className="work-start" onClick={() => goto('templates')}><Ic n="plus" />新建填报</button>
            </div>
            <div className="work-paper" aria-hidden="true"><Ic n="form" /><i /><i /><i /><span><Ic n="check" /></span></div>
          </header>
          <div className="work-flow"><b>填报流程</b><span>选择模板</span><Ic n="chevR" /><span>确认填报人</span><Ic n="chevR" /><span>AI 填写</span><Ic n="chevR" /><span>核对与导出</span></div>
          <div className="grid2">
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="ch">
                <div className="chip-ic deep"><Ic n="form" /></div>
                <div><div className="t">常用模板</div><div className="sub">选用后立即开始 AI 填报</div></div>
                <button className="more" onClick={() => goto('library')}>全部模板<Ic n="chevR" /></button>
              </div>
              {presetT.some(t => t.status !== 0)
                ? <div className="work-templates">{presetT.filter(t => t.status !== 0).slice(0, 4).map((t) => <TplCard key={t.id} t={t} ctx="home" />)}</div>
                : templateEmpty}
            </div>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="ch">
                <div className="chip-ic"><Ic n="hist" /></div>
                <div><div className="t">最近填报</div><div className="sub">查看近期材料的完成度与填报详情</div></div>
                <button className="more" onClick={() => goto('records')}>查看全部<Ic n="chevR" /></button>
              </div>
              <div className="rec-strip">
                {recordError ? recordFailure : rec.rows.length ? rec.rows.slice(0, 5).map((r) => {
                  const [c, txt] = STMAP[r.status] || ['n', r.status];
                  return (
                    <div className="rec-row" key={r.id} onClick={() => openRec(r)}>
                      <div className="rr-ic" style={{ background: r.status === 'done' ? 'var(--ok-bg)' : r.status === 'todo' ? 'var(--warn-bg)' : 'var(--fill)', color: r.status === 'done' ? 'var(--ok-t)' : r.status === 'todo' ? 'var(--warn-t)' : 'var(--ink3)' }}><Ic n={r.status === 'draft' ? 'edit' : 'file'} /></div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <b>{r.name}</b>
                        <div className="rr-sub">{r.teacherName} · {r.fillCount}/{r.totalCount} 项</div>
                      </div>
                      <span className={`pill ${c}`}>{txt}</span>
                      <span className="rr-time">{String(r.createdAt || '').slice(5, 10)}</span>
                    </div>
                  );
                }) : <div className="empty"><Ic n="hist" /><b>暂无填报记录</b><span>点击「新建填报」创建第一份材料</span></div>}
              </div>
            </div>
          </div>
          <section className="source-panel"><h3>校内数据来源</h3><div className="source-list">{DSRC.filter(d => d.t !== '自定义模板').map(d => <div key={d.t}><Ic n={d.icon} /><div><b>{d.t}</b><small>{d.s}</small></div></div>)}</div></section>
        </div>

        {/* ============ 模板选择 ============ */}
        <div className={`fview${view === 'templates' ? ' on' : ''}`}>
          {isAdmin && <div className="card" style={{ padding: '22px 24px', marginBottom: 18 }}>
            <div className="ch" style={{ marginBottom: 16 }}>
              <div className="chip-ic deep"><Ic n="upload" /></div>
              <div><div className="t">上传自定义模板</div><div className="sub">支持 Word / Excel / PDF，系统将自动解析表格结构并建立字段映射{isAdmin ? '' : '（请联系管理员上传）'}</div></div>
            </div>
            <div
              className="upzone"
              onClick={() => isAdmin && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); if (isAdmin) onFile(e.dataTransfer.files[0]); }}
            >
              <div className="uz-ic"><Ic n="upload" /></div>
              <b>拖拽文件到此处，或点击选择上传</b>
              <span>上传后系统解析模板结构，生成字段清单，确认后进入 AI 填报流程</span>
              <div className="fmt">
                <span className="f-pill" style={{ color: '#2B579A' }}><Ic n="file" />Word .docx</span>
                <span className="f-pill" style={{ color: '#217346' }}><Ic n="file" />Excel .xlsx</span>
                <span className="f-pill" style={{ color: '#C4342B' }}><Ic n="file" />PDF .pdf</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".docx,.xlsx,.pdf" style={{ display: 'none' }} onChange={(e) => { onFile(e.target.files[0]); e.target.value = ''; }} />
          </div>}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div className="ch">
              <div className="chip-ic"><Ic n="star" /></div>
              <div><div className="t">选择填报模板</div><div className="sub">选用模板后，确认本次材料的填报人</div></div>
            </div>
            <div className="grid4">
              {shownTemplates.some(t => t.status !== 0) ? shownTemplates.filter(t => t.status !== 0).map((t) => <TplCard key={t.id} t={t} ctx="tpl" />)
                : <div style={{ gridColumn: '1/-1' }}>{templateEmpty}</div>}
            </div>
          </div>
        </div>

        {/* ============ 填报向导 ============ */}
        <div className={`fview${view === 'wizard' && wiz.open ? ' on' : ''}`}>
          <div className="wz-head">
            <button className="wz-back" title="返回模板选择" onClick={() => goto('templates')}><Ic n="arrowL" /></button>
            <div className="wz-title">
              <b>{wiz.tpl?.name || '—'}</b>
              <span>{wiz.tpl?.source === 'custom' || wiz.tpl?.source === 'upload' ? '自定义模板' : '预置模板'} · 字段映射已建立</span>
            </div>
            <div className="wz-steps">
              <div className={wizStepCls(1)}><span className="n">{wiz.step > 1 ? <Ic n="check" /> : '1'}</span><span className="txt">选择填报人</span></div>
              <span className="wz-sep" />
              <div className={wizStepCls(2)}><span className="n">{wiz.step > 2 ? <Ic n="check" /> : '2'}</span><span className="txt">AI 识别与填写</span></div>
              <span className="wz-sep" />
              <div className={wizStepCls(3)}><span className="n">3</span><span className="txt">预览与导出</span></div>
            </div>
          </div>

          {/* 步骤 1：选择填报人 */}
          <div className={`wz-step${wiz.step === 1 ? ' on' : ''}`}>
            <div className="card" style={{ padding: '22px 24px' }}>
              <div className="ch">
                <div className="chip-ic"><Ic n="user" /></div>
                <div><div className="t">选择填报人</div><div className="sub">默认使用当前登录身份，也可为部门内其他教师代填</div></div>
                <div className="srch" style={{ marginLeft: 'auto', maxWidth: 260 }}>
                  <Ic n="search" />
                  <input
                    placeholder="搜索姓名或工号…"
                    value={pickQ}
                    onChange={(e) => { setPickQ(e.target.value); loadTeachers(e.target.value); }}
                  />
                </div>
              </div>
              <div className="pick-grid" style={{ marginTop: 6 }}>
                {teachers.length ? teachers.map((t) => {
                  const on = wiz.teacher?.zgh === t.zgh;
                  const isMe = user && (t.name === user.nickname || t.name === user.username);
                  return (
                    <div className={`pick${on ? ' on' : ''}`} key={t.zgh || t.id} onClick={() => setWiz((w) => ({ ...w, teacher: t }))}>
                      <div className="p-done"><Ic n="check" /></div>
                      <div className="p-av" style={{ background: isMe ? 'var(--grad)' : 'linear-gradient(135deg,#64748B,#94A3B8)' }}>{(t.name || '?')[0]}</div>
                      <div className="p-nm">{t.name}{isMe && <span className="pill b">当前登录</span>}</div>
                      <div className="p-zgh">工号 {t.zgh}{t.college ? ` · ${t.college}` : ''}</div>
                      <div className="p-tags">
                        {t.zc && <span className="pill n">{t.zc}</span>}
                        {t.gender && <span className="pill n">{t.gender}{t.age ? ` · ${t.age} 岁` : ''}</span>}
                        {t.status && <span className="pill n">{t.status}</span>}
                      </div>
                    </div>
                  );
                }) : <div className="empty" style={{ gridColumn: '1/-1' }}><Ic n="search" /><b>未找到匹配的教师</b><span>请确认姓名或工号后重试</span></div>}
              </div>
            </div>
            <div className="wz-foot">
              <div className="wf-stat"><Ic n="lock" /><span>填报数据仅本人与所在学院管理员可见</span></div>
              <button className="btn" onClick={() => goto('templates')}>取消</button>
              <button className="btn pri" disabled={!wiz.teacher || uploading} onClick={() => beginFill(wiz.teacher)}>
                {uploading ? '创建任务中…' : <><Ic n="wand" />开始 AI 填写</>}
              </button>
            </div>
          </div>

          {/* 步骤 2：AI 填写 */}
          <div className={`wz-step${wiz.step === 2 ? ' on' : ''}`}>
            <div className="pipe">
              {[
                { id: 'parse', icon: 'form', b: '解析模板结构' },
                { id: 'fetch', icon: 'db', b: '检索教师数据仓' },
                { id: 'generate', icon: 'ai', b: '生成填报内容' },
              ].map((s, i) => (
                <React.Fragment key={s.id}>
                  {i > 0 && <div className={`p-sep${wiz.pipeState[[['parse', 'fetch', 'generate'][i - 1]]] === 'done' ? ' done' : ''}`}><i /></div>}
                  <div className={`pl${wiz.pipeState[s.id] === 'live' ? ' live' : wiz.pipeState[s.id] === 'done' ? ' done' : ''}`}>
                    <div className="pi"><Ic n={s.icon} /><span className="spin" /></div>
                    <div><b>{s.b}</b><span>{wiz.pipe[s.id] || '待开始'}</span></div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="wz2">
              <div className="ftree">
                <div className="ft-h"><Ic n="list" />字段总览</div>
                {GROUPS.map((g) => {
                  const { fs, dn } = groupCount(g.id);
                  if (!fs.length) return null;
                  return (
                    <div
                      className="ft-g"
                      key={g.id}
                      onClick={() => { const el = document.getElementById(`fa-fg-${g.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    >
                      <div className="fg-n" style={{ background: g.bg, color: g.c }}>{g.n}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <b>{g.name}</b>
                        <div className="fg-c"><span className="num">{fs.length}</span> 项 · <span className="num">{dn}</span> 已填</div>
                      </div>
                      <div className="fg-bar"><i style={{ width: `${fs.length ? (dn / fs.length) * 100 : 0}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              <div className="fld-wrap">
                {GROUPS.map((g) => {
                  const items = wiz.fields.map((f, i) => ({ f, i })).filter((x) => x.f && x.f.g === g.id);
                  if (!items.length) return null;
                  return (
                    <div className="fgroup" id={`fa-fg-${g.id}`} key={g.id}>
                      <div className="fg-head">
                        <div className="fg-n" style={{ background: g.bg, color: g.c }}>{g.n}</div>
                        <b>{g.name}</b>
                        <span>{items.length} 项</span>
                        <span className="pill b">{g.id === 'g3' || g.id === 'g6' ? '大模型起草 + 数仓直填' : '数仓直填'}</span>
                      </div>
                      {items.map((x) => <FieldRow key={x.i} f={x.f} i={x.i} />)}
                    </div>
                  );
                })}
                {!wiz.fields.length && <div className="empty"><Ic n="form" /><b>正在解析模板字段…</b><span>解析完成后此处显示全部填报字段</span></div>}
              </div>
            </div>
            <div className="wz-foot">
              <div className="wf-stat">
                <b>{wiz.filled}/{wiz.total || '—'}</b>
                <div className="track" style={{ flex: 1, maxWidth: 300 }}><i style={{ width: `${wiz.total ? (wiz.filled / wiz.total) * 100 : 0}%` }} /></div>
                <span>{wiz.finished ? 'AI 填写完成，请核对带「大模型起草」标记的内容' : 'AI 正在填写…'}</span>
              </div>
              <button className="btn" onClick={() => { if (esRef.current) esRef.current.close(); setWiz((w) => ({ ...w, step: 1, running: false })); }}>上一步</button>
              <button className="btn pri" disabled={!wiz.finished} onClick={() => setWiz((w) => ({ ...w, step: 3 }))}>预览与导出<Ic n="chevR" /></button>
            </div>
          </div>

          {/* 步骤 3：预览与导出 */}
          <div className={`wz-step${wiz.step === 3 ? ' on' : ''}`}>
            <div className="pv-shell">
              <div className="pv-bar">
                <div className="ch" style={{ margin: 0 }}>
                  <div className="chip-ic deep"><Ic n="file" /></div>
                  <div><div className="t">{wiz.tpl?.name}</div><div className="sub">填报人：{wiz.teacher?.name || '—'} · 生成于 {new Date().toLocaleString('zh-CN', { hour12: false })}</div></div>
                </div>
                <span className="tb-sp" />
                <span className="pill g"><Ic n="check" />{wiz.total - needCount} 项已填写</span>
                {needCount > 0 && <span className="pill o"><Ic n="alert" />{needCount} 项待补充</span>}
              </div>
              <div className="pv-doc">
                <div className="pv-title">{wiz.tpl?.name}</div>
                <div className="pv-sub">填报人：{wiz.teacher?.name}（工号 {wiz.teacher?.zgh}）　　填报日期：{new Date().toISOString().slice(0, 10)}</div>
                <table className="form">
                  <tbody>
                    {GROUPS.map((g) => {
                      const items = wiz.fields.map((f, i) => ({ f, i })).filter((x) => x.f && x.f.g === g.id);
                      if (!items.length) return null;
                      return (
                        <React.Fragment key={g.id}>
                          <tr><th colSpan={2} style={{ background: g.bg, color: g.c, fontWeight: 700 }}>{g.name}</th></tr>
                          {items.map((x) => (
                            <tr key={x.i}>
                              <td className="lbl" style={{ width: 200 }}>{x.f.label}</td>
                              <td
                                className={(x.f.val || '').trim() ? 'val' : 'empty'}
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => editField(x.i, e.currentTarget.textContent.trim())}
                              >{(x.f.val || '').trim() || '待补充'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div className="pv-note"><Ic n="info" />黄色底纹为可编辑单元格，点击直接修改；导出 Word / Excel 即时下载，PDF 使用浏览器打印。数据来源可在填报页查看溯源。</div>
                <div className="pv-actions">
                  <button className="btn" onClick={() => setWiz((w) => ({ ...w, step: 2 }))}><Ic n="arrowL" />返回修改</button>
                  <button className="btn" onClick={() => exportAs('docx')}><Ic n="download" style={{ color: '#2B579A' }} />导出 Word</button>
                  <button className="btn" onClick={() => exportAs('xlsx')}><Ic n="download" style={{ color: '#217346' }} />导出 Excel</button>
                  <button className="btn" onClick={() => exportAs('pdf')}><Ic n="download" style={{ color: '#C4342B' }} />导出 PDF</button>
                  <button className="btn pri" onClick={saveRecord}><Ic n="check" />保存至填报记录</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ 填报记录 ============ */}
        <div className={`fview${view === 'records' ? ' on' : ''}`}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div className="ch">
              <div className="chip-ic"><Ic n="hist" /></div>
              <div><div className="t">填报记录</div><div className="sub">所有生成记录留痕可追溯，支持查看详情与删除</div></div>
              <button className="btn pri sm" style={{ marginLeft: 'auto' }} onClick={() => goto('templates')}><Ic n="plus" />新建填报</button>
            </div>
            <div className="filterbar">
              <div className="srch"><Ic n="search" /><input placeholder="搜索任务名称 / 填报人…" value={rec.keyword} onChange={(e) => loadRecords({ keyword: e.target.value, page: 1 })} /></div>
              <div className="sel">
                <select value={rec.status} onChange={(e) => loadRecords({ status: e.target.value, page: 1 })}>
                  <option value="">全部状态</option>
                  <option value="done">已完成</option>
                  <option value="todo">待补充</option>
                  <option value="draft">进行中</option>
                </select>
              </div>
              <div className="sel">
                <select value={rec.tplName} onChange={(e) => loadRecords({ tplName: e.target.value, page: 1 })}>
                  <option value="">全部模板</option>
                  {templates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            </div>
            {recordError ? recordFailure : rec.rows.length ? (
              <>
                <div className="table-scroll"><table className="table">
                  <thead>
                    <tr><th>任务名称</th><th>模板</th><th>填报人</th><th style={{ textAlign: 'center' }}>完成度</th><th>状态</th><th>导出</th><th>时间</th><th style={{ textAlign: 'right' }}>操作</th></tr>
                  </thead>
                  <tbody>
                    {rec.rows.map((r) => {
                      const [c, txt] = STMAP[r.status] || ['n', r.status];
                      return (
                        <tr className="rowlink" key={r.id} onClick={() => openRec(r)}>
                          <td><div className="tmain">{r.name}</div></td>
                          <td><div className="tsub" style={{ color: 'var(--ink2)', fontSize: 12.5 }}>{r.templateName}</div></td>
                          <td>{r.teacherName}</td>
                          <td style={{ textAlign: 'center' }}><span className="num">{r.fillCount}</span><span style={{ color: 'var(--ink3)' }}> / {r.totalCount}</span></td>
                          <td><span className={`pill ${c}`}>{txt}</span></td>
                          <td><span style={{ fontSize: 12, color: r.exportFormats ? 'var(--ink2)' : 'var(--ph)' }}>{r.exportFormats || '—'}</span></td>
                          <td><span style={{ fontSize: 12, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>{String(r.createdAt || '').slice(0, 16)}</span></td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button className="btn sm" onClick={(e) => { e.stopPropagation(); openRec(r); }}><Ic n="eye" />查看</button>
                            <button className="btn sm dgr" title="删除" style={{ marginLeft: 6 }} onClick={(e) => { e.stopPropagation(); setDelRecRow(r); }}><Ic n="trash" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                <div className="pager">
                  <span className="pg-info">共 {rec.total} 条记录</span>
                  <button disabled={rec.page <= 1} onClick={() => loadRecords({ page: rec.page - 1 })}><Ic n="chevR" style={{ transform: 'rotate(180deg)', width: 13, height: 13 }} /></button>
                  {Array.from({ length: Math.max(1, Math.ceil(rec.total / rec.size)) }, (_, i) => (
                    <button key={i + 1} className={rec.page === i + 1 ? 'on' : ''} onClick={() => loadRecords({ page: i + 1 })}>{i + 1}</button>
                  ))}
                  <button disabled={rec.page >= Math.ceil(rec.total / rec.size)} onClick={() => loadRecords({ page: rec.page + 1 })}><Ic n="chevR" style={{ width: 13, height: 13 }} /></button>
                  <span className="pg-sz">每页
                    <select value={rec.size} onChange={(e) => loadRecords({ size: +e.target.value, page: 1 })}>
                      {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  条</span>
                </div>
              </>
            ) : <div className="empty"><Ic n="hist" /><b>暂无符合条件的记录</b><span>调整筛选条件，或开始一次新的填报</span></div>}
          </div>
        </div>

        {/* ============ 模板库 ============ */}
        <div className={`fview${view === 'library' ? ' on' : ''}`}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div className="ch">
              <div className="chip-ic"><Ic n="file" /></div>
              <div><div className="t">模板库</div><div className="sub">预置模板由信息中心维护；自定义模板上传后自动建立字段映射，二次使用直接复用{isAdmin ? '，点击卡片可编辑名称、说明与启停' : ''}</div></div>
              {isAdmin && <button className="btn pri sm" style={{ marginLeft: 'auto' }} onClick={() => { goto('templates'); setTimeout(() => fileRef.current?.click(), 400); }}><Ic n="upload" />上传新模板</button>}
            </div>
            <div className="grid4" style={{ marginTop: 6 }}>
              {!shownTemplates.length && <div style={{ gridColumn: '1/-1' }}>{templateEmpty}</div>}
              {[...presetT, ...customT].map((t) => <TplCard key={t.id} t={t} ctx="lib" />)}
            </div>
          </div>
        </div>

        {/* ============ 上传解析弹层 ============ */}
        {upModal && (
          <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget && !uploading) setUpModal(null); }}>
            <div className="modal">
              <div className="m-h"><div className="chip-ic deep"><Ic n="upload" /></div><b>模板解析</b><button className="m-x" onClick={() => !uploading && setUpModal(null)}><Ic n="x" /></button></div>
              <div className="m-b">
                <div className="up-flow">
                  <div className="up-file">
                    <div className="uf-ic" style={{ background: '#EAF0FB', color: '#2B579A' }}><Ic n="file" /></div>
                    <div style={{ minWidth: 0 }}>
                      <b>{upModal.fileName}</b>
                      <span>{upModal.meta}</span>
                    </div>
                  </div>
                  {[
                    { ic: 'file', b: '读取文件内容', s: '提取文本、表格结构与合并单元格' },
                    { ic: 'search', b: '识别填报字段', s: '区分固定字段、空填写项与说明文字' },
                    { ic: 'wand', b: '建立数据映射', s: '将字段与教师数据仓口径对齐' },
                  ].map((s, i) => (
                    <div className={`ups${upModal.step > i + 1 || upModal.result ? ' done' : uploading ? ' live' : ''}`} key={s.b}>
                      <div className="u-ic"><Ic n={s.ic} /><span className="spin" /></div>
                      <div><b>{s.b}</b><span>{s.s}</span></div>
                    </div>
                  ))}
                  {upModal.result && (
                    <div className="up-result on">
                      <Ic n="check" />
                      <div>
                        <b>解析完成</b>
                        <p>识别出 {upModal.result.fieldCount ?? '—'} 项填报字段，已与教师数据仓口径建立自动映射。可直接开始填报，或仅存入模板库供以后使用。</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="m-f">
                <button className="btn" onClick={() => setUpModal(null)}>取消</button>
                <button className="btn" disabled={!upModal.result} onClick={onlySave}>仅存入模板库</button>
                <button className="btn pri" disabled={!upModal.result} onClick={useUploaded}><Ic n="wand" />保存并开始填报</button>
              </div>
            </div>
          </div>
        )}

        {/* ============ 模板编辑弹层 ============ */}
        {editTpl && (
          <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) setEditTpl(null); }}>
            <div className="modal" style={{ width: 480 }}>
              <div className="m-h"><div className="chip-ic"><Ic n="edit" /></div><b>编辑模板</b><button className="m-x" onClick={() => setEditTpl(null)}><Ic n="x" /></button></div>
              <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>模板名称</div>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--line)', borderRadius: 10, padding: '9px 13px', fontSize: 13.5, outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>模板说明</div>
                  <textarea
                    value={editForm.description}
                    rows={3}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--line)', borderRadius: 10, padding: '9px 13px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>状态</div>
                  <div className="sel">
                    <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: +e.target.value }))}>
                      <option value={1}>启用（用户可见可用）</option>
                      <option value={0}>停用（仅管理员可见）</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>字段数 {editTpl.fieldCount ?? '—'} 项 · 来源 {editTpl.source === 'custom' || editTpl.source === 'upload' ? '自定义上传' : '预置'} · 创建于 {editTpl.createdAt || '—'}</div>
              </div>
              <div className="m-f">
                <button className="btn" onClick={() => setEditTpl(null)}>取消</button>
                <button className="btn dgr" onClick={() => { setDelTpl(editTpl); }}><Ic n="trash" />删除</button>
                <button className="btn pri" onClick={saveEdit}>保存修改</button>
              </div>
            </div>
          </div>
        )}

        {/* ============ 删除确认弹层 ============ */}
        {(delTpl || delRecRow) && (
          <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) { setDelTpl(null); setDelRecRow(null); } }}>
            <div className="modal" style={{ width: 420 }}>
              <div className="m-h"><div className="chip-ic" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}><Ic n="trash" /></div><b>{delRecRow ? '删除填报记录' : '删除模板'}</b><button className="m-x" onClick={() => { setDelTpl(null); setDelRecRow(null); }}><Ic n="x" /></button></div>
              <div className="m-b"><p style={{ fontSize: 13.5, color: 'var(--ink2)' }}>删除后<strong style={{ color: 'var(--ink)' }}>「{delRecRow ? delRecRow.name : delTpl?.name}」</strong>将不可恢复，导出过的文件不受影响。确定删除吗？</p></div>
              <div className="m-f">
                <button className="btn" onClick={() => { setDelTpl(null); setDelRecRow(null); }}>取消</button>
                <button
                  className="btn dgr"
                  onClick={() => {
                    if (delRecRow) { doDelRec(delRecRow); setDelRecRow(null); }
                    else if (delTpl) { setEditTpl(null); doDeleteTpl(); }
                  }}
                >确认删除</button>
              </div>
            </div>
          </div>
        )}

        {/* ============ 使用帮助弹层 ============ */}
        {helpOn && (
          <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) setHelpOn(false); }}>
            <div className="modal" style={{ width: 540 }}>
              <div className="m-h"><div className="chip-ic deep"><Ic n="guide" /></div><b>使用帮助</b><button className="m-x" onClick={() => setHelpOn(false)}><Ic n="x" /></button></div>
              <div className="m-b">
                {HELPS.map((h) => (
                  <details key={h[0]} open style={{ border: '1px solid var(--line2)', borderRadius: 10, padding: '0 14px', marginBottom: 9 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13.5, fontWeight: 600, padding: '12px 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Ic n="guide" style={{ width: 15, height: 15, color: 'var(--pri)' }} />{h[0]}
                    </summary>
                    <p style={{ fontSize: 13, color: 'var(--ink2)', padding: '0 0 13px 23px', lineHeight: 1.7 }}>{h[1]}</p>
                  </details>
                ))}
              </div>
              <div className="m-f"><button className="btn pri" onClick={() => setHelpOn(false)}>我知道了</button></div>
            </div>
          </div>
        )}

        {/* ============ 通知弹层 ============ */}
        {bellOn && (
          <div className="mask on" style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: '70px 26px 24px' }} onClick={(e) => { if (e.target === e.currentTarget) setBellOn(false); }}>
            <div className="modal" style={{ width: 380 }}>
              <div className="m-h"><b style={{ fontSize: 15 }}>通知</b><button className="m-x" onClick={() => setBellOn(false)}><Ic n="x" /></button></div>
              <div className="m-b" style={{ padding: '8px 10px' }}>
                {(rec.rows || []).slice(0, 3).map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 11, padding: 11, borderBottom: '1px solid var(--line2)', cursor: 'pointer', borderRadius: 8 }} onClick={() => { setBellOn(false); openRec(r); }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pri)', marginTop: 7, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13 }}>{r.templateName}</b>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 1 }}>{r.name} · {r.fillCount}/{r.totalCount} 项</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ph)', whiteSpace: 'nowrap' }}>{String(r.createdAt || '').slice(5, 10)}</span>
                  </div>
                ))}
                {!rec.rows.length && <div style={{ fontSize: 12.5, color: 'var(--ink3)', padding: 10 }}>暂无通知，开始一次填报后会在此提醒。</div>}
              </div>
            </div>
          </div>
        )}

        {/* ============ 抽屉：详情 ============ */}
        <div className={`drawer-mask${drawer ? ' on' : ''}`} onClick={() => setDrawer(null)} />
        <aside className={`drawer${drawer ? ' on' : ''}`}>
          <div className="m-h"><b>{drawer?.title || '详情'}</b><button className="m-x" onClick={() => setDrawer(null)}><Ic n="x" /></button></div>
          <div className="d-b">{drawer?.body}</div>
        </aside>

        {/* ============ AI 助手 ============ */}
        <button className="fab" title="填报助手" onClick={() => {
          setAiOn((v) => !v);
          setAiMsgs((m) => (m.length ? m : [{ role: 'a', text: '您好，我是填报助手。关于字段口径、数据来源、内容润色或导出版式的问题，都可以直接问我。' }]));
        }}><Ic n="bot" /></button>
        <div className={`ai-panel${aiOn ? ' on' : ''}`}>
          <div className="ap-h">
            <div className="ap-av"><Ic n="bot" /></div>
            <div style={{ flex: 1, minWidth: 0 }}><b>填报助手</b><span>数据检索 · 内容润色 · 表格问题答疑</span></div>
            <button className="m-x" onClick={() => setAiOn(false)}><Ic n="x" /></button>
          </div>
          <div className="ai-msgs">
            {aiMsgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.text}{m.typing && <span className="cur" />}</div>
            ))}
          </div>
          <div className="ai-chips">
            {AI_SUGG.map((s) => <button key={s} className="ai-chip" onClick={() => aiSend(s)}>{s}</button>)}
          </div>
          <div className="ai-in">
            <input
              placeholder="询问填报相关问题…"
              maxLength={120}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') aiSend(); }}
            />
            <button onClick={() => aiSend()}><Ic n="send" /></button>
          </div>
        </div>

        {/* ============ toast ============ */}
        <div className={`toast${toastMsg ? ' on' : ''}`}><Ic n="check" /><span>{toastMsg}</span></div>
      </div>
    </PageLayout>
  );
}


