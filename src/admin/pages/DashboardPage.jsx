import React, { useEffect, useState, useCallback } from 'react';
import { Button, Empty, Spin } from 'antd';
import {
  RobotOutlined, AppstoreOutlined, CloudServerOutlined, UserOutlined,
  ReloadOutlined, EditOutlined, SettingOutlined, FileTextOutlined,
} from '@ant-design/icons';
import adminRequest from '../../api/request';

const PALETTE = ['#4A6CF7', '#7C5CFC', '#0E9F8A', '#D97706', '#0891B2', '#DB2777', '#8B5CF6', '#64748B'];
const num = (v) => (v == null ? 0 : Number(v));
const fmtTime = (s) => { const t = String(s || ''); return t.length >= 16 ? t.slice(5, 16) : t; };
const stamp = () => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function Donut({ items }) {
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  const r = 52, C = 2 * Math.PI * r;
  let acc = 0;
  const segs = items.map((it) => {
    const frac = it.count / total;
    const dash = `${(C * frac).toFixed(1)} ${C.toFixed(1)}`;
    const el = (
      <circle key={it.label} cx="70" cy="70" r={r} fill="none" stroke={it.color}
        strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-C * acc}
        transform="rotate(-90 70 70)" strokeLinecap="butt" />
    );
    acc += frac;
    return el;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 140 140" style={{ width: 132, height: 132, flex: 'none' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EFF1F7" strokeWidth="16" />
        {segs}
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#182234">{total}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="9.5" fill="#8892A6">智能体总数</text>
      </svg>
      <div className="adm-dist" style={{ flex: 1, minWidth: 180 }}>
        {items.map((it) => (
          <div className="row" key={it.label}>
            <span className="dot" style={{ background: it.color }} />
            <span className="nm">{it.label}</span>
            <span className="ct">{it.count} 个 · {Math.round((it.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ agents: 0, online: 0, categories: 0, models: 0, users: 0 });
  const [agents, setAgents] = useState([]);
  const [dist, setDist] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminRequest.get('/agents', { params: { size: 1 } }).catch(() => ({ total: 0 })),
      adminRequest.get('/agents', { params: { size: 200 } }).catch(() => ({ records: [] })),
      adminRequest.get('/categories').catch(() => []),
      adminRequest.get('/models', { params: { size: 1 } }).catch(() => ({ total: 0 })),
      adminRequest.get('/users', { params: { size: 1 } }).catch(() => ({ total: 0 })),
    ]).then(([agentsRes, listRes, categories, models, users]) => {
      const records = listRes.records || [];
      setAgents(records);
      const online = records.filter((a) => num(a.status) === 1).length;
      setStats({
        agents: agentsRes.total || records.length,
        online,
        categories: (categories || []).length,
        models: models.total || 0,
        users: users.total || 0,
      });
      // 分类分布（列表接口返回 categoryKey，详情才有 categoryId，两路都兼容）
      const catById = {}, catByKey = {};
      (categories || []).forEach((c) => {
        const label = c.label || c.categoryKey || `分类${c.id}`;
        catById[c.id] = label;
        catByKey[c.categoryKey] = label;
      });
      const counts = {};
      records.forEach((a) => {
        const label = catByKey[a.categoryKey] || catById[a.categoryId] || '未分组';
        counts[label] = (counts[label] || 0) + 1;
      });
      setDist(Object.entries(counts)
        .map(([label, count], i) => ({ label, count, color: PALETTE[i % PALETTE.length] }))
        .sort((a, b) => b.count - a.count));
      setUpdatedAt(stamp());
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const topVisited = [...agents].sort((a, b) => num(b.visitCount) - num(a.visitCount))
    .filter((a) => num(a.visitCount) > 0).slice(0, 6);
  const maxVisit = topVisited.length ? num(topVisited[0].visitCount) : 1;
  const recent = [...agents]
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, 5);

  const kpis = [
    { title: '在架智能体', value: stats.agents, sub: `在线 ${stats.online} 个`, ic: <RobotOutlined />, bg: '#ECF0FF', color: '#3B5AE6', to: '/admin/agents' },
    { title: '接入大模型', value: stats.models, sub: '统一调度', ic: <CloudServerOutlined />, bg: '#F3EFFF', color: '#5B3FD1', to: '/admin/models' },
    { title: '服务分类', value: stats.categories, sub: '广场栏目', ic: <AppstoreOutlined />, bg: '#E3F6FA', color: '#0891B2', to: '/admin/categories' },
    { title: '平台用户', value: stats.users, sub: '注册账号', ic: <UserOutlined />, bg: '#FCF3E3', color: '#B45309', to: '/admin/users' },
  ];

  const quicks = [
    { b: '新建智能体', s: '上架到智能体广场', ic: <RobotOutlined />, bg: '#ECF0FF', color: '#3B5AE6', to: '/admin/agents' },
    { b: '模型通道配置', s: '大模型密钥与端点', ic: <SettingOutlined />, bg: '#F3EFFF', color: '#5B3FD1', to: '/admin/llm-config' },
    { b: '基础配置', s: '站点信息与菜单', ic: <EditOutlined />, bg: '#FCF3E3', color: '#B45309', to: '/admin/configs' },
    { b: '操作日志', s: '后台操作审计', ic: <FileTextOutlined />, bg: '#E3F6FA', color: '#0891B2', to: '/admin/logs' },
  ];

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h2>运行概览</h2>
          <div className="sub">数据更新于 {updatedAt || '—'}</div>
        </div>
        <div className="acts">
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <div className="adm-kpis">
          {kpis.map((k) => (
            <div className="adm-kpi" key={k.title} style={{ cursor: 'pointer' }}
              onClick={() => { window.location.hash = k.to; }}>
              <span className="ic" style={{ background: k.bg, color: k.color }}>{k.ic}</span>
              <div>
                <b>{k.value}</b>
                <em>{k.title}</em>
                <span className="meta">{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="adm-grid c2">
          <div className="adm-card">
            <div className="pad">
              <div className="adm-card-h">
                <b>智能体访问排行</b><span className="sub">累计访问 · Top 6</span>
                <button className="more" onClick={() => { window.location.hash = '/admin/agents'; }}>全部 ›</button>
              </div>
              {topVisited.length ? (
                <div className="adm-hbar">
                  {topVisited.map((a, i) => (
                    <div className="row" key={a.id}>
                      <span className="rk">{i + 1}</span>
                      <span className="nm">{a.icon} {a.name}</span>
                      <span className="tk"><i style={{ width: `${Math.max(4, (num(a.visitCount) / maxVisit) * 100)}%` }} /></span>
                      <span className="vv">{num(a.visitCount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无访问数据" />}
            </div>
          </div>
          <div className="adm-card">
            <div className="pad">
              <div className="adm-card-h"><b>分类分布</b><span className="sub">按服务分类统计</span></div>
              {dist.length ? <Donut items={dist} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
          </div>
        </div>

        <div className="adm-grid c2" style={{ marginTop: 16 }}>
          <div className="adm-card">
            <div className="pad">
              <div className="adm-card-h"><b>最近更新</b><span className="sub">最近编辑的智能体</span></div>
              {recent.length ? (
                <div className="adm-feed">
                  {recent.map((a) => (
                    <div className="row" key={a.id} onClick={() => { window.location.hash = '/admin/agents'; }}>
                      <span className="ic">{a.icon || '🤖'}</span>
                      <div className="bd"><b>{a.name}</b><span>{a.description || '—'}</span></div>
                      <span className="tm">{fmtTime(a.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
          </div>
          <div className="adm-card">
            <div className="pad">
              <div className="adm-card-h"><b>快捷操作</b><span className="sub">常用管理入口</span></div>
              <div className="adm-quick">
                {quicks.map((q) => (
                  <div className="q" key={q.b} onClick={() => { window.location.hash = q.to; }}>
                    <span className="ic" style={{ background: q.bg, color: q.color }}>{q.ic}</span>
                    <div><b>{q.b}</b><span>{q.s}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#F7F8FC', borderRadius: 12, fontSize: 11.5, color: '#8892A6', lineHeight: 1.7 }}>
                提示：所有变更实时生效并记录操作日志；删除类操作不可恢复，请谨慎处理。
              </div>
            </div>
          </div>
        </div>
      </Spin>
    </div>
  );
}
