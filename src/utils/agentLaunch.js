import { getAgentDetail } from '../api/agent';

/** 学工号经 gzip + base64 编码后作为 sys.user_id 传给外部系统 */
async function encodeUserId(userId) {
  const encoded = new TextEncoder().encode(userId);
  const stream = new Blob([encoded]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(compressed);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 统一唤起智能体：有 externalUrl 则外跳（带上登录态），否则进站内对话页。
 * 首页（仪表盘）与智能体广场共用，避免两处逻辑漂移。
 */
export async function launchAgent(navigate, agentId, user) {
  try {
    const detail = await getAgentDetail(agentId);
    const url = detail.externalUrl || detail.external_url;
    if (url) {
      // 站内哈希路由（如 #/college-query/101）走内部导航，避免 window.open 错位
      if (url.startsWith('#/')) {
        navigate(url.replace(/^#/, ''));
      } else {
        const separator = url.includes('?') ? '&' : '?';
        let finalUrl = url;
        if (user?.username) {
          const encoded = await encodeUserId(user.username);
          finalUrl = `${url}${separator}sys.user_id=${encodeURIComponent(encoded)}`;
        }
        window.open(finalUrl, '_blank');
      }
    } else {
      navigate(`/chat/${agentId}`);
    }
  } catch {
    navigate(`/chat/${agentId}`);
  }
}
