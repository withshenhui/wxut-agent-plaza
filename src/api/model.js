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
