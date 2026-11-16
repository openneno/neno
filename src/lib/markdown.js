//编辑器的 Markdown 模式: 笔记仍然以 html 保存, 切换模式和发送时在 Markdown 与 html 之间转换
//与编辑器一致, 每一行是一个段落, 空行就是一个空段落, 来回切换不会丢失换行

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PLACEHOLDER = "\u0000";

//行内语法: 转义, `代码`, [文字](网址), **加粗**, *斜体*, ~~删除线~~, <u>下划线</u>
function inline(text) {
    const kept = [];
    const keep = (html) => `${PLACEHOLDER}${kept.push(html) - 1}${PLACEHOLDER}`;
    let out = text
        .replace(/\\([\\`*_~[\]()#>+\-.!|<])/g, (_, char) => keep(escapeHtml(char)))
        .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`))
        .replace(/\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g, (_, label, href) => {
            if (!/^(https?:|mailto:)/i.test(href)) href = `https://${href}`;
            return keep(`<a href="${escapeHtml(href)}">`) + label + keep("</a>");
        })
        .replace(/<(\/?)u>/gi, (_, close) => keep(`<${close}u>`));
    out = escapeHtml(out)
        .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(?=\S)([^*]*?\S)\*/g, "<em>$1</em>")
        .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<s>$1</s>");
    return out.replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g"), (_, i) => kept[i]);
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

export function markdownToHtml(markdown) {
    const lines = (markdown || "").replace(/\r\n?/g, "\n").replace(/\s+$/, "").split("\n");
    const html = [];
    //当前打开的列表: [{tag, indent}]
    let lists = [];
    const closeLists = (depth = 0) => {
        while (lists.length > depth) html.push(`</li></${lists.pop().tag}>`);
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const fence = line.match(/^\s*```/);
        if (fence) {
            closeLists();
            const code = [];
            i++;
            while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
            html.push(`<pre>${escapeHtml(code.join("\n"))}</pre>`);
            continue;
        }

        const item = line.match(LIST_RE);
        if (item) {
            const tag = /\d/.test(item[2]) ? "ol" : "ul";
            const indent = item[1].replace(/\t/g, "    ").length;
            //缩进更深的作为子列表, 每级至少 2 个空格
            while (lists.length && indent < lists[lists.length - 1].indent) closeLists(lists.length - 1);
            const top = lists[lists.length - 1];
            if (top && indent >= top.indent + 2) {
                html.push(`<${tag}><li>`);
                lists.push({tag, indent});
            } else if (top && top.tag === tag) {
                html.push("</li><li>");
            } else {
                if (top) closeLists(lists.length - 1);
                html.push(`<${tag}><li>`);
                lists.push({tag, indent});
            }
            html.push(inline(item[3]));
            continue;
        }
        closeLists();

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            continue;
        }
        const quote = line.match(/^>\s?(.*)$/);
        if (quote) {
            html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
            continue;
        }
        html.push(line.trim() ? `<p>${inline(line)}</p>` : "<p><br></p>");
    }
    closeLists();
    return html.join("");
}

//行首会被当成 Markdown 语法的文字需要转义
function escapeLineStart(text) {
    return text
        .replace(/^(\s*)(#{1,6}\s|>|[-+]\s)/, "$1\\$2")
        .replace(/^(\s*\d+)([.)]\s)/, "$1\\$2");
}

function escapeInline(text) {
    return text.replace(/([\\`*~[\]])/g, "\\$1").replace(/<(\/?u>)/gi, "\\<$1");
}

function inlineToMarkdown(node) {
    let out = "";
    for (const child of node.childNodes) {
        if (child.nodeType === 3) {
            out += escapeInline(child.nodeValue.replace(/\u00a0/g, " "));
            continue;
        }
        if (child.nodeType !== 1) continue;
        const inner = inlineToMarkdown(child);
        switch (child.tagName) {
            case "STRONG":
            case "B":
                out += inner.trim() ? `**${inner}**` : inner;
                break;
            case "EM":
            case "I":
                out += inner.trim() ? `*${inner}*` : inner;
                break;
            case "S":
            case "DEL":
            case "STRIKE":
                out += inner.trim() ? `~~${inner}~~` : inner;
                break;
            case "U":
                out += inner.trim() ? `<u>${inner}</u>` : inner;
                break;
            case "CODE":
                out += `\`${child.textContent}\``;
                break;
            case "A": {
                const href = child.getAttribute("href") || "";
                out += !href || child.textContent === href ? inner : `[${inner}](${href})`;
                break;
            }
            case "BR":
                break;
            case "UL":
            case "OL":
                break;
            default:
                out += inner;
        }
    }
    return out;
}

function listToMarkdown(list, depth, lines) {
    let number = 1;
    for (const li of list.children) {
        if (li.tagName !== "LI") continue;
        const marker = list.tagName === "OL" ? `${number++}.` : "-";
        lines.push(`${"   ".repeat(depth)}${marker} ${inlineToMarkdown(li)}`);
        for (const sub of li.children) {
            if (sub.tagName === "UL" || sub.tagName === "OL") listToMarkdown(sub, depth + 1, lines);
        }
    }
}

export function htmlToMarkdown(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const lines = [];
    for (const node of template.content.childNodes) {
        if (node.nodeType === 3) {
            if (node.nodeValue.trim()) lines.push(escapeLineStart(escapeInline(node.nodeValue)));
            continue;
        }
        if (node.nodeType !== 1) continue;
        const tag = node.tagName;
        if (tag === "UL" || tag === "OL") {
            listToMarkdown(node, 0, lines);
        } else if (/^H[1-6]$/.test(tag)) {
            lines.push(`${"#".repeat(Number(tag[1]))} ${inlineToMarkdown(node)}`);
        } else if (tag === "BLOCKQUOTE") {
            lines.push(`> ${inlineToMarkdown(node)}`.trimEnd());
        } else if (tag === "PRE") {
            lines.push("```", node.textContent.replace(/^\n|\n$/g, ""), "```");
        } else {
            lines.push(escapeLineStart(inlineToMarkdown(node)));
        }
    }
    return lines.join("\n");
}
