//本地数据变化的通知, 让 fetchApi 不必直接依赖同步引擎(避免循环引用)
const target = new EventTarget();

export function notifyLocalChange() {
    target.dispatchEvent(new Event("change"));
}

export function onLocalChange(listener) {
    target.addEventListener("change", listener);
    return () => target.removeEventListener("change", listener);
}
