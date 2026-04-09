import axios from 'axios';

const apiBase = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`
  : '/api/v1';

const userRequest = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

userRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

userRequest.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code === 200) return data;
    return Promise.reject(new Error(message || '请求失败'));
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('user_token');
    }
    const msg = err.response?.data?.message || err.message;
    return Promise.reject(new Error(msg));
  },
);

export default userRequest;
