import React, { useState } from 'react';
import { login } from '../api/auth';
import { Icon } from './ui.jsx';

const CAS_ENABLED = import.meta.env.VITE_CAS_ENABLED === 'true';
const apiBase = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

export default function V2Login({ onLoginOk }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
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
      <div className="v2-login-card">
        <div className="brand">
          <img src="./v2-logo.png" alt="无锡职业技术大学校徽" />
          <div className="t">锡职大 AI中台</div>
        </div>
        <div className="sub">WUXI UNIVERSITY OF TECHNOLOGY · V2</div>
        <h2>登录管理后台</h2>
        {err && <div className="v2-login-err">{err}</div>}
        <form onSubmit={submit}>
          <div className="v2-fm-row">
            <label className="v2-fm-label">用户名</label>
            <input className="v2-fm-i" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="管理员账号" autoComplete="username" />
          </div>
          <div className="v2-fm-row">
            <label className="v2-fm-label">密码</label>
            <input className="v2-fm-i" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" autoComplete="current-password" />
          </div>
          <button className="v2-btn lg" style={{ width: '100%', marginTop: 6 }} disabled={loading} type="submit">
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
        {CAS_ENABLED && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 14px', color: 'var(--p-t4)', fontSize: 11 }}>
              <span style={{ flex: 1, height: 1, background: 'var(--p-line2)' }} />或<span style={{ flex: 1, height: 1, background: 'var(--p-line2)' }} />
            </div>
            <button className="v2-btn ghost" style={{ width: '100%', height: 42 }}
              onClick={() => { window.location.href = `${apiBase}/auth/cas-login`; }}>
              <Icon name="users" size={15} /> 统一身份认证登录
            </button>
          </>
        )}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11.5, color: 'var(--p-t4)' }}>
          © 2026 无锡职业技术大学 · 信息化与数据服务中心
        </div>
      </div>
    </div>
  );
}
