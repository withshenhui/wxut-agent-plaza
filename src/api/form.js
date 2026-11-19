import userRequest from './userRequest';
import { apiBase } from './request';

/** 智能填报 API（登录用户态）。SSE 用 EventSource 无法带 Authorization 头，token 走查询参数。 */

export function listTemplates(all) {
  return userRequest.get('/form/templates', { params: all ? { all: true } : {} });
}

export function uploadTemplate(file, name) {
  const fd = new FormData();
  fd.append('file', file);
  if (name) fd.append('name', name);
  return userRequest.post('/form/templates/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
}

export function updateTemplate(id, body) {
  return userRequest.put(`/form/templates/${id}`, body);
}

export function deleteTemplate(id) {
  return userRequest.delete(`/form/templates/${id}`);
}

export function searchTeachers(keyword) {
  return userRequest.get('/form/teachers', { params: { keyword }, timeout: 30000 });
}

export function pageRecords(params) {
  return userRequest.get('/form/records', { params });
}

export function getRecord(id) {
  return userRequest.get(`/form/records/${id}`);
}

export function createRecord(body) {
  return userRequest.post('/form/records', body);
}

export function updateRecord(id, body) {
  return userRequest.put(`/form/records/${id}`, body, { timeout: 30000 });
}

export function deleteRecord(id) {
  return userRequest.delete(`/form/records/${id}`);
}

export function askAssistant(question) {
  return userRequest.post('/form/assistant', { question }, { timeout: 60000 });
}

/** SSE 填写流水线 URL（EventSource 直连） */
export function streamUrl(recordId) {
  const token = localStorage.getItem('user_token') || '';
  return `${apiBase}/form/records/${recordId}/stream?token=${encodeURIComponent(token)}`;
}

/** SSE 单字段重新起草 URL */
export function regenUrl(recordId, index) {
  const token = localStorage.getItem('user_token') || '';
  return `${apiBase}/form/records/${recordId}/regen?index=${index}&token=${encodeURIComponent(token)}`;
}
