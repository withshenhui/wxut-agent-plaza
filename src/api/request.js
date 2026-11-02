import axios from 'axios';

// 生产环境前后端同源部署（域名 aicenter 根路径与 IP:3001/agent-plaza 均可达），
// 用同源相对路径让"从哪个入口进就调哪个入口"，IP 入口不被带到域名。
// 开发环境走 Vite 代理用 /api
export const apiBase = import.meta.env.PROD
  ? '/agent-plaza/api/v1'
  : '/api/v1';

const adminRequest = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

adminRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminRequest.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code === 200) return data;
    return Promise.reject(new Error(message || '请求失败'));
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.hash = '#/admin/login';
    }
    const msg = err.response?.data?.message || err.message;
    return Promise.reject(new Error(msg));
  },
);

export default adminRequest;
