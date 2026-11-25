import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Pager, useToast, Icon } from './ui.jsx';
import { renderMd } from './V2App.jsx';

// 与 V2Admin 同款接口地址策略（生产同源相对路径 / 开发 Vite 代理）
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

const PAGE_SIZE = 20;

/* 管理员 token 优先，其次普通用户 token（V2 鉴权铁律：所有请求必须带 Bearer） */
function authHeaders() {
  const tk = localStorage.getItem('admin_token') || localStorage.getItem('user_token') || '';
  return tk ? { Authorization: `Bearer ${tk}` } : {};
}

/* 统一取数：解包 { code, message, data } */
async function authedFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.code !== 200) {
    throw new Error((body && body.message) || `请求失败（${res.status}）`);
  }
  return body.data;
}

/* 时间：后端返回 yyyy-MM-dd HH:mm:ss，兜底 T 分隔与 ISO */
const fmtTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '—');
const fmtDay = (v) => {
  const s = fmtTime(v);
  return s === '—' ? s : s.slice(0, 10);
};

/* ================= 后台页：对话管理（管理员监督/审计，只读） ================= */
export default function ConversationAdmin({ toast: toastProp }) {
  const ctxToast = useToast();
  const toast = toastProp || ctxToast;

  // 草稿筛选条件（点「查询」才生效）
  const [q, setQ] = useState('');
  const [agentId, setAgentId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // 已应用的筛选条件
  const [applied, setApplied] = useState({ q: '', agentId: '', from: '', to: '' });

  const [page, setPage] = useState(1);
  const [list, setList] = useState(null); // { records, total, page, size }
  const [agents, setAgents] = useState([]);

  // 详情（弹窗）
  const [detail, setDetail] = useState(null); // { sessionId, ..., messages:[...] }
  const [detailLoading, setDetailLoading] = useState(false);

  /* 智能体下拉：GET /agents?size=200 */
  useEffect(() => {
    authedFetch('/agents?size=200')
      .then((d) => setAgents((d && d.records) || []))
      .catch(() => setAgents([]));
  }, []);

  /* 列表：已应用条件 + 分页驱动 */
  const load = useCallback(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('size', String(PAGE_SIZE));
    if (applied.q) sp.set('q', applied.q);
    if (applied.agentId) sp.set('agentId', applied.agentId);
    if (applied.from) sp.set('from', applied.from);
    if (applied.to) sp.set('to', applied.to);
    setList(null);
    authedFetch(`/admin/conversations?${sp.toString()}`)
      .then((d) => setList(d))
      .catch((e) => { setList({ records: [], total: 0 }); toast('加载失败：' + e.message); });
  }, [applied, page, toast]);

  useEffect(() => { load(); }, [load]);

  const search = () => { setPage(1); setApplied({ q: q.trim(), agentId, from, to }); };
  const reset = () => {
    setQ(''); setAgentId(''); setFrom(''); setTo('');
    setPage(1);
    setApplied({ q: '', agentId: '', from: '', to: '' });
  };

  const openDetail = async (row) => {
    setDetailLoading(true);
    setDetail({ sessionId: row.sessionId, title: row.title, messages: null, __meta: row });
    try {
      const d = await authedFetch(`/admin/conversations/${encodeURIComponent(row.sessionId)}`);
      setDetail(d);
    } catch (e) {
      toast('打开失败：' + e.message);
      setDetail(null);
    }
    setDetailLoading(false);
  };

  const records = (list && list.records) || [];
  const filtered = !!(applied.q || applied.agentId || applied.from || applied.to);

  return (
    <>
      <div className="v2-page-head">
        <div>
          <div className="v2-ph-title">对话管理</div>
          <div className="v2-ph-sub">管理员监督/审计 · 全部用户 × 全部智能体的对话 · 只读</div>
        </div>
      </div>

      <div className="v2-filter-bar">
        <input className="v2-search" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
          placeholder="搜索标题 / 姓名 / 工号" style={{ width: 220 }} />
        <select className="v2-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          <option value="">全部智能体</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--p-t3)' }}>时间</span>
        <input type="date" className="v2-select" value={from} onChange={(e) => setFrom(e.target.value)} title="起始日期（按最后更新）" />
        <span style={{ color: 'var(--p-t4)' }}>~</span>
        <input type="date" className="v2-select" value={to} onChange={(e) => setTo(e.target.value)} title="结束日期（按最后更新）" />
        <button className="v2-btn" onClick={search}>查询</button>
        <button className="v2-btn ghost" onClick={reset}>重置</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--p-t4)' }}>
          共 {list ? (list.total ?? 0) : '…'} 个会话
        </span>
      </div>

      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead>
            <tr><th>用户</th><th>智能体</th><th>标题</th><th>轮数</th><th>最后更新</th><th>操作</th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.sessionId}>
                <td>
                  <span style={{ color: 'var(--aink)', fontWeight: 500 }}>{r.nickname || r.username || '—'}</span>
                  {r.username && <span className="num" style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: 'var(--p-t4)', marginLeft: 8 }}>{r.username}</span>}
                </td>
                <td style={{ color: 'var(--p-t2)', whiteSpace: 'nowrap' }}>{r.agentName || <span style={{ color: 'var(--p-t4)' }}>未知智能体</span>}</td>
                <td style={{ whiteSpace: 'normal', maxWidth: 360, color: 'var(--aink)' }} title={r.title}>{r.title || <span style={{ color: 'var(--p-t4)' }}>（无标题）</span>}</td>
                <td className="num" title="消息条数">{r.msgCount ?? 0}</td>
                <td className="num" style={{ color: 'var(--p-t4)', whiteSpace: 'nowrap' }}>{fmtTime(r.updatedAt)}</td>
                <td><button className="v2-link" onClick={() => openDetail(r)}>查看</button></td>
              </tr>
            ))}
            {!records.length && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--p-t4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Icon name="chat" size={36} style={{ color: '#C9D6E8' }} />
                  <div style={{ fontSize: 13 }}>
                    {list === null ? '加载中…' : (filtered ? '没有匹配的会话，试试调整筛选条件' : '暂无对话，用户发起对话后会出现在这里')}
                  </div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
        <div className="v2-tbl-foot">
          <span>按最后更新时间倒序 · 只读监督视图</span>
          <Pager page={page} total={(list && list.total) || 0} size={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {detail && (
        <Modal title={`对话详情 · ${(detail.nickname || detail.username || (detail.__meta && detail.__meta.nickname) || (detail.__meta && detail.__meta.username)) || '未知用户'}`}
          width={820} onClose={() => setDetail(null)}
          footer={<button className="v2-btn ghost" onClick={() => setDetail(null)}>关闭</button>}>
          <div className="v2-fm-row">
            <span className="v2-fm-label">用户</span>
            <div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>
              {(detail.nickname || (detail.__meta && detail.__meta.nickname) || '—')}
              {(detail.username || (detail.__meta && detail.__meta.username)) ? <span className="num" style={{ marginLeft: 8, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: 'var(--p-t4)' }}>{detail.username || detail.__meta.username}</span> : null}
            </div>
          </div>
          <div className="v2-fm-row">
            <span className="v2-fm-label">智能体</span>
            <div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>{detail.agentName || (detail.__meta && detail.__meta.agentName) || '未知智能体'}</div>
          </div>
          <div className="v2-fm-row">
            <span className="v2-fm-label">标题</span>
            <div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>{detail.title || '（无标题）'}</div>
          </div>
          <div className="v2-fm-row">
            <span className="v2-fm-label">会话时间</span>
            <div className="v2-fm-body" style={{ color: 'var(--p-t4)', fontSize: 12.5 }}>
              创建 {(detail.__meta && fmtDay(detail.__meta.createdAt)) || '—'} · 最后更新 {(detail.__meta && fmtTime(detail.__meta.updatedAt)) || '—'}
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            {detailLoading && !detail.messages && <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--p-t4)', fontSize: 13 }}>加载消息中…</div>}
            {!detailLoading && detail.messages && !detail.messages.length && <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--p-t4)', fontSize: 13 }}>该会话暂无消息</div>}
            {detail.messages && detail.messages.length > 0 && (
              <div className="v2-chat-scroll" style={{ maxHeight: 420, background: '#F7F9FC', borderRadius: 12, padding: '14px 14px 4px' }}>
                {detail.messages.map((m, i) => (
                  <div key={i} className={`v2-msg ${m.sender === 'user' ? 'user' : 'ai'}`}>
                    <div className="who">{m.sender === 'user' ? '我' : (detail.agentName || 'AI').slice(0, 1)}</div>
                    <div>
                      <div className="v2-bubble v2-md">
                        {m.sender === 'user'
                          ? <div dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />
                          : <div dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--p-t4)', marginTop: 4, textAlign: m.sender === 'user' ? 'right' : 'left' }}>{fmtTime(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
