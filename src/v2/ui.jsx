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
  construction: '<rect x="2.5" y="4" width="19" height="4" rx="1"/><path d="M5.5 8v11M18.5 8v11M9.5 8v11M14.5 8v11"/><path d="M12 12l1.6 4.6L18 18l-4.4 1.4L12 24l-1.6-4.6L6 18l4.4-1.4z" transform="translate(0,-8) scale(.78)"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  chevR: '<polyline points="9 18 15 12 9 6"/>',
  chevD: '<polyline points="6 9 12 15 18 9"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  // 语义图标（智能体独立图标，DB icon=emoji 或图标名均可解析）
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/><path d="M8 14h2M14 14h2M8 17.5h2M14 17.5h2"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4c2.5-1.5 5-1.5 7 0s4.5 1.5 7 0v9c-2.5 1.5-5 1.5-7 0s-4.5-1.5-7 0"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 5H5.5a2.5 2.5 0 0 0 0 5H8M16 5h2.5a2.5 2.5 0 0 1 0 5H16"/><path d="M12 14v3M8.5 20.5h7M9.5 20.5c.4-1.8 1.3-2.5 2.5-2.5s2.1.7 2.5 2.5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.2A4.8 4.8 0 0 0 21 9.5C21 5.9 16.9 3 12 3z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="17.5" cy="10.5" r="1"/>',
  landmark: '<path d="M3 22h18"/><path d="M5 22V11M9.5 22V11M14.5 22V11M19 22V11"/><path d="M2.5 10L12 3.5 21.5 10z"/>',
  microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0-7-7"/><circle cx="14" cy="8" r="2"/><path d="M12.5 9.5L10 12"/>',
  shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="M9 11.5l2 2 4-4.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 3.5 9A14 14 0 0 1 12 21a14 14 0 0 1-3.5-9A14 14 0 0 1 12 3z"/>',
  house: '<path d="M4 10.5L12 4l8 6.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  creditcard: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6 14.5h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  trending: '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  factory: '<path d="M2.5 20.5V8.5l4 3v-3l4 3V4.5h9v16z"/><path d="M6.5 16.5h.01M10.5 16.5h.01M14.5 16.5h.01M17.5 16.5h.01"/>',
  refresh: '<path d="M21.5 4.5v5.5h-5.5"/><path d="M20 14.5a8 8 0 1 1-1.9-8.3l3.4 3.3"/>',
  handshake: '<path d="M20 17l-2-2M4 17l2-2M12 19l-2-2 4-4 2 2 4-4 2 2M2 12l4-4 4 4"/>',
  bookopen: '<path d="M2.5 4h6a3.5 3.5 0 0 1 3.5 3.5V20a3 3 0 0 0-3-3h-6.5z"/><path d="M21.5 4h-6a3.5 3.5 0 0 0-3.5 3.5V20a3 3 0 0 1 3-3h6.5z"/>',
  books: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v4a5.5 5.5 0 0 1-11 0z"/><path d="M12 17.5v4"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 20l1.1-5.3A8.5 8.5 0 1 1 21 11.5z"/>',
  scale: '<path d="M12 3.5v17"/><path d="M5 6.5h14"/><path d="M5 6.5l-2.8 6a3 3 0 0 0 5.6 0z"/><path d="M19 6.5l2.8 6a3 3 0 0 1-5.6 0z"/><path d="M8 20.5h8"/>',
  car: '<path d="M3.5 16v-3.5l2-5A2 2 0 0 1 7.3 6h9.4a2 2 0 0 1 1.8 1.5l2 5V16"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 8.5L12 12.5l3.5-4"/><path d="M12 12.5V17"/><path d="M9.5 14h5"/>',
  mountain: '<path d="M8 4.5l4 7.5 2.5-4L21 19.5H3z"/>',
  signal: '<path d="M2.5 9.5a14 14 0 0 1 19 0"/><path d="M5.5 13a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 10.2L6 3.5h4.5M15.5 10.2L18 3.5h-4.5"/>',
  star: '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z"/>',
  presentation: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7.5 12.5V10M12 12.5V7.5M16.5 12.5v-3"/><path d="M12 16v3.5"/><path d="M8.5 21l3.5-2.5 3.5 2.5"/>',
  calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8.5 6.5h7"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
  idcard: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.5c.6-1.8 2-2.5 3.5-2.5s2.9.7 3.5 2.5"/><path d="M14.5 9.5h4.5M14.5 13h4.5M14.5 16.5h3"/>',
  network: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M12 7.2L6 16M12 7.2l6 8.8M7.2 18h9.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"/>',
  atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/>',
  seal: '<circle cx="12" cy="13.5" r="5"/><path d="M10 9l-1-5.5h6L14 9"/>',
  bookmark: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M12 17v3.5"/><path d="M8 20.5h8"/>',
  toolbox: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13.5h18"/><path d="M10.5 13.5v2h3v-2"/>',
};

/* DB icon=emoji → 图标 key（键统一去变体选择符；与 V1 emojiToKey 同源，含学院专属） */
const EMOJI_KEY = {
  '📅': 'calendar', '❤': 'heart', '🎯': 'target', '💼': 'briefcase', '🔧': 'wrench',
  '📋': 'clipboard', '🏢': 'building', '📝': 'pencil', '🚩': 'flag', '🎓': 'grad',
  '🏆': 'trophy', '🔄': 'refresh', '📱': 'monitor', '📚': 'books', '🎨': 'palette',
  '💰': 'wallet', '📈': 'trending', '📄': 'doclog', '🔌': 'plug', '💻': 'code',
  '🔬': 'microscope', '🤝': 'handshake', '🏛': 'landmark', '🛡': 'shield',
  '🌐': 'globe', '🏠': 'house', '👥': 'users', '📊': 'chart', '🏭': 'factory',
  '🏞': 'mountain', '📡': 'signal', '🎛': 'sliders', '🚗': 'car', '🌍': 'globe',
  '🏫': 'landmark', '💬': 'chat', '✅': 'check', '🛠': 'toolbox', '⚖': 'scale',
  '📖': 'bookopen', '🧭': 'compass', '⚙': 'gear', '🏗': 'construction', '📜': 'seal',
  '🏅': 'medal', '📑': 'bookmark', '🖥': 'presentation', '🧮': 'calculator',
  '🪙': 'coin', '⚛': 'atom', '💾': 'chip', '☀': 'sun', '🔗': 'network',
  '🪪': 'idcard', '⭐': 'star',
};

/* 建设中卡片图标（工程车/吊钩，主色描边） */
export function IconBuilding({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="14" height="2.8" rx="0.8" />
      <path d="M5 6.3v13.7M14 6.3v13.7M9.5 6.3v13.7" />
      <path d="M2.5 20.5h19" />
      <path d="M17.5 3.5v4M17.5 7.5l-2.8 8.5" />
      <path d="M15.1 13.6l4.6 1.5M16.2 16.9l2.4-1" />
      <circle cx="17.5" cy="19.6" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.5 9.2h3.2" />
    </svg>
  );
}

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
/* 锡锡 96px 内联（loading/横幅/小头像零网络请求，hero 250px 仍用文件版 v2-xixi.png） */
const XIXI_INLINE = 'data:image/png;base64,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';

export function AgentAvatar({ agent, size = 36 }) {
  const isMascot = useMascot(agent);
  if (isMascot) return <img src={size <= 96 ? XIXI_INLINE : './v2-xixi.png'} alt="锡锡" style={{ width: size, height: size, objectFit: 'contain' }} />;
  // 每个智能体独立图标：icon 字段优先（图标名或 emoji 均可解析），无则分类默认
  const raw = agent?.icon ? String(agent.icon).replace(/\uFE0F/g, '') : '';
  const emojiKey = EMOJI_KEY[raw];
  const key = PATHS[raw] ? raw : (emojiKey && PATHS[emojiKey] ? emojiKey : null);
  return <Icon name={key || CAT_ICON[agent?.categoryKey] || 'robot'} size={Math.round(size * 0.78)} />;
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
export function Modal({ title, onClose, children, footer, width = 680 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    document.body.classList.add('v2-modal-open');
    return () => document.body.classList.remove('v2-modal-open');
  }, []);
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
export function XixiLoading({ text = 'AI分析中…', sub }) {
  return (
    <div className="v2-xixi-loading">
      <div className="xl-avatar">
        <img src={XIXI_INLINE} alt="锡锡" />
        <span className="xl-bubble"><i /><i /><i /></span>
      </div>
      <div className="xl-text">
        <div className="xl-t">{text}</div>
        {sub ? <div className="xl-s">{sub}</div> : null}
      </div>
    </div>
  );
}
