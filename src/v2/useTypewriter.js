import { useEffect, useRef, useState } from 'react';

/* 滴字节奏：每 18ms 前进 2–4 个字符（落后越多越快，封顶 4）→ 约 110–220 字/秒 */
const TICK_MS = 18;

/**
 * 每 tick 应前行的字符数（纯函数，便于 node --test 单测，不依赖 React）。
 * lag = 目标长度 - 已显示长度；lag<=0 返回 0。
 * 恒在 [2, 4] 内：短落后滴 2 字，长落后最多滴 4 字，兼顾"丝滑"与"落后时追得上"。
 * @param {number} lag
 * @returns {number} 0 或 2..4
 */
export function typewriterStep(lag) {
  if (!(lag > 0)) return 0;
  return Math.min(4, Math.max(2, Math.round(lag / 12) + 2));
}

/**
 * 平滑打字机：把"目标内容" text 逐字"滴"出来显示，返回当前应显示的 shown。
 *
 * 仅用于「正在流式」的 AI 气泡——非流式（历史/已完成）不要用它，直接渲染原文，
 * 否则会把已完成的回复再"重播"一遍动画。
 *
 * 行为：
 * - streaming 为真：每 TICK_MS 把 shown 往 text 靠近 typewriterStep() 个字符，直到追上；
 * - streaming 转 false：立即 shown = text（收尾不拖沓，不补动画）；
 * - text 变短（切换会话 / 重置）：立即同步为 text，避免残留上一段内容；
 * - 定时器只随 streaming 的生命周期建立/清理（不因每片 text 增长而重建，滴速稳定）；
 * - 组件卸载（切换消息，key 变化即重挂）自动清定时器。
 *
 * @param {string} text 目标内容（SSE 分片会让它持续增长）
 * @param {boolean} streaming 是否仍在流式
 * @returns {string} 当前应显示的 shown（text 的前缀）
 */
export function useTypewriter(text, streaming) {
  const target = typeof text === 'string' ? text : '';
  const [shown, setShown] = useState(target);
  const shownRef = useRef(shown);   // 已显示的权威值（避免闭包/批处理读到旧 state）
  const targetRef = useRef(target); // 目标的最新值（分片增长后定时器也能读到）
  targetRef.current = target;

  // 非流式 或 目标变短 → 立即同步（不二次动画、不残留旧内容）
  useEffect(() => {
    if (!streaming || target.length < shownRef.current.length) {
      if (shownRef.current !== target) { shownRef.current = target; setShown(target); }
    }
  }, [target, streaming]);

  // 滴字定时器：只随 streaming 建/拆
  useEffect(() => {
    if (!streaming) return undefined;
    const timer = setInterval(() => {
      const cur = shownRef.current;
      const tgt = targetRef.current;
      if (cur === tgt) return;                                  // 已追上，空转等下一片
      if (tgt.length < cur.length) {                            // 过程中目标变短（切换会话）
        shownRef.current = tgt; setShown(tgt); return;
      }
      const next = tgt.slice(0, cur.length + typewriterStep(tgt.length - cur.length));
      shownRef.current = next;
      setShown(next);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [streaming]);

  return shown;
}

export default useTypewriter;
