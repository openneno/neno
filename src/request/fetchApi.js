import {reload} from "../store/store.js";
import {getObjectId} from "../utils/objetid.js";
import {getObjectURL} from "../utils/process.js";
import {notifyLocalChange} from "../lib/sync/signal.js";
import {broadcastDataChange, emitNoteChange} from "../lib/noteEvents.js";
import {normalizeIcons} from "../lib/sync/repoLayout.js";
import {openDB} from 'idb';
import dayjs from "dayjs";


const db = openDB("neno", 5, {
    upgrade(db, oldVersion, newVersion, transaction) {
        console.log('数据库新建成功');

        let objectStore;
        if (!db.objectStoreNames.contains('nenoitem')) {
            objectStore = db.createObjectStore('nenoitem', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: true});// 创建索引
            objectStore.createIndex('parentId', 'parentId', {unique: false});// 创建索引

            objectStore = db.createObjectStore('nenoPic', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: true});

            objectStore = db.createObjectStore('nenoCount', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: false});

            objectStore = db.createObjectStore('task', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: true});

            objectStore = db.createObjectStore('nenoPinTags', {keyPath: '_id'});
        }
        //v5: 新的同步引擎. dirty 记录待推送的本地改动, syncState 记录与远端仓库的同步进度
        if (!db.objectStoreNames.contains('dirty')) {
            db.createObjectStore('dirty', {keyPath: 'key'});
        }
        if (!db.objectStoreNames.contains('syncState')) {
            db.createObjectStore('syncState', {keyPath: 'id'});
        }
    },
})

// ---------- 待同步的本地改动 ----------
//同一条笔记/图片多次修改只保留一条记录, rev 用于判断推送期间是否又有新的修改
const dirtyKey = (kind, id) => `${kind}:${id}`

export const markDirty = async (kind, id, extra = {}) => {
    await (await db).put('dirty', {
        key: dirtyKey(kind, id),
        kind,
        id,
        deleted: false,
        ...extra,
        at: Date.now(),
        rev: `${Date.now()}-${Math.random()}`,
    })
    notifyLocalChange()
}

export const getDirtyList = async () => (await db).getAll('dirty')

//只有在记录没有被再次修改时才清除
export const clearDirty = async (entry) => {
    const tx = (await db).transaction('dirty', 'readwrite')
    const current = await tx.store.get(entry.key)
    if (current && current.rev === entry.rev) {
        await tx.store.delete(entry.key)
    }
    await tx.done
}

export const getSyncState = async () => (await db).get('syncState', 'state')

export const saveSyncState = async (state) => (await db).put('syncState', {...state, id: 'state'})

//旧版本的同步任务队列, 只在升级时读取一次并转换为 dirty 记录
export const takeLegacyTasks = async () => {
    const tasks = await (await db).getAll('task')
    if (tasks.length > 0) {
        await (await db).clear('task')
    }
    return tasks.map((task) => task.data)
}

// ---------- 供同步引擎读写本地数据 ----------
export const getNote = async (_id) => (await db).get('nenoitem', _id)

export const getAllNotes = async () => (await db).getAll('nenoitem')

export const putNote = async (note) => (await db).put('nenoitem', note)

export const deleteNoteLocal = async (_id) => (await db).delete('nenoitem', _id)

export const getPic = async (_id) => (await db).get('nenoPic', _id)

export const putPic = async (_id, file) => (await db).put('nenoPic', {_id, file, created_at: "picData"})

export const deletePicLocal = async (_id) => (await db).delete('nenoPic', _id)

//标签设置(置顶标签和标签图标)只保存一条记录: {_id: "pinTags", tags, icons}
//旧版本的记录没有 icons, 读取时补上空对象
export const getTagSettings = async () => {
    const records = await (await db).getAll('nenoPinTags')
    const record = records[0] || {}
    return {tags: record.tags || [], icons: normalizeIcons(record.icons)}
}

export const setTagSettings = async ({tags, icons}) => {
    const tx = (await db).transaction('nenoPinTags', 'readwrite')
    await tx.store.clear()
    await tx.store.put({_id: "pinTags", tags: [...tags], icons: normalizeIcons(icons)})
    await tx.done
}

export const getPinTags = async () => (await getTagSettings()).tags

//只修改置顶标签, 保留标签图标
export const setPinTags = async (tags) => setTagSettings({...(await getTagSettings()), tags})

//设置或清除(icon 为空)标签的图标
export const setTagIcon = async (tag, icon) => {
    const settings = await getTagSettings()
    const icons = {...settings.icons}
    if (icon) icons[tag] = icon
    else delete icons[tag]
    await setTagSettings({...settings, icons})
    await markDirty("pinTags", "pinTags")
    broadcastDataChange()
    return icons
}


const readUploadedFileAsText = (inputFile) => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
        temporaryFileReader.onerror = () => {
            temporaryFileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        temporaryFileReader.onload = (e) => {
            resolve(e.target.result);
        };
        temporaryFileReader.readAsDataURL(inputFile);
    });
};

//每天的笔记数量, 由本地笔记计算(不再单独保存和同步), 按日期升序
export const getCountDate = async () => {
    const counts = {}
    for (const neno of await (await db).getAll("nenoitem")) {
        const date = neno.created_at.substring(0, 10)
        counts[date] = (counts[date] || 0) + 1
    }
    return Object.fromEntries(Object.entries(counts).sort((a, b) => (a[0] < b[0] ? -1 : 1)))
}

export const exportIndexedDBToFile = async () => {
    let allNeno = await (await db).getAll("nenoitem")
    //保持旧版导出文件的结构
    let allNenoCount = [{_id: "countDate", created_at: "countDate", ...(await getCountDate())}]
    let allNenoPinTags = await (await db).getAll("nenoPinTags")
    let allNenoPic = await (await db).getAll("nenoPic")
    let allNenopicBase64 = []
    for (const element of allNenoPic) {
        const blob = element.file;
        let picbase64 = await readUploadedFileAsText(blob)
        allNenopicBase64 = [...allNenopicBase64, {_id: element._id, file: picbase64}]
    }

    return {
        body: {
            allNeno: allNeno,
            allNenoCount: allNenoCount,
            allNenoPinTags: allNenoPinTags,
            allNenoPic: allNenopicBase64,
        }
    }
}

//导入的数据会同步到仓库, 内容与仓库一致的文件不会产生提交
export const imporFileTotIndexedDB = async (allData) => {
    const suffixes = {}
    for (const element of allData.allNeno || []) {
        await (await db).put('nenoitem', element);
        await markDirty("note", element._id)
        for (const image of element.images || []) {
            suffixes[image.key] = image.suffixName
        }
    }
    const importedPins = new Set()
    let importedIcons = {}
    for (const element of allData.allNenoPinTags || []) {
        (element.tags || []).forEach((tag) => importedPins.add(tag))
        importedIcons = {...importedIcons, ...normalizeIcons(element.icons)}
    }
    if (importedPins.size > 0 || Object.keys(importedIcons).length > 0) {
        //已有的图标优先, 备份里的只补充没有设置过的
        const settings = await getTagSettings()
        await setTagSettings({
            tags: new Set([...settings.tags, ...importedPins]),
            icons: {...importedIcons, ...settings.icons},
        })
        await markDirty("pinTags", "pinTags")
    }
    for (const element of allData.allNenoPic || []) {
        let file = await (await fetch(element.file)).blob()
        await putPic(element._id, file)
        if (suffixes[element._id]) {
            await markDirty("pic", element._id, {suffix: suffixes[element._id]})
        }
    }
    reload.set({tag: Date.now(), action: "neno"})
    reload.set({tag: Date.now(), action: "nenoCount"})
    return {body: {}}
}
export const getFileFromIndexedDB = async (key) => {
    let result = await (await db).get("nenoPic", key)
    return {key: getObjectURL(result.file)}
}
export const uploadPicIndexedDB = async (imageFile) => {
    const _id = getObjectId().toString();
    const suffixName = imageFile.name.substring(imageFile.name.lastIndexOf(".") + 1)
    await putPic(_id, imageFile)
    await markDirty("pic", _id, {suffix: suffixName})
    return {key: _id, suffixName: suffixName}
}

//分页读取笔记(按 _id 倒序, 即创建时间倒序)
//before: 上一页最后一条笔记的 _id, 从它之后继续读取; 用游标而不是偏移量,
//这样翻页期间新增/删除笔记也不会出现重复或遗漏
export const getAllNeno = async ({before = null, limit = 20} = {}) => {
    const range = before ? IDBKeyRange.upperBound(before, true) : null
    const nenos = []
    let cursor = await (await db).transaction("nenoitem").store.openCursor(range, "prev")
    //多读一条用来判断是否还有下一页
    while (cursor && nenos.length <= limit) {
        nenos.push(cursor.value)
        cursor = await cursor.continue()
    }
    const hasMore = nenos.length > limit
    const page = nenos.slice(0, limit)
    for (const neno of page) {
        await getParentDetail(neno)
    }
    return {body: page, hasMore}
}

async function getParentDetail(result) {
    //查找父item
    if (result.parentId) {
        const presult = await (await db).getFromIndex('nenoitem', "_id", result.parentId);
        result.parent = presult
    }
    let children = [];

    const cresult = await (await db).getAllFromIndex('nenoitem', "parentId", result._id);

    for (let index = 0; index < cresult.length; index++) {
        const element = cresult[index];


        const gcresult = await (await db).getAllFromIndex('nenoitem', "parentId", element._id);
        element.children = gcresult

        children = [...children, element]
    }
    result.children = children
}

//获取所有笔记(按创建时间倒序), 用于每日回顾和随机漫步
export const getAllNenoList = async () => {
    let nenos = await (await db).getAll("nenoitem")
    return nenos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

//补充笔记的父笔记(批注对象)和子笔记(批注), NenoItem 需要这些字段展示关联
export const withRelations = async (neno) => {
    const copy = {...neno}
    await getParentDetail(copy)
    return copy
}

export const addNeno = async (data) => {
    const isNew = data._id === ""
    if (!isNew) {
        const old = await (await db).getFromIndex('nenoitem', "_id", data._id);
        if (old) {
            data.created_at = old.created_at
        }
        data.update_at = dayjs().format()
        await (await db).put('nenoitem', data);

    } else {

        data._id = getObjectId().toString()
        data.created_at = dayjs().format()
        await (await db).put('nenoitem', data);
        reload.set({tag: Date.now(), action: "nenoCount"})
    }
    await markDirty("note", data._id)
    emitNoteChange(isNew ? "add" : "update", data)

    return {body: data}
}
export const detail = async (data) => {
    const result = await (await db).getFromIndex('nenoitem', "_id", data._id);
    await getParentDetail(result)

    return {body: result}
}
export const deleteOne = async (data) => {
    const result = await (await db).getFromIndex('nenoitem', "_id", data._id);
    for (const datum of result.images || []) {
        await deletePicLocal(datum.key)
        //删除笔记的同时删除笔记中携带的图片
        await markDirty("pic", datum.key, {suffix: datum.suffixName, deleted: true})
    }
    await (await db).delete('nenoitem', data._id);
    //记录删除前的创建时间, 推送时据此找到仓库中的文件
    await markDirty("note", data._id, {deleted: true, created_at: result.created_at})
    emitNoteChange("delete", result)

    reload.set({tag: Date.now(), action: "nenoCount"})

    return {body: {}, code: 200}
}

export const tags = async (data) => {
    let tags = new Set()

    let cursor = await (await db).transaction("nenoitem").store.openCursor();
    while (cursor) {
        let neno = cursor.value
        neno.tags.forEach(element => {
            tags.add(element)
        });
        cursor = await cursor.continue()
    }
    return {code: 200, message: "BIU", body: [...tags]}
}
export const pin = async (data) => {
    const pinTags = new Set(await getPinTags())
    if (pinTags.has(data.tag)) {
        pinTags.delete(data.tag)
    } else {
        pinTags.add(data.tag)
    }
    await setPinTags(pinTags)
    await markDirty("pinTags", "pinTags")
    broadcastDataChange()

    return {code: 200, message: "BIU", body: [...pinTags]}
}
export const pins = async (data) => {
    const repintags = (await getPinTags()).map((tag) => ({_id: getObjectId().toString(), tag}))
    return {code: 200, message: "BIU", body: repintags}
}
//取笔记的纯文本, 旧数据可能没有 pureContent
export const getPlainText = (neno) => {
    if (typeof neno.pureContent === "string" && neno.pureContent !== "") {
        return neno.pureContent
    }
    const div = document.createElement("div");
    div.innerHTML = neno.content || "";
    return div.textContent || "";
}

export const search = async (data) => {
    let nenos = [];
    //搜索内容时只匹配纯文本(不匹配 html 标签), 并忽略大小写
    const keyword = (data.content || "").trim().toLowerCase();
    let cursor = await (await db).transaction("nenoitem").store.openCursor(null, "prev");

    while ((cursor)) {
        let value = cursor.value;

        if (value.created_at.substring(0, 10) === data.created_at || value.tags.includes(data.tag) || (keyword !== "" && getPlainText(value).toLowerCase().indexOf(keyword) !== -1)) {
            nenos = [...nenos, value]
        }
        cursor = await cursor.continue();
    }
    return {body: nenos}
}

export const count = async (data) => {
    const countDate = await getCountDate()
    let count = await (await db).countFromIndex("nenoitem", "_id")
    return {body: {countDate: countDate, count: count}}
}
export const renameTag = async (data) => {
    const changed = []
    let cursor = await (await db).transaction("nenoitem", "readwrite").store.openCursor();
    while (cursor) {
        let neno = cursor.value
        for (let index = 0; index < neno.tags.length; index++) {
            const element = neno.tags[index];
            if (element === data.oldTag) {
                let element = neno;
                let rawContent = element.content
                let pIndex = 0;
                let pContent = ""
                for (let tindex = 0; tindex < element.tags.length; tindex++) {
                    let rawtag = element.tags[tindex];

                    if (rawtag === data.oldTag) {
                        let breakIndex = rawContent.indexOf(rawtag);

                        element.tags[tindex] = data.newTag
                        //截取前段的字符
                        pContent += rawContent.substring(0, breakIndex);
                        //加上替换的内容
                        pContent += data.newTag
                        pIndex += breakIndex + data.oldTag.length;
                        rawContent = rawContent.substring(breakIndex + data.oldTag.length);

                    } else {
                        let breakIndex = rawContent.indexOf(rawtag);
                        pContent += rawContent.substring(0, breakIndex + rawtag.length);

                        rawContent = rawContent.substring(breakIndex + rawtag.length);
                        pIndex += breakIndex + rawtag.length;

                    }
                }
                pContent += element.content.substring(pIndex);
                element.content = pContent
                if (typeof element.pureContent === "string") {
                    element.pureContent = element.pureContent.split(data.oldTag).join(data.newTag)
                }
                element.update_at = dayjs().format()
                //游标事务中不能等待其他事务, 改动的笔记在遍历结束后统一标记
                changed.push(neno._id)
                cursor.update(neno)

                break
            }
        }
        cursor = await cursor.continue()
    }
    for (const _id of changed) {
        await markDirty("note", _id)
        emitNoteChange("update", await getNote(_id))
    }
    //图标跟着标签走
    const settings = await getTagSettings()
    if (settings.icons[data.oldTag] && data.oldTag !== data.newTag) {
        const icons = {...settings.icons, [data.newTag]: settings.icons[data.oldTag]}
        delete icons[data.oldTag]
        await setTagSettings({...settings, icons})
        await markDirty("pinTags", "pinTags")
        broadcastDataChange()
    }
    reload.set({tag: Date.now(), action: "nenoCount"})
    return {code: 200, message: "BIU", body: {}}
}
