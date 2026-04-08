import axios from 'axios';

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// 响应拦截：解包 { code, message, data }
request.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code === 200) return data;
    return Promise.reject(new Error(message || '请求失败'));
  },
  (err) => Promise.reject(err),
);

// 搜索智能体（支持分类和关键词）
export function searchAgents({ categoryId, keyword, page = 1, size = 100 } = {}) {
  return request.get('/agents', { params: { categoryId, keyword, page, size } });
}

// 获取推荐智能体
export function getRecommendedAgents() {
  return request.get('/agents/recommended');
}

// 获取智能体详情
export function getAgentDetail(id) {
  return request.get(`/agents/${id}`);
}

// 获取所有分类
export function getCategories() {
  return request.get('/categories');
}

// 管理端：创建智能体
export function createAgent(data) {
  const adminReq = import('./request').then(m => m.default);
  return adminReq.then(r => r.post('/agents', data));
}

// 管理端：更新智能体
export function updateAgent(id, data) {
  const adminReq = import('./request').then(m => m.default);
  return adminReq.then(r => r.put(`/agents/${id}`, data));
}

// 管理端：删除智能体
export function deleteAgent(id) {
  const adminReq = import('./request').then(m => m.default);
  return adminReq.then(r => r.delete(`/agents/${id}`));
}
