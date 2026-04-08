import axios from 'axios';

const adminRequest = axios.create({
  baseURL: '/api/v1',
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
