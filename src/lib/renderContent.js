//把笔记的 html 转换成展示用的 html: 标签可点击, 网址变成链接, 搜索词高亮
//在 DOM 上逐个处理文字节点, 不会改动 html 属性(例如 <a href> 中的网址), 也不会破坏标签结构

const BLOCKED = "script,style,iframe,object,embed,link,meta,base,form";
//网址到空白, 引号, 尖括号或中文标点为止
const URL_RE = /https?:\/\/[^\s<>"'`，。！？、；：（）《》「」『』【】]+/gi;
//网址末尾的英文标点通常属于句子而不是网址
const TRAILING = /[.,;:!?'")\]}>]+$/;

function closest(node, selector) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return el ? el.closest(selector) : null;
}

function textNodes(root, skip) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeValue && !(skip && closest(node, skip))) nodes.push(node);
    }
    return nodes;
}

//把文字节点中 regex 匹配到的部分替换成 make(匹配文字) 返回的节点
function replaceText(node, regex, make) {
    const text = node.nodeValue;
    regex.lastIndex = 0;
    let match;
    let last = 0;
    let fragment = null;
    while ((match = regex.exec(text))) {
        const result = make(match[0]);
        if (!result) continue;
        const {el, length = match[0].length} = result;
        fragment = fragment || document.createDocumentFragment();
        if (match.index > last) fragment.append(text.slice(last, match.index));
        fragment.append(el);
        last = match.index + length;
        regex.lastIndex = last;
    }
    if (!fragment) return;
    if (last < text.length) fragment.append(text.slice(last));
    node.replaceWith(fragment);
}

//网址太长时只显示 域名 + 路径, 超出部分省略
export function shortUrl(url, max = 40) {
    let display = url;
    try {
        const parsed = new URL(url);
        const path = parsed.pathname === "/" ? "" : parsed.pathname;
        display = parsed.host.replace(/^www\./, "") + path + (path ? "" : parsed.search + parsed.hash);
        try {
            display = decodeURIComponent(display);
        } catch (e) {
            //保留原始编码
        }
    } catch (e) {
        display = url.replace(/^https?:\/\//i, "");
    }
    return display.length > max ? `${display.slice(0, max - 1)}…` : display;
}

function looksLikeUrl(text) {
    return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
}

function makeLink(href, text) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
}

function sanitize(root) {
    root.querySelectorAll(BLOCKED).forEach((el) => el.remove());
    root.querySelectorAll("*").forEach((el) => {
        for (const attr of [...el.attributes]) {
            if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        }
    });
}

//已有的链接: 新窗口打开; 显示文字就是网址时显示成短网址
function normalizeLinks(root) {
    root.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (!/^(https?:|mailto:)/i.test(href)) {
            a.removeAttribute("href");
            return;
        }
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = href;
        a.classList.add("neno-link");
        if (looksLikeUrl(a.textContent) && a.children.length === 0) a.textContent = shortUrl(a.textContent.trim());
    });
}

function trimUrl(raw) {
    let url = raw.replace(TRAILING, "");
    //保留成对的右括号, 例如维基百科的链接
    const opens = (url.match(/\(/g) || []).length;
    const closes = (url.match(/\)/g) || []).length;
    if (opens > closes && raw.charAt(url.length) === ")") url += ")";
    return url;
}

function linkify(root) {
    for (const node of textNodes(root, "a, code, pre")) {
        replaceText(node, URL_RE, (raw) => {
            const url = trimUrl(raw);
            if (url.length <= "https://".length) return null;
            const a = makeLink(url, shortUrl(url));
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.title = url;
            a.className = "neno-link";
            return {el: a, length: url.length};
        });
    }
}

function markTags(root, tags) {
    const set = new Set((tags || []).filter(Boolean));
    if (set.size === 0) return;
    for (const node of textNodes(root, "a, code, pre")) {
        replaceText(node, /#\S+/g, (token) => {
            if (!set.has(token)) return null;
            const span = document.createElement("span");
            span.className = "neno-tag";
            span.textContent = token;
            return {el: span};
        });
    }
}

function highlight(root, keyword) {
    const text = (keyword || "").trim();
    if (!text) return;
    const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    for (const node of textNodes(root)) {
        replaceText(node, regex, (match) => {
            const span = document.createElement("span");
            span.className = "neno-highlight";
            span.textContent = match;
            return {el: span};
        });
    }
}

//clickableTags: 标签可以点击筛选(列表中), 分享卡片中不需要
export function renderContent(html, {tags = [], keyword = "", clickableTags = false} = {}) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const root = template.content;
    sanitize(root);
    normalizeLinks(root);
    linkify(root);
    markTags(root, tags);
    highlight(root, keyword);
    if (clickableTags) {
        root.querySelectorAll(".neno-tag").forEach((span) => {
            span.id = "tagtag";
            span.setAttribute("onclick", "tagClick(this)");
        });
    }
    return template.innerHTML;
}
