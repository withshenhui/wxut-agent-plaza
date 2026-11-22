import userRequest from './userRequest';

export const listKbs = (tab) => userRequest.get('/kb/list', { params: { tab } });
export const createKb = (data) => userRequest.post('/kb', data);
export const listFiles = (kbId) => userRequest.get(`/kb/${kbId}/files`);
export const deleteFile = (kbId, fileId) => userRequest.delete(`/kb/${kbId}/files/${fileId}`);
export const rebuildFile = (kbId, fileId) => userRequest.post(`/kb/${kbId}/files/${fileId}/rebuild`);
export const searchInKb = (kbId, q) => userRequest.get(`/kb/${kbId}/search`, { params: { q } });
