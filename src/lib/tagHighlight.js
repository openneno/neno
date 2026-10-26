//编辑器中的 #标签 着色
//使用 CSS 自定义高亮(CSS.highlights + ::highlight(neno-tag)), 只改变绘制效果,
//不修改编辑器的 DOM, 也不会写入笔记内容; 不支持的浏览器保持原样
const SUPPORTED = typeof CSS !== "undefined" && !!CSS.highlights && typeof Highlight !== "undefined";
const NAME = "neno-tag";
//与保存时提取标签的规则一致: # 开头直到空白
const TAG = /#\S+/g;

let shared = null;

function sharedHighlight() {
    if (!shared) {
        shared = new Highlight();
        CSS.highlights.set(NAME, shared);
    }
    return shared;
}

//编辑器的段落: 根节点的子元素, 列表展开为每一项
function blocksOf(root) {
    const blocks = [];
    for (const el of root.children) {
        if (el.tagName === "OL" || el.tagName === "UL") blocks.push(...el.children);
        else blocks.push(el);
    }
    return blocks;
}

//把段落内的文字位置换算到具体的文字节点(加粗等格式会把一个标签拆成多个节点)
function setPoint(range, method, nodes, offset) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].start <= offset) {
            range[method](nodes[i].node, Math.min(offset - nodes[i].start, nodes[i].node.nodeValue.length));
            return;
        }
    }
}

function tagRanges(root) {
    const ranges = [];
    for (const block of blocksOf(root)) {
        const nodes = [];
        let text = "";
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            nodes.push({node: walker.currentNode, start: text.length});
            text += walker.currentNode.nodeValue;
        }
        if (!text.includes("#")) continue;
        TAG.lastIndex = 0;
        let match;
        while ((match = TAG.exec(text))) {
            const range = document.createRange();
            setPoint(range, "setStart", nodes, match.index);
            setPoint(range, "setEnd", nodes, match.index + match[0].length);
            ranges.push(range);
        }
    }
    return ranges;
}

//为一个 quill 编辑器开启标签着色, 返回取消函数; 多个编辑器共用同一个高亮
export function highlightTags(quill) {
    if (!SUPPORTED) return () => {};
    let mine = [];
    let frame = 0;
    const update = () => {
        frame = 0;
        const highlight = sharedHighlight();
        mine.forEach((range) => highlight.delete(range));
        mine = tagRanges(quill.root);
        mine.forEach((range) => highlight.add(range));
    };
    //连续输入时每帧只计算一次
    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    quill.on("text-change", schedule);
    return () => {
        quill.off("text-change", schedule);
        if (frame) cancelAnimationFrame(frame);
        const highlight = sharedHighlight();
        mine.forEach((range) => highlight.delete(range));
        mine = [];
    };
}
