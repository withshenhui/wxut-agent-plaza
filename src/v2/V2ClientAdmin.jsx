import React, { useState, useEffect, useCallback } from 'react';
import adminRequest from '../api/request';

/* AI中台管理后台 · 客户端管理：XixiBuddy 多平台安装包上传/上下架/编辑/删除 */
const PLATFORMS = [
  { v: 'mac', label: 'macOS' },
  { v: 'win', label: 'Windows' },
  { v: 'linux', label: 'Linux' },
];
const ARCHES = [
  { v: 'arm64', label: 'arm64（Apple Silicon / 新机型）' },
  { v: 'x64', label: 'x64（Intel / 传统机型）' },
  { v: '', label: '自动 / 不区分' },
];

function fmtSize(n) {
  if (!n && n !== 0) return '—';
  if (n > 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return Math.round(n / 1024) + ' KB';
}

function Field({ label, req, children }) {
  return (
    <div className="v2-fm-row">
      <span className={`v2-fm-label${req ? ' req' : ''}`}>{label}</span>
      <div className="v2-fm-body">{children}</div>
    </div>
  );
}

export default function ClientAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUp, setShowUp] = useState(false);
  const [form, setForm] = useState({ platform: 'mac', arch: 'arm64', version: '', displayName: '', notes: '', sortOrder: 0 });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminRequest.get('/client-builds/all').then((d) => setList(d || [])).catch((e) => { toast(e.message || '加载失败'); setList([]); });
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const doUpload = () => {
    if (!file) { toast('请选择安装包文件'); return; }
    if (!form.version.trim()) { toast('请填写版本号'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('platform', form.platform);
    fd.append('arch', form.arch);
    fd.append('version', form.version.trim());
    fd.append('displayName', form.displayName);
    fd.append('notes', form.notes);
    fd.append('sortOrder', String(form.sortOrder || 0));
    setUploading(true); setProgress(0);
    adminRequest.post('/client-builds/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      onUploadProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
    }).then(() => {
      toast('安装包已上架，产品页即刻可见');
      setShowUp(false); setFile(null); setProgress(0);
      setForm({ platform: 'mac', arch: 'arm64', version: '', displayName: '', notes: '', sortOrder: 0 });
      load();
    }).catch((e) => toast(e.message || '上传失败')).finally(() => setUploading(false));
  };

  const doSaveEdit = async () => {
    if (!edit.version.trim()) { toast('版本号不能为空'); return; }
    setSaving(true);
    try {
      await adminRequest.put(`/client-builds/${edit.id}`, {
        version: edit.version.trim(),
        displayName: edit.displayName,
        notes: edit.notes,
        sortOrder: Number(edit.sortOrder) || 0,
      });
      toast('已保存');
      setEdit(null); load();
    } catch (e) { toast(e.message || '保存失败'); }
    finally { setSaving(false); }
  };

  const toggle = async (b) => {
    try { await adminRequest.put(`/client-builds/${b.id}`, { status: b.status === 1 ? 0 : 1 }); toast(b.status === 1 ? '已下架' : '已上架'); load(); }
    catch (e) { toast(e.message || '操作失败'); }
  };
  const del = async (b) => {
    if (!window.confirm(`删除「${b.displayName || b.fileName}」？服务器文件将一并删除`)) return;
    try { await adminRequest.delete(`/client-builds/${b.id}`); toast('已删除'); load(); }
    catch (e) { toast(e.message || '删除失败'); }
  };

  return (
    <div className="v2-body">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--aink)' }}>客户端管理</div>
          <div style={{ fontSize: 12.5, color: 'var(--p-t3)', marginTop: 3 }}>XixiBuddy 多平台安装包 · 上架后产品页自动出现对应平台下载入口</div>
        </div>
        <button className="v2-btn" onClick={() => setShowUp(true)}>＋ 上传安装包</button>
      </div>

      {list === null ? <div className="v2-empty">加载中…</div> : list.length === 0 ? (
        <div className="v2-empty">还没有安装包，点右上角「上传安装包」添加第一个客户端</div>
      ) : (
        <div className="v2-table">
          <table>
            <thead><tr>
              <th>展示名</th><th>平台</th><th>架构</th><th>版本</th><th>大小</th><th>状态</th><th>上传时间</th><th style={{ width: 190 }}>操作</th>
            </tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td style={{ color: 'var(--aink)', fontWeight: 600 }}>{b.displayName || b.fileName}</td>
                  <td><span className="v2t-tag blue">{(PLATFORMS.find((p) => p.v === b.platform) || { label: b.platform }).label}</span></td>
                  <td>{b.arch || '自动'}</td>
                  <td>v{b.version}</td>
                  <td className="num">{fmtSize(b.fileSize)}</td>
                  <td>{b.status === 1 ? <span className="v2t-tag green">已上架</span> : <span className="v2t-tag grey">已下架</span>}</td>
                  <td>{b.createdAt || ''}</td>
                  <td>
                    <span className="v2-link" onClick={() => setEdit({ ...b })}>编辑</span>
                    <span className="v2-link" onClick={() => toggle(b)}>{b.status === 1 ? '下架' : '上架'}</span>
                    <span className="v2-link danger" onClick={() => del(b)}>删除</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUp && (
        <div className="v2-modal-mask" onClick={() => { if (!uploading) setShowUp(false); }}>
          <div className="v2-modal" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
            <div className="v2-md-head">
              <div className="t">上传安装包</div>
              <button className="v2-md-close" onClick={() => { if (!uploading) setShowUp(false); }}>✕</button>
            </div>
            <div className="v2-md-body">
              <Field label="平台" req>
                <select className="v2-fm-i" value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value, arch: e.target.value === 'linux' ? '' : form.arch })}>
                  {PLATFORMS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </Field>
              <Field label="架构">
                <select className="v2-fm-i" value={form.arch}
                  onChange={(e) => setForm({ ...form, arch: e.target.value })}>
                  {ARCHES.map((a) => <option key={a.v || 'auto'} value={a.v}>{a.label}</option>)}
                </select>
              </Field>
              <Field label="版本号" req>
                <input className="v2-fm-i" value={form.version} placeholder="例如 1.0.0"
                  onChange={(e) => setForm({ ...form, version: e.target.value })} />
              </Field>
              <Field label="展示名">
                <input className="v2-fm-i" value={form.displayName} placeholder="默认按平台自动生成，如 macOS（Apple Silicon）"
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </Field>
              <Field label="说明">
                <input className="v2-fm-i" value={form.notes} placeholder="例如 内测版 / 含新插件市场"
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
              <Field label="文件" req>
                <input type="file" className="v2-fm-i" style={{ padding: '8px 12px' }}
                  onChange={(e) => setFile(e.target.files[0] || null)} />
                {file && <div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 6 }}>{file.name} · {fmtSize(file.size)}</div>}
              </Field>
              {uploading && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--p-fill)', overflow: 'hidden' }}>
                    <div style={{ width: progress + '%', height: '100%', background: 'var(--el-primary)', borderRadius: 3, transition: 'width .2s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 5 }}>上传中 {progress}%（大包请耐心等待）</div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button className="v2-btn ghost" disabled={uploading} onClick={() => setShowUp(false)}>取消</button>
                <button className="v2-btn" disabled={uploading} onClick={doUpload}>{uploading ? '上传中…' : '上传并上架'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="v2-modal-mask" onClick={() => setEdit(null)}>
          <div className="v2-modal" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
            <div className="v2-md-head">
              <div className="t">编辑安装包 <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--p-t4)' }}>{edit.fileName}</span></div>
              <button className="v2-md-close" onClick={() => setEdit(null)}>✕</button>
            </div>
            <div className="v2-md-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, fontSize: 12.5, color: 'var(--p-t3)' }}>
                <span className="v2t-tag blue">{(PLATFORMS.find((p) => p.v === edit.platform) || { label: edit.platform }).label}</span>
                <span>{edit.arch || '自动'}</span>
                <span>· {fmtSize(edit.fileSize)}</span>
                <span>· 文件名与安装包本身不可改，重新上传请删除后添加</span>
              </div>
              <Field label="版本号" req>
                <input className="v2-fm-i" value={edit.version || ''} placeholder="例如 1.0.0"
                  onChange={(e) => setEdit({ ...edit, version: e.target.value })} />
              </Field>
              <Field label="展示名">
                <input className="v2-fm-i" value={edit.displayName || ''} placeholder="例如 macOS（Apple Silicon）"
                  onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} />
              </Field>
              <Field label="说明">
                <input className="v2-fm-i" value={edit.notes || ''} placeholder="例如 内测版 / 含新插件市场"
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </Field>
              <Field label="排序">
                <input className="v2-fm-i" type="number" value={edit.sortOrder ?? 0} style={{ maxWidth: 140 }}
                  onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value })} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button className="v2-btn ghost" onClick={() => setEdit(null)}>取消</button>
                <button className="v2-btn" disabled={saving} onClick={doSaveEdit}>{saving ? '保存中…' : '保存'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
