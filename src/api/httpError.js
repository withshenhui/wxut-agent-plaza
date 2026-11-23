/**
 * HTTP 错误的友好中文映射（全站统一）。
 * 优先使用后端返回的业务 message；无 message 时按状态码给友好文案；
 * 兜底绝不把 "Request failed with status code 403" 这类英文原文暴露给用户。
 */
const STATUS_TEXT = {
  400: '请求参数有误，请检查后重试',
  401: '登录已过期，请重新登录',
  403: '没有权限访问，如需开通请联系管理员',
  404: '请求的内容不存在或已被删除',
  405: '操作方式不被支持',
  408: '请求超时，请稍后重试',
  413: '内容过大，超出了大小限制',
  429: '操作过于频繁，请稍后再试',
  500: '服务开小差了，请稍后重试',
  502: '服务暂时不可用，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '服务响应超时，请稍后重试',
};

export function friendlyHttpError(err) {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;
  if (serverMsg && typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg;
  if (status && STATUS_TEXT[status]) return STATUS_TEXT[status];
  if (!err?.response) return '网络异常，请检查网络后重试';
  // 非 JSON 响应体（网关/代理错误页）时避免暴露英文技术信息
  return '请求失败，请稍后重试';
}
