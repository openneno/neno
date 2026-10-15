//统一的过渡动画. 系统开启"减少动态效果"时所有过渡立即完成
//(svelte 的过渡由 JS 驱动, 不受 CSS 中 prefers-reduced-motion 规则影响, 所以在这里处理)
import {fade as svelteFade, fly as svelteFly, scale as svelteScale, slide as svelteSlide} from "svelte/transition";
import {cubicOut} from "svelte/easing";

const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion() {
    return reducedQuery.matches;
}

function guard(transition) {
    return (node, params = {}) =>
        transition(node, prefersReducedMotion() ? {...params, duration: 0, delay: 0} : params);
}

export const fade = guard(svelteFade);
export const fly = guard(svelteFly);
export const scale = guard(svelteScale);
export const slide = guard(svelteSlide);

//弹出菜单: 从触发按钮的方向轻微放大并淡入
export function pop(node, {duration = 140, start = 0.95, y = -4, origin = "top right"} = {}) {
    node.style.transformOrigin = origin;
    return {
        duration: prefersReducedMotion() ? 0 : duration,
        easing: cubicOut,
        css: (t, u) => `opacity: ${t}; transform: translateY(${u * y}px) scale(${start + (1 - start) * t});`,
    };
}

//列表中的笔记: 只有刚新增/删除的笔记才播放动画, 首次加载和整体刷新时不播放
//高度从 0 展开并淡入, 让后面的笔记平滑地让出位置
export function noteEnter(node, {active = false, duration = 260} = {}) {
    if (!active || prefersReducedMotion()) return {duration: 0};
    const height = node.offsetHeight;
    return {
        duration,
        easing: cubicOut,
        css: (t, u) => `overflow: hidden; height: ${t * height}px; opacity: ${t}; transform: translateY(${-8 * u}px);`,
    };
}

export function noteLeave(node, {active = false, duration = 220} = {}) {
    if (!active || prefersReducedMotion()) return {duration: 0};
    const height = node.offsetHeight;
    return {
        duration,
        easing: cubicOut,
        css: (t) => `overflow: hidden; height: ${t * height}px; opacity: ${t}; transform: scale(${0.98 + 0.02 * t});`,
    };
}
