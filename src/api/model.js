import adminRequest from './request';
import axios from 'axios';

const apiBase = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`
  : '/api/v1';

const publicRequest = axios.create({ baseURL: apiBase, timeout: 10000 });
publicRequest.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code === 200) return data;
    return Promise.reject(new Error(message || '请求失败'));
  },
  (err) => Promise.reject(err),
);

export function searchModels(params) {
  return publicRequest.get('/models', { params });
}

export function getModel(id) {
  return publicRequest.get(`/models/${id}`);
}

export function createModel(data) {
  return adminRequest.post('/models', data);
}

export function updateModel(id, data) {
  return adminRequest.put(`/models/${id}`, data);
}

export function deleteModel(id) {
  return adminRequest.delete(`/models/${id}`);
}
