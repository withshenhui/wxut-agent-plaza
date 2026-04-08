import adminRequest from './request';

export function listUsers(params) {
  return adminRequest.get('/users', { params });
}

export function getUser(id) {
  return adminRequest.get(`/users/${id}`);
}

export function updateUser(id, data) {
  return adminRequest.put(`/users/${id}`, data);
}

export function updateUserStatus(id, status) {
  return adminRequest.put(`/users/${id}/status`, null, { params: { status } });
}

export function resetPassword(id, password) {
  return adminRequest.put(`/users/${id}/password`, null, { params: { password } });
}
