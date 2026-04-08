import adminRequest from './request';

export function uploadFile(formData) {
  return adminRequest.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getFileInfo(id) {
  return adminRequest.get(`/files/${id}`);
}

export function deleteFile(id) {
  return adminRequest.delete(`/files/${id}`);
}

export function getDownloadUrl(id) {
  return `/api/v1/files/download/${id}`;
}
