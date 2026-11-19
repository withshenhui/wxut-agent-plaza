import React from 'react';

/**
 * 智能填报页线性图标集（与原型一致，stroke 1.7）。
 * 用法：<Ic n="form" />，尺寸由上下文 CSS 控制，默认 16px。
 */
const SYMBOLS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  ai: '<path d="M12 3l1.8 4.7L18.5 9.2l-4.7 1.5L12 15.4l-1.8-4.7L5.5 9.2l4.7-1.5L12 3z"/><path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5V18.5c0 1.7 3.6 3 8 3s8-1.3 8-3V5.5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  book: '<path d="M2 3.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2V3.5z"/><path d="M22 3.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7V3.5z"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  cloud: '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.7-4.7"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4"/>',
  guide: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8l-5.5-5.5z"/><path d="M14 2.5V8h5.5M9 13l2 2 4-4.5"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/>',
  upload: '<path d="M21 15.5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><path d="m7 8.5 5-5 5 5"/><path d="M12 3.5V16"/>',
  file: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8l-5.5-5.5z"/><path d="M14 2.5V8h5.5"/>',
  wand: '<path d="m5 19 10.5-10.5"/><path d="M18 2.5l.8 2.2 2.2.8-2.2.8L18 8.5l-.8-2.2-2.2-.8 2.2-.8L18 2.5z"/><path d="M6.5 3.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z"/><path d="m15.5 13.5 3 3"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  chevD: '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
  chevR: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  arrowL: '<path d="M20 12H4"/><path d="m10 6-6 6 6 6"/>',
  edit: '<path d="M11 4.5H5.5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h12.5a2 2 0 0 0 2-2v-5.5"/><path d="M17.8 3.2a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 8.8-8.8z"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5v4h-4"/>',
  download: '<path d="M21 15.5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><path d="m7 10.5 5 5 5-5"/><path d="M12 15.5V3"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 21l1.6-5.3A8.5 8.5 0 1 1 21 12z"/>',
  send: '<path d="m21.5 2.5-10 10"/><path d="M21.5 2.5 14 21.5l-2.5-9-9-2.5 19-7z"/>',
  user: '<circle cx="12" cy="8" r="4.5"/><path d="M4.5 21c.8-4 3.9-6 7.5-6s6.7 2 7.5 6"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2.5"/>',
  hist: '<path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><path d="M3.5 21v-4h4"/><path d="M12 7.5V12l3.5 2.5"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9.5V14"/><path d="M12 17v.2"/>',
  phone: '<path d="M5 3.5h4l1.5 4.5-2.2 1.6a13 13 0 0 0 6.1 6.1l1.6-2.2 4.5 1.5v4a2 2 0 0 1-2 2A17.5 17.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M3.5 6h17M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M5.5 6l1 14a2 2 0 0 0 2 1.9h7a2 2 0 0 0 2-1.9l1-14"/><path d="M10 10.5v6M14 10.5v6"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8L12 3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1"/><path d="M9 13.5v.2M15 13.5v.2"/><path d="M9.5 17h5"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
  mend: '<circle cx="10" cy="14" r="6.5"/><path d="m15 9 5.5-5.5M15 9l-2-2 3.5-3.5 2 2L15 9z"/>',
  print: '<path d="M6 9V3.5h12V9"/><rect x="3.5" y="9" width="17" height="8.5" rx="2"/><path d="M6.5 14.5h11V21h-11z"/>',
  word: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8l-5.5-5.5z"/><path d="M14 2.5V8h5.5"/><path d="M8 12l1.2 5L10.5 13l1.3 4 1.2-5"/>',
};

export function Ic({ n, style, className = '' }) {
  return (
    <svg className={`ic ${className}`} style={style} viewBox="0 0 24 24" aria-hidden="true">
      {React.createElement('use', { href: `#fa-i-${n}` })}
    </svg>
  );
}

/** 一次性注入全部 symbol 定义（页面根渲染一次） */
export default function FaIconDefs() {
  return (
    <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {Object.entries(SYMBOLS).map(([k, d]) => (
        <symbol
          key={k}
          id={`fa-i-${k}`}
          viewBox="0 0 24 24"
          dangerouslySetInnerHTML={{ __html: d }}
        />
      ))}
    </svg>
  );
}
