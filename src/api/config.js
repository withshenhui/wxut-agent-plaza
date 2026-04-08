import adminRequest from './request';
import axios from 'axios';

const publicRequest = axios.create({ baseURL: '/api/v1', timeout: 10000 });
publicRequest.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code === 200) return data;
    return Promise.reject(new Error(message || '请求失败'));
  },
  (err) => Promise.reject(err),
);

export function getPublicConfig(key) {
  return publicRequest.get(`/configs/${key}`);
}

export function listConfigs() {
  return adminRequest.get('/configs');
}

export function getConfig(key) {
  return adminRequest.get(`/configs/${key}`);
}

export function updateConfig(key, value) {
  return adminRequest.put(`/configs/${key}`, value, { headers: { 'Content-Type': 'text/plain' } });
}
