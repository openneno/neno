//笔记新增/修改/删除的通知, 让各个列表(主列表, 搜索结果, 批注面板, 每日回顾, 随机漫步)保持一致
//同一个浏览器的其他标签页通过 BroadcastChannel 收到同样的通知, 不需要经过 GitHub 就能立即更新
import {withRelations} from "../request/fetchApi.js";
import {reload} from "../store/store.js";

const target = new EventTarget();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("neno-notes") : null;

//发送给其他标签页的笔记, 去掉只在界面上使用的关联字段
function plainNote(note) {
    // eslint-disable-next-line no-unused-vars
    const {parent, children, ...data} = note;
    return data;
}

function post(message) {
    if (!channel) return;
    try {
        channel.postMessage(message);
    } catch (e) {
        console.log("BroadcastChannel", e);
    }
}

//type: add | update | delete, note: 改动后的笔记(删除时为删除前的笔记)
export function emitNoteChange(type, note, {broadcast = true} = {}) {
    target.dispatchEvent(new CustomEvent("change", {detail: {type, note}}));
    if (broadcast) post({kind: "note", type, note: plainNote(note)});
}

//置顶标签等不是单条笔记的变化, 通知其他标签页刷新侧边栏
export function broadcastDataChange() {
    post({kind: "data"});
}

export function onNoteChange(listener) {
    const handler = (event) => listener(event.detail);
    target.addEventListener("change", handler);
    return () => target.removeEventListener("change", handler);
}

let statsTimer = null;

if (channel) {
    channel.addEventListener("message", (event) => {
        const message = event.data || {};
        if (message.kind === "note") {
            emitNoteChange(message.type, message.note, {broadcast: false});
        }
        //侧边栏的统计, 标签, 置顶合并刷新一次
        clearTimeout(statsTimer);
        statsTimer = setTimeout(() => reload.set({tag: Date.now(), action: "nenoCount"}), 300);
    });
}

//列表中的这条笔记是否会因为这次改动而需要更新批注关系
function isRelated(item, note) {
    return item._id === note.parentId
        || item.parentId === note._id
        || (item.children || []).some((child) => child._id === note._id
            || (child.children || []).some((grandchild) => grandchild._id === note._id));
}

//把改动应用到一个笔记列表上, 返回新的列表(列表按 _id 即创建时间倒序)
//addToList: 新增的笔记插入到列表中对应的位置(主列表需要, 搜索结果等不需要)
//appendIfOlder: 新增的笔记比已加载的都旧时是否追加到末尾; 分页还没加载完时不追加, 之后翻页会加载到
export async function applyNoteChange(items, {type, note}, {addToList = false, appendIfOlder = true} = {}) {
    let result = items;
    if (type === "delete") {
        result = result.filter((item) => item._id !== note._id);
    } else if (type === "update") {
        if (result.some((item) => item._id === note._id)) {
            const fresh = await withRelations(note);
            result = result.map((item) => (item._id === note._id ? fresh : item));
        }
    } else if (type === "add" && addToList && !result.some((item) => item._id === note._id)) {
        const index = result.findIndex((item) => item._id < note._id);
        if (index !== -1) {
            const fresh = await withRelations(note);
            result = [...result.slice(0, index), fresh, ...result.slice(index)];
        } else if (appendIfOlder || result.length === 0) {
            result = [...result, await withRelations(note)];
        }
    }
    //刷新父笔记/批注的关联展示
    const related = result.filter((item) => item._id !== note._id && isRelated(item, note));
    if (related.length > 0) {
        const fresh = new Map();
        for (const item of related) {
            fresh.set(item._id, await withRelations(item));
        }
        result = result.map((item) => fresh.get(item._id) || item);
    }
    return result;
}
