import React, { useState } from 'react';
import { AgentAvatar, Icon, IconBuilding } from './ui.jsx';

/** 企微移动版广场：搜索 + 分类横滑 + 智能体卡片单列。点卡片交给 onChat（外链走外链，原生走半屏对话）。 */
export default function MobilePlaza({ agents = [], cats = [], onChat, onNeedLogin }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('全部');
  const labels = ['全部', ...cats.map((c) => c.label)];
  const rows = agents.filter((a) =>
    (cat === '全部' || a.categoryName === cat) &&
    (!q || (a.name + a.description + a.categoryName + (a.tags || []).join('')).includes(q)));
  return (
    <div className="wx-page">
      <div className="wx-head">
        <img className="wx-logo" src="./v2-logo.png?v=2" alt="校徽" />
        <div><div className="t1">锡职大AI中台</div><div className="t2">无锡职业技术大学</div></div>
      </div>
      <div className="wx-search">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索智能体…" />
      </div>
      <div className="wx-chips">
        {labels.map((l) => (
          <span key={l} className={`wx-chip${cat === l ? ' on' : ''}`} onClick={() => setCat(l)}>{l}</span>
        ))}
      </div>
      <div className="wx-list">
        {rows.map((a) => {
          const building = a.isBuilding === 1;
          return (
            <div key={a.id} className={`wx-card${building ? ' bld' : ''}`}
                 onClick={() => building ? null : onChat(a)}>
              <div className="em">{building ? <IconBuilding size={34} /> : <AgentAvatar agent={a} size={40} />}</div>
              <div className="bd">
                <div className="nm">{a.name}{a.isRecommended === 1 && <span className="rec">推荐</span>}</div>
                <div className="ds">{a.description || ''}</div>
                <div className="meta"><span className="cat">{a.categoryName}</span>
                  <span className="cnt">{building ? '建设中' : `访问 ${(a.visitCount || 0).toLocaleString()}`}</span></div>
              </div>
            </div>
          );
        })}
        {!rows.length && <div className="wx-empty">没有找到匹配的智能体</div>}
      </div>
    </div>
  );
}
