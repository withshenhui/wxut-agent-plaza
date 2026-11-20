import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/* ================= 图标库（透明纯色描边 SVG） ================= */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.4 3-5 6-5s5.5 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.5c2.6.3 4.3 1.8 4.7 4.3"/>',
  heart: '<path d="M12 20s-7.4-4.6-9-8.8C1.9 8 3.6 5 6.5 5c1.9 0 3.2 1 4.1 2.3h2.8C14.3 6 15.6 5 17.5 5c2.9 0 4.6 3 3.5 6.2C19.4 15.4 12 20 12 20z"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="2"/><rect x="17" y="13" width="4" height="7" rx="2"/>',
  sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h9M19 18h1"/><circle cx="15.5" cy="6" r="2"/><circle cx="9.5" cy="12" r="2"/><circle cx="15.5" cy="18" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  doclog: '<path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z"/><path d="M14 2.5v6h6M9 13h6M9 17h4"/>',
  cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 10v6"/>',
  chart: '<path d="M3 21h18"/><path d="M6 21v-8M12 21V5M18 21V9"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8A1.8 1.8 0 0 1 10.8 1h2.4A1.8 1.8 0 0 1 15 2.8V4"/><path d="M9 10h6M9 14h6M9 18h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v5.5L4.6 18a2 2 0 0 0 1.8 3h11.2a2 2 0 0 0 1.8-3L14 8.5V3"/><path d="M7.5 15h9"/>',
  wrench: '<path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6l-2.8 2.8-2.2-2.2z"/>',
  robot: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><path d="M9.5 12.5v2M14.5 12.5v2M9.5 16.5h5"/>',
  building: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/><path d="M10 21v-4h4v4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  book: '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 8h7M9 12h5"/>',
  grad: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
  warn: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4M12 17.2h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  code: '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/>',
};

export function Icon({ name, size = 17, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={style} {...P}
      dangerouslySetInnerHTML={{ __html: PATHS[name] || PATHS.robot }} />
  );
}

/* 分类 key → 图标（college 类在广场统一用学士帽 SVG；仅 id=111 用锡锡形象） */
export const CAT_ICON = {
  college: 'cap', student: 'grad', teacher: 'briefcase', education: 'book',
  research: 'flask', logistics: 'wrench', other: 'robot', institution: 'clipboard',
};

export const MASCOT_AGENT_ID = 111; // 仅"锡锡导员-全校"使用锡锡官方形象
export function useMascot(agent) {
  return agent && Number(agent.id) === MASCOT_AGENT_ID;
}
export function AgentAvatar({ agent, size = 36 }) {
  const isMascot = useMascot(agent);
  if (isMascot) return <img src="./v2-xixi.png" alt="锡锡" style={{ width: size, height: size, objectFit: 'contain' }} />;
  return <Icon name={CAT_ICON[agent?.categoryKey] || 'robot'} size={Math.round(size * 0.78)} />;
}

/* ================= 学院网关映射（V1 同款） ================= */
export const COLLEGE_MODELS = {
  101: 'query-jixie', 102: 'query-kongzhi', 103: 'query-sheji', 104: 'query-qiche',
  105: 'query-jicheng', 106: 'query-guojiao', 107: 'query-caijing',
  108: 'query-guanli', 109: 'query-wenlv', 110: 'query-wulian', 111: 'query-quanxiao',
};
export const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8530';

export const SUGGEST_COLLEGE = ['这个学院有多少学生？', '按年级统计学生人数', '谁经常夜不归宿？', '班级消费对比', '当前正在请假的学生'];
export const SUGGEST_ALL = ['全校有多少在校生？', '各学院人数分布如何？', '最新考勤日有多少学生未归寝？', '全校论文最多的教师是谁？', '当前全校有多少学生正在请假？'];

/* ================= Toast ================= */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m) => { setMsg(m); }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`v2-toast${msg ? ' show' : ''}`}>{msg}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ================= 弹窗 ================= */
export function Modal({ title, onClose, children, footer, width = 600 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="v2-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="v2-modal" style={width ? { width } : null}>
        <div className="v2-md-head">
          <div className="t">{title}</div>
          <button className="v2-md-close" onClick={onClose}>✕</button>
        </div>
        <div className="v2-md-body">{children}</div>
        {footer && <div className="v2-md-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* 开关 */
export function Switch({ on, onChange, title }) {
  return <button type="button" className={`v2-sw${on ? ' on' : ''}`} title={title} onClick={() => onChange(!on)} />;
}

/* 分页 */
export function Pager({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const btns = [];
  for (let i = 1; i <= Math.min(pages, 8); i++) btns.push(i);
  return (
    <div className="v2-pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      {btns.map((i) => (
        <button key={i} className={i === page ? 'on' : ''} onClick={() => onPage(i)}>{i}</button>
      ))}
      {pages > 8 && <button disabled>…</button>}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  );
}


/* ================= 锡锡 Loading（全站统一数据加载态） ================= */
export function XixiLoading({ text = '锡锡正在思考…', sub }) {
  return (
    <div className="v2-xixi-loading">
      <div className="xl-avatar">
        <img src="./v2-xixi.png" alt="锡锡" />
        <span className="xl-bubble"><i /><i /><i /></span>
      </div>
      <div className="xl-text">
        <div className="xl-t">{text}</div>
        {sub ? <div className="xl-s">{sub}</div> : null}
      </div>
    </div>
  );
}
