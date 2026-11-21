import React, { useState } from 'react';
import { login } from '../api/auth';
import { Icon } from './ui.jsx';

const CAS_ENABLED = import.meta.env.VITE_CAS_ENABLED === 'true';
const apiBase = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

const FEATURES = [
  ['dashboard', '智能体运营', '上架审核 · 推荐位 · 建设中管理'],
  ['chart', '数据洞察', '四工作台 · 学院数据范围管控'],
  ['users', '权限体系', '四层角色 · 学院归属 · 细粒度授权'],
];

export default function V2Login({ onLoginOk }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setErr('请输入用户名和密码'); return; }
    setLoading(true); setErr('');
    try {
      const data = await login(username.trim(), password);
      localStorage.setItem('admin_token', data.token);
      onLoginOk(data.user || { username: username.trim() });
    } catch (e2) {
      setErr(e2?.message || '登录失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="v2-login-wrap">
      {/* 品牌叙事区 */}
      <aside className="v2-login-side">
        <div className="v2-ls-glow g1" /><div className="v2-ls-glow g2" />
        <div className="v2-ls-top">
          <img src="./v2-logo.png?v=2" alt="无锡职业技术大学校徽" />
          <div>
            <div className="t1">锡职大AI中台</div>
            <div className="t2">WXUT AI CENTER</div>
          </div>
        </div>
        <div className="v2-ls-hero">
          <h1>管理控制台</h1>
          <p>智能体广场 · 数据洞察 · 权限体系的统一运营中枢</p>
          <div className="v2-ls-features">
            {FEATURES.map(([ic, t, d]) => (
              <div key={t} className="ft">
                <span className="ic"><Icon name={ic} size={17} /></span>
                <div><div className="t">{t}</div><div className="d">{d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="v2-ls-foot">© 2026 无锡职业技术大学 · 信息化与数据服务中心</div>
      </aside>

      {/* 登录表单区 */}
      <main className="v2-login-main">
        <div className="v2-login-card">
          <div className="v2-lc-head">
            <img src="./v2-xixi.png" alt="锡锡" className="mascot" />
            <h2>欢迎回来</h2>
            <p>登录管理后台，继续运营你的智能体生态</p>
          </div>
          {err && <div className="v2-login-err"><Icon name="warn" size={14} /> {err}</div>}
          <form onSubmit={submit}>
            <div className="v2-lc-field">
              <label>管理员账号</label>
              <input className="v2-lc-i" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="工号 / 管理员用户名" autoComplete="username" />
            </div>
            <div className="v2-lc-field">
              <label>密码</label>
              <input className="v2-lc-i" type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" autoComplete="current-password" />
            </div>
            <button className="v2-btn lg v2-lc-submit" disabled={loading} type="submit">
              {loading ? '登录中…' : '登 录'}
            </button>
          </form>
          {CAS_ENABLED && (
            <>
              <div className="v2-lc-divider"><span>或</span></div>
              <button className="v2-btn ghost v2-lc-cas"
                onClick={() => { window.location.href = `${apiBase}/auth/cas-login`; }}>
                <Icon name="users" size={15} /> 统一身份认证登录
              </button>
            </>
          )}
          <div className="v2-lc-tip">仅平台管理员可登录 · 忘记密码请联系信息化与数据服务中心</div>
        </div>
      </main>
    </div>
  );
}