import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listKbs, createKb, listFiles, deleteFile, rebuildFile, searchInKb } from '../api/kb';
import { apiBase } from '../api/request';
import { Icon, XixiLoading, Pager } from './ui.jsx';

/* ============ 知识库中心频道 ============
   交互定稿依据 docs/知识库中心_原型.html（2026-11-22 用户逐轮打磨版）：
   三Tab / 新建弹窗(三选可见范围) / 真上传+拖拽 / 里程碑流水线 / 文件表双粒度 / 查询测试面板 */

const STAGES = [
  { key: 'upload', label: '上传' },
  { key: 'clean', label: '清洗' },
  { key: 'chunk', label: '切块' },
  { key: 'qa', label: '生成问答' },
  { key: 'embed', label: '向量化' },
  { key: 'store', label: '入库' },
];

const fmtSize = (b) => {
  if (b == null) return '—';
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
};

function scoreTag(s) {
  const cls = s >= 0.85 ? 'green' : s >= 0.7 ? 'amber' : 'grey';
  return <span className={`tag ${cls}`}>{Math.round(s * 100)}%</span>;
}

/* ---------- 里程碑流水线（读 kb_file.status/stage） ---------- */
function Pipeline({ file }) {
  // stage 可带进度：如 "qa:12/38"、"embed:40/152"
  const stageRaw = file.stage || '';
  const stageKey = stageRaw.split(':')[0];
  const stageProg = stageRaw.indexOf(':') > -1 ? stageRaw.split(':')[1] : '';
  const curIdx = STAGES.findIndex((s) => s.key === stageKey);
  const failed = file.status === 'failed';
  const done = file.status === 'done';
  return (
    <div className="kbx-pipe">
      <div className="kbx-pipe-head">
        <span className="fn">{file.name} · {fmtSize(file.sizeBytes)}</span>
        <span className={`st ${done ? 'ok' : failed ? 'err' : ''}`}>
          {done ? '已完成' : failed ? '失败' : '处理中'}
        </span>
      </div>
      <div className="kbx-pipe-steps">
        {STAGES.map((s, i) => {
          const state = done || i < curIdx ? 'done' : i === curIdx ? (failed ? 'err' : 'run') : '';
          return (
            <div key={s.key} className={`kbx-pstep ${state}`}>
              <span className="kbx-pdot">{state === 'done' ? '✓' : i + 1}</span>
              <div className="nm">{s.label}{state === 'run' && stageProg ? <span className="pg">{stageProg}</span> : ''}</div>
            </div>
          );
        })}
      </div>
      {failed && file.errorMsg && <div className="kbx-pipe-err">失败原因：{file.errorMsg}</div>}
      {!failed && !done && stageKey === 'qa' && <div className="kbx-pipe-note">后台生成问答对中{stageProg ? '（' + stageProg + '）' : ''} · 可离开页面，完成后会提示</div>}
      {done && <div className="kbx-pipe-note">✓ 已入库：{file.chunkCount} 个原文块 + {file.qaCount} 条问答对，即刻可检索</div>}
    </div>
  );
}

/* ---------- 查询测试面板 ---------- */
function TestPanel({ kbId, toast }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!q.trim() || busy) return;
    setBusy(true); setResult(null);
    try {
      const r = await searchInKb(kbId, q.trim());
      setResult(r);
    } catch (e) {
      toast(e.message || '检索失败');
    } finally { setBusy(false); }
  };

  return (
    <div className="kbx-test">
      <div className="kbx-test-head">
        <div className="c-ic"><Icon name="search" size={16} /></div>
        <div>
          <div className="t">查询测试</div>
          <div className="s">直接检索问答对与原文块 · 验证入库效果</div>
        </div>
      </div>
      <div className="kbx-test-input">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="输入问题或关键词，如：网络故障找谁？" />
        <button className="btn-primary" onClick={run} disabled={busy}>检索</button>
      </div>
      <div className="kbx-test-body">
        {!result && !busy && (
          <div className="kbx-test-empty">
            <div className="te-t">上传并处理后，在这里验证检索</div>
            <div className="te-d">输入问题直接检索本库的问答对与原文块，查看相关度与出处</div>
          </div>
        )}
        {busy && <div className="kbx-test-load">混合检索中 · 问答对 + 原文块…</div>}
        {result && (
          <>
            {(result.hits || []).map((h, i) => (
              <div key={i} className="kbx-hit">
                <div className="kbx-hit-head">
                  <span className={`tag ${h.type === 'qa' ? 'blue' : 'grey'}`}>{h.type === 'qa' ? '问答对' : '原文块'}</span>
                  {scoreTag(h.score)}
                  <span className="kbx-hit-src">{h.doc}{h.loc ? ' · ' + h.loc : ''}</span>
                </div>
                {h.type === 'qa'
                  ? <><div className="kbx-hit-q">Q：{h.q}</div><div className="kbx-hit-a">{h.a}</div></>
                  : <div className="kbx-hit-raw">{(h.txt || '').slice(0, 400)}{(h.txt || '').length > 400 ? '…' : ''}</div>}
              </div>
            ))}
            <div className="kbx-test-sum">
              共命中 <b>{(result.hits || []).length}</b> 条（问答对 {result.summary?.qa ?? 0} · 原文块 {result.summary?.raw ?? 0}）
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 库详情 ---------- */
function KbDetail({ kb, onBack, toast, user }) {
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [qaView, setQaView] = useState(null);
  const [fpage, setFpage] = useState(1);
  const [nameTip, setNameTip] = useState(null); // 文件名悬浮提示 {text,x,y} 视口坐标，跟随光标
  const PAGE_SIZE = 10;
  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const tipTimer = useRef(null);

  // 悬满 3 秒才显示文件名提示；显示后跟随光标移动；离开即清除
  const enterName = (f, e) => {
    clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => {
      setNameTip({ text: f.name, x: e.clientX, y: e.clientY });
    }, 3000);
  };
  const moveName = (e) => {
    setNameTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
  };
  const leaveName = () => {
    clearTimeout(tipTimer.current);
    setNameTip(null);
  };
  useEffect(() => () => clearTimeout(tipTimer.current), []);

  const load = useCallback(() => {
    listFiles(kb.id).then((f) => setFiles(f || [])).catch((e) => {
      setFiles([]); toast(e.message || '文件加载失败');
    });
  }, [kb.id, toast]);
  useEffect(() => { load(); }, [load]);

  // 轮询：有处理中的文件时每2.5s刷新
  useEffect(() => {
    const hasActive = (files || []).some((f) => f.status === 'pending' || f.status === 'processing');
    if (!hasActive) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(load, 2500);
    return () => clearInterval(timerRef.current);
  }, [files, load]);

  const upload = async (fileList) => {
    const ok = [], rej = [];
    for (const f of fileList) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!['pdf', 'docx', 'txt', 'md'].includes(ext)) { rej.push(f.name + '（格式不支持）'); continue; }
      if (f.size > 50 * 1024 * 1024) { rej.push(f.name + '（超 50MB）'); continue; }
      ok.push(f);
    }
    if (rej.length) toast('已跳过：' + rej.join('、'));
    if (!ok.length) return;
    setUploading(true);
    try {
      for (const f of ok) {
        const fd = new FormData();
        fd.append('file', f);
        const token = localStorage.getItem('user_token');
        await fetch(`${apiBase}/kb/${kb.id}/files`, {
          method: 'POST', body: fd,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(async (r) => {
          const j = await r.json().catch(() => ({}));
          if (r.status !== 200 || j.code !== 200) throw new Error(j.message || '上传失败');
        });
      }
      toast(ok.length > 1 ? `已提交 ${ok.length} 个文件到后台处理，可离开页面，完成后会提示` : `已提交「${ok[0].name}」到后台处理，可离开页面，完成后会提示`);
      load();
    } catch (e) {
      toast(e.message || '上传失败');
    } finally { setUploading(false); }
  };

  const del = async (fid) => {
    if (!window.confirm('删除后该文件的向量同步移除，确定？')) return;
    try { await deleteFile(kb.id, fid); toast('已删除'); load(); } catch (e) { toast(e.message || '删除失败'); }
  };

  const rebuild = async (fid) => {
    try { await rebuildFile(kb.id, fid); toast('已重新入队处理'); load(); } catch (e) { toast(e.message || '操作失败'); }
  };

  const processing = (files || []).filter((f) => f.status === 'pending' || f.status === 'processing');
  const doneFiles = (files || []).filter((f) => f.status === 'done' || f.status === 'failed');
  const totalPages = Math.max(1, Math.ceil(doneFiles.length / PAGE_SIZE));
  const curPage = Math.min(fpage, totalPages);
  const pagedFiles = doneFiles.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <>
      <div className="v2-sec-head kbx-detail-head">
        <a className="v2t-back" onClick={onBack} role="button" tabIndex={0}>
          <Icon name="back" size={14} />返回频道
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2>{kb.name}</h2>
          <span className="tag blue">{kb.visibility === 'private' ? '私有' : kb.visibility === 'dept' ? '部门库' : '公开'}</span>
        </div>
        <p>{kb.fileCount} 个文件{kb.chunkCount ? ` · ${kb.chunkCount} 原文块` : ''} · {kb.qaCount} 问答对 · {fmtSize(kb.sizeBytes)} / 500 MB</p>
      </div>
      <div className="v2-body kbx-detail">
        <div className="kbx-left">
          <div className={`kbx-upload${dragOver ? ' drag' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}>
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }}
              onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            <Icon name="upload" size={22} />
            <div className="t">{uploading ? '上传中…' : '点击或拖拽文件到此处上传'}</div>
            <div className="d">PDF / DOCX / TXT / MD · 单文件 ≤ 50MB · 上传后自动处理入库，无需任何后续操作</div>
          </div>
          {processing.map((f) => <Pipeline key={f.id} file={f} />)}
          <div className="kbx-files">
            <table className="v2-tbl">
              <thead><tr><th>文件</th><th>大小</th><th>问答对</th><th>状态</th><th style={{ width: 150 }}>操作</th></tr></thead>
              <tbody>
                {doneFiles.length === 0 && <tr><td colSpan={5} className="v2-empty-cell">暂无文件，上传第一个文档开始建库</td></tr>}
                {pagedFiles.map((f) => (
                  <tr key={f.id}>
                    <td className="kbx-fname" onMouseEnter={(e) => enterName(f, e)} onMouseMove={moveName} onMouseLeave={leaveName}><span className="kbx-fname-t"><span className={`kbx-fic ${f.ext}`}>{(f.ext || '').toUpperCase()}</span>{f.name}</span></td>
                    <td className="kbx-fsize">{fmtSize(f.sizeBytes)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{f.qaCount ?? '—'}{f.qaCount ? <span className="lnk" style={{ marginLeft: 8 }} onClick={() => setQaView(f)}>预览</span> : ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{f.status === 'done' ? <span className="tag green">已解析</span>
                      : f.status === 'failed' ? <span className="tag red" title={f.errorMsg}>失败</span>
                      : <span className="tag amber">{f.stage || '处理中'}</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {f.ext !== 'qa' && <span className="lnk" onClick={() => setPreview(f)}>预览</span>}
                      <span className="lnk" style={{ marginLeft: f.ext !== 'qa' ? 10 : 0 }} onClick={() => rebuild(f.id)}>重建索引</span>
                      <span className="lnk danger" style={{ marginLeft: 10 }} onClick={() => del(f.id)}>删除</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doneFiles.length > PAGE_SIZE && (
              <div className="kbx-pager-row">
                <span className="kbx-pager-total">共 {doneFiles.length} 个文件 · 第 {curPage}/{totalPages} 页</span>
                <Pager page={curPage} total={doneFiles.length} size={PAGE_SIZE} onPage={setFpage} />
              </div>
            )}
          </div>
        </div>
        <TestPanel kbId={kb.id} toast={toast} />
      </div>
      {preview && <FilePreview kbId={kb.id} file={preview} onClose={() => setPreview(null)} />}
      {qaView && <QaPreview kbId={kb.id} file={qaView} onClose={() => setQaView(null)} />}
      {nameTip && (
        <div className="kbx-name-tip" style={{
          left: Math.max(8, Math.min(nameTip.x + 14, window.innerWidth - 470)),
          top: Math.max(8, Math.min(nameTip.y + 18, window.innerHeight - 56)),
        }}>{nameTip.text}</div>
      )}
    </>
  );
}

/* 问答对预览弹层：展示该文件流水线自动生成的 QA 对 */
function QaPreview({ kbId, file, onClose }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${apiBase}/kb/${kbId}/files/${file.id}/qa`, { headers: authHeader() });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j || j.code !== 200) throw new Error((j && j.message) || `HTTP ${r.status}`);
        if (alive) setList(j.data || []);
      } catch (e) {
        if (alive) setErr(e.message || '加载失败');
      }
    })();
    return () => { alive = false; };
  }, [file.id]);
  return (
    <div className="kbx-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kbx-prev">
        <div className="kbx-prev-h">
          <span className="kbx-fic qa">QA</span>
          <span className="t">{file.name} · 问答对</span>
          <span className="lnk" onClick={onClose}>✕ 关闭</span>
        </div>
        <div className="kbx-prev-b">
          {err && <div className="v2-empty-cell">{err}</div>}
          {!err && list == null && <XixiLoading text="锡锡正在加载问答对…" />}
          {list != null && list.length === 0 && <div className="v2-empty-cell">该文件暂无问答对</div>}
          {list != null && list.length > 0 && (
            <div className="kbx-qa-list">
              <div className="kbx-qa-sum">共 {list.length} 条 · 由本文件自动生成，答案均取自原文</div>
              {list.map((p, i) => (
                <div className="kbx-qa-item" key={i}>
                  <div className="kbx-qa-q"><span className="n">Q{i + 1}</span>{p.q}{p.clause ? <span className="tag grey" style={{ marginLeft: 8 }}>{p.clause}</span> : ''}</div>
                  <div className="kbx-qa-a">{p.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* 文件预览弹层：pdf=浏览器原生 iframe / docx=mammoth 转 HTML / txt,md=pre 文本 */
function FilePreview({ kbId, file, onClose }) {
  const [docHtml, setDocHtml] = useState(null);
  const [txt, setTxt] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [err, setErr] = useState('');
  const ext = (file.ext || '').toLowerCase();
  const url = `${apiBase}/kb/${kbId}/files/${file.id}/preview`;

  useEffect(() => {
    let blobUrl = null;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(url, { headers: authHeader() });
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try {
            const j = JSON.parse(await r.text());
            if (j && j.message) msg = j.message;
          } catch { /* 非 JSON 错误体，保留状态码 */ }
          throw new Error(msg);
        }
        if (ext === 'txt' || ext === 'md') {
          if (alive) setTxt(await r.text());
        } else if (ext === 'docx') {
          const [buf, mod] = await Promise.all([r.arrayBuffer(), import('mammoth/mammoth.browser.js')]);
          const res = await mod.default.convertToHtml({ arrayBuffer: buf });
          if (alive && res && res.value) setDocHtml(res.value);
          else if (alive) setErr('文档解析失败');
        } else if (ext === 'pdf') {
          const b = await r.blob();
          blobUrl = URL.createObjectURL(b);
          if (alive) setPdfUrl(blobUrl);
        }
      } catch (e) {
        if (alive) setErr(e.message || '加载失败');
      }
    })();
    return () => { alive = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [file.id]);

  return (
    <div className="kbx-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kbx-prev">
        <div className="kbx-prev-h">
          <span className="kbx-fic {file.ext}">{ext.toUpperCase()}</span>
          <span className="t">{file.name}</span>
          <span className="lnk" onClick={onClose}>✕ 关闭</span>
        </div>
        <div className="kbx-prev-b">
          {err && <div className="v2-empty-cell">{err}</div>}
          {ext === 'pdf' && (pdfUrl ? <iframe src={pdfUrl} title={file.name} /> : !err && <XixiLoading text="锡锡正在加载文档…" />)}
          {ext === 'docx' && (docHtml ? <div className="kbx-prev-doc" dangerouslySetInnerHTML={{ __html: docHtml }} /> : !err && <XixiLoading text="锡锡正在解析文档…" />)}
          {(ext === 'txt' || ext === 'md') && (txt != null ? <pre className="kbx-prev-txt">{txt}</pre> : !err && <XixiLoading text="锡锡正在加载文档…" />)}
        </div>
      </div>
    </div>
  );
}

function authHeader() {
  const t = localStorage.getItem('user_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ---------- 新建弹窗 ---------- */
function NewKbDialog({ onClose, onCreated, toast }) {
  const [name, setName] = useState('');
  const [vis, setVis] = useState('private');
  const [busy, setBusy] = useState(false);
  const VIS = [
    { key: 'private', t: '私有', d: '仅自己可见' },
    { key: 'dept', t: '部门库', d: '本部门可读' },
    { key: 'public', t: '公开库', d: '审核后全校' },
  ];
  const create = async () => {
    if (!name.trim()) { toast('请填写库名称'); return; }
    setBusy(true);
    try {
      const id = await createKb({ name: name.trim(), visibility: vis });
      toast('知识库「' + name.trim() + '」已创建');
      onCreated(id);
    } catch (e) { toast(e.message || '创建失败'); }
    finally { setBusy(false); }
  };
  return (
    <div className="kbx-mask" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kbx-dlg">
        <div className="kbx-dlg-h"><span className="t">新建知识库</span><span className="lnk" onClick={onClose}>✕</span></div>
        <div className="kbx-dlg-b">
          <div className="kbx-fld">
            <label>库名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="如：科研项目管理资料" autoFocus />
            <div className="hint">30 字以内，创建后可在库详情修改</div>
          </div>
          <div className="kbx-fld">
            <label>可见范围</label>
            <div className="kbx-vis">
              {VIS.map((v) => (
                <div key={v.key} className={`kbx-vopt${vis === v.key ? ' on' : ''}`} onClick={() => setVis(v.key)}>
                  <div className="vt">{v.t}</div><div className="vd">{v.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="kbx-dlg-f">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={create} disabled={busy}>创建</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 频道主页 ---------- */
export default function V2Knowledge({ user, requireLogin, toast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeId = (location.pathname.match(/^\/kb\/(\d+)/) || [])[1];
  const [tab, setTab] = useState('pub');
  const [kbs, setKbs] = useState(null);
  const [err, setErr] = useState('');
  const [current, setCurrent] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    setErr('');
    listKbs(tab).then((r) => setKbs(r || [])).catch((e) => { setErr(e.message || '加载失败'); setKbs([]); });
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const openKb = (kb) => {
    if (!requireLogin()) { toast('知识库需要登录后使用'); return; }
    setCurrent(kb);
    navigate('/kb/' + kb.id);
  };

  // 浏览器返回（routeId 消失）自动回列表
  useEffect(() => {
    if (!routeId && current) { setCurrent(null); load(); }
  }, [routeId]);

  // 直链 #/kb/{id}：列表加载后自动打开；当前 Tab 没有 → 顺次换 Tab 找
  // user 进依赖：直链到达时登录态常在异步加载中（user=null），加载完成后重试打开，否则详情永远不开
  useEffect(() => {
    if (!routeId || current || !kbs) return;
    const kb = kbs.find((k) => String(k.id) === routeId);
    if (kb) { if (requireLogin()) setCurrent(kb); return; }
    const order = ['pub', 'dept', 'mine'];
    if (order.indexOf(tab) < order.length - 1) setTab(order[order.indexOf(tab) + 1]);
    else navigate('/kb', { replace: true });
  }, [routeId, kbs, current, tab, user]);

  if (current) {
    return <KbDetail kb={current} onBack={() => navigate('/kb')} toast={toast} user={user} />;
  }

  const TABS = [
    { key: 'pub', label: '公开知识库' },
    { key: 'dept', label: '部门知识库' },
    { key: 'mine', label: '个人知识库' },
  ];

  return (
    <>
      <div className="v2-sec-head kbx-head">
        <div>
          <h2>知识库中心</h2>
          <p>上传即建库，处理全自动 —— 原文块 + 问答对双粒度入库，答案带出处</p>
        </div>
        <button className="btn-primary" onClick={() => { if (requireLogin()) setShowNew(true); }}>
          <Icon name="plus" size={13} /> 新建知识库
        </button>
      </div>
      <div className="v2-body">
        <div className="v2-tabs kbx-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`v2-tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        {kbs === null && <XixiLoading text="锡锡正在加载知识库…" />}
        {err && <div className="v2-empty">{err}</div>}
        {kbs && !err && (
          <div className="kbx-grid">
            {kbs.length === 0 && (
              <div className="v2-empty" style={{ gridColumn: '1/-1' }}>
                {tab === 'mine' ? '还没有知识库，点击右上角「新建知识库」创建第一个' : '暂无内容'}
              </div>
            )}
            {kbs.map((kb) => (
              <div key={kb.id} className="kbx-card" onClick={() => openKb(kb)}>
                <div className="kbx-card-top">
                  <div className={`kbx-ic ${kb.visibility}`}><Icon name={kb.visibility === 'private' ? 'book' : kb.visibility === 'dept' ? 'users' : 'globe'} size={17} /></div>
                  {kb.status === 'pending' ? <span className="tag amber">审核中</span>
                    : kb.visibility === 'dept' ? <span className="tag amber">部门库</span>
                    : kb.visibility === 'public' ? <span className="tag green">公开</span>
                    : <span className="tag blue">私有</span>}
                </div>
                <div className="kbx-card-t">{kb.name}</div>
                <div className="kbx-card-d">{kb.description || '—'}</div>
                <div className="kbx-card-m">{kb.fileCount} 文件{kb.chunkCount ? ` · ${kb.chunkCount} 块` : ''} · {kb.qaCount} 问答 · {fmtSize(kb.sizeBytes)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showNew && (
        <NewKbDialog onClose={() => setShowNew(false)} toast={toast}
          onCreated={(id) => { setShowNew(false); load(); }} />
      )}
    </>
  );
}
