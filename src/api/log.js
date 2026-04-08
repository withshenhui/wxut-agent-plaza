import adminRequest from './request';

export function listLogs(params) {
  return adminRequest.get('/logs', { params });
}
