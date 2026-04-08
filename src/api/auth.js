import adminRequest from './request';

export function login(username, password) {
  return adminRequest.post('/auth/login', { username, password });
}

export function getUserInfo() {
  return adminRequest.get('/auth/info');
}

export function register(data) {
  return adminRequest.post('/auth/register', data);
}
