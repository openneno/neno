import {writable} from "svelte/store";
import {settingStore} from "../store/store.js";
import {prefersReducedMotion} from "./motion.js";

//可选的主题色, key 对应 main.css 中的 [data-theme] 色板, swatch 用于设置页预览
export const THEME_COLORS = [
    {key: "green", name: "薄荷绿", swatch: "oklch(72.3% 0.219 149.579)"},
    {key: "teal", name: "青碧", swatch: "oklch(70.4% 0.14 182.503)"},
    {key: "blue", name: "海湾蓝", swatch: "oklch(62.3% 0.214 259.815)"},
    {key: "violet", name: "薰衣草紫", swatch: "oklch(60.6% 0.25 292.717)"},
    {key: "rose", name: "樱花粉", swatch: "oklch(64.5% 0.246 16.439)"},
    {key: "orange", name: "暖阳橙", swatch: "oklch(70.5% 0.213 47.604)"},
];

export const THEME_MODES = [
    {key: "light", name: "浅色", icon: "ri-sun-line"},
    {key: "dark", name: "深色", icon: "ri-moon-line"},
    {key: "system", name: "跟随系统", icon: "ri-computer-line"},
];

//当前实际是否处于深色模式(themeMode 为 system 时取决于系统设置)
export const isDarkTheme = writable(false);

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

//兼容旧版本只保存了 isDark 的设置
export function normalizeSetting(setting) {
    const result = {...setting};
    if (!THEME_MODES.some((mode) => mode.key === result.themeMode)) {
        result.themeMode = result.isDark ? "dark" : "light";
    }
    if (!THEME_COLORS.some((color) => color.key === result.themeColor)) {
        result.themeColor = "green";
    }
    return result;
}

function resolveDark(setting) {
    return setting.themeMode === "dark" || (setting.themeMode === "system" && darkQuery.matches);
}

let appliedKey = null;
let switchTimer = null;

function applyTheme(setting) {
    const dark = resolveDark(setting);
    const root = document.documentElement;
    //首次应用时不做渐变, 之后切换主题色或深浅模式时颜色平滑过渡
    const key = `${setting.themeColor}|${dark}`;
    if (appliedKey !== null && appliedKey !== key && !prefersReducedMotion()) {
        root.classList.add("theme-switching");
        clearTimeout(switchTimer);
        switchTimer = setTimeout(() => root.classList.remove("theme-switching"), 350);
    }
    appliedKey = key;
    root.dataset.theme = setting.themeColor;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#0f1013" : "#f6f6f3");
    isDarkTheme.set(dark);
}

let current = normalizeSetting({});

//在 settingStore 从 localStorage 恢复之后调用, 之后的设置变化会自动应用并保存
export function initTheme() {
    settingStore.subscribe((value) => {
        current = normalizeSetting(value);
        applyTheme(current);
    });
    darkQuery.addEventListener("change", () => applyTheme(current));
}

export function updateTheme(patch) {
    settingStore.update((value) => {
        const next = normalizeSetting({...value, ...patch});
        next.isDark = resolveDark(next);
        try {
            window.localStorage.setItem("settingStore", JSON.stringify(next));
        } catch (e) {
            console.log(e);
        }
        return next;
    });
}

//侧边栏的快捷切换: 在浅色与深色之间切换
export function toggleDarkMode() {
    updateTheme({themeMode: resolveDark(current) ? "light" : "dark"});
}
