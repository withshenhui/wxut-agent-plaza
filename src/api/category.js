import adminRequest from './request';

export function listCategories() {
  return adminRequest.get('/categories');
}

export function getCategory(id) {
  return adminRequest.get(`/categories/${id}`);
}

export function createCategory(data) {
  return adminRequest.post('/categories', data);
}

export function updateCategory(id, data) {
  return adminRequest.put(`/categories/${id}`, data);
}

export function deleteCategory(id) {
  return adminRequest.delete(`/categories/${id}`);
}
