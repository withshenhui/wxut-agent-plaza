import adminRequest from './request';

export function listFeedback(params) {
  return adminRequest.get('/feedback/list', { params });
}

export function updateFeedbackStatus(id, status) {
  return adminRequest.put(`/feedback/${id}/status`, { status });
}
