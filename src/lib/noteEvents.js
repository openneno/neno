//笔记新增/修改/删除的通知, 让各个列表(主列表, 搜索结果, 批注面板, 每日回顾, 随机漫步)保持一致
import {withRelations} from "../request/fetchApi.js";

const target = new EventTarget();

//type: add | update | delete, note: 改动后的笔记(删除时为删除前的笔记)
export function emitNoteChange(type, note) {
    target.dispatchEvent(new CustomEvent("change", {detail: {type, note}}));
}

export function onNoteChange(listener) {
    const handler = (event) => listener(event.detail);
    target.addEventListener("change", handler);
    return () => target.removeEventListener("change", handler);
}

//列表中的这条笔记是否会因为这次改动而需要更新批注关系
function isRelated(item, note) {
    return item._id === note.parentId
        || item.parentId === note._id
        || (item.children || []).some((child) => child._id === note._id
            || (child.children || []).some((grandchild) => grandchild._id === note._id));
}

//把改动应用到一个笔记列表上, 返回新的列表
//addToList 为 true 时新增的笔记会插入到列表最前面(主列表需要, 搜索结果等不需要)
export async function applyNoteChange(items, {type, note}, {addToList = false} = {}) {
    let result = items;
    if (type === "delete") {
        result = result.filter((item) => item._id !== note._id);
    } else if (type === "update") {
        if (result.some((item) => item._id === note._id)) {
            const fresh = await withRelations(note);
            result = result.map((item) => (item._id === note._id ? fresh : item));
        }
    } else if (type === "add" && addToList && !result.some((item) => item._id === note._id)) {
        result = [await withRelations(note), ...result];
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
