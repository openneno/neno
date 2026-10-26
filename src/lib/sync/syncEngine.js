//GitHub 同步引擎
//
//一次同步的流程:
//  1. 读取默认分支的最新提交(空闲时只有这一个请求)
//  2. 远端有变化时, 一次请求取得完整的文件树, 与上次同步时记录的文件 sha(baseShas)对比,
//     只下载变化的文件, 并按笔记合并: 两端都修改时保留修改时间较新的一份
//  3. 把待推送的本地改动(dirty)合并成一次提交, 通过 GraphQL createCommitOnBranch 推送,
//     expectedHeadOid 保证远端在此期间被其他设备修改时提交失败, 重新拉取合并后再推送
import {get} from "svelte/store";
import {githubStore, reload, syncStatus, taskCountTag} from "../../store/store.js";
import {graphql, rest} from "../../request/githubClient.js";
import {
    clearDirty,
    deleteNoteLocal,
    deletePicLocal,
    getAllNotes,
    getDirtyList,
    getNote,
    getPic,
    getSyncState,
    getTagSettings,
    markDirty,
    putNote,
    putPic,
    saveSyncState,
    setTagSettings,
    takeLegacyTasks,
} from "../../request/fetchApi.js";
import {
    base64ToBytes,
    blobToBytes,
    bytesToBase64,
    bytesToText,
    gitBlobSha,
    imageType,
    textToBytes,
} from "./gitBlob.js";
import {
    PIN_TAGS_PATH,
    classifyPath,
    notePath,
    noteSummary,
    noteTime,
    parsePinTags,
    picPath,
    serializeNote,
    serializePinTags,
} from "./repoLayout.js";
import {onLocalChange} from "./signal.js";
import {emitNoteChange} from "../noteEvents.js";

//单次提交的大小限制, 超过时拆成多次提交
const MAX_COMMIT_BYTES = 8 * 1024 * 1024;
const MAX_COMMIT_FILES = 200;
//并行下载的文件数
const FETCH_CONCURRENCY = 6;
//两端同时提交导致冲突时的重试次数
const MAX_ATTEMPTS = 3;
//一次拉取中逐条更新列表的最大数量
const MAX_INCREMENTAL_CHANGES = 50;

//本地修改后多久推送(连续修改会合并成一次提交)
const PUSH_DELAY = 1000;
//前台且最近有操作时检查远端的间隔
const ACTIVE_POLL_INTERVAL = 3000;
//前台但长时间没有操作时的间隔
const IDLE_POLL_INTERVAL = 30 * 1000;
//多久没有操作算作空闲
const IDLE_AFTER = 2 * 60 * 1000;

class ConflictError extends Error {
}

function config() {
    return get(githubStore);
}

export function isSyncConfigured() {
    const value = config();
    return !!(value.access_token && value.githubName && value.repoName);
}

const repoKey = () => `${config().githubName}/${config().repoName}`;

function api(method, suffix, options) {
    const value = config();
    const path = `/repos/${encodeURIComponent(value.githubName)}/${encodeURIComponent(value.repoName)}${suffix}`;
    return rest(value.access_token, method, path, options);
}

async function loadState() {
    const saved = await getSyncState();
    if (saved && saved.repo === repoKey()) return saved;
    //切换了仓库, 重新开始
    return {repo: repoKey(), branch: null, headOid: null, baseShas: {}, initialized: false};
}

// ---------- 远端读取 ----------

//上一次读取分支得到的 ETag, 分支没有变化时 GitHub 返回 304, 不计入请求配额
let refCache = {key: "", etag: null, sha: null};

async function resolveHead(state, retried = false) {
    if (!state.branch) {
        state.branch = (await api("GET", "")).data.default_branch;
    }
    const key = `${repoKey()}#${state.branch}`;
    try {
        const ref = await api("GET", `/git/ref/heads/${encodeURIComponent(state.branch)}`, {
            etag: refCache.key === key ? refCache.etag : undefined,
        });
        if (ref.notModified) return refCache.sha;
        refCache = {key, etag: ref.etag, sha: ref.data.object.sha};
        return refCache.sha;
    } catch (error) {
        if (retried) throw error;
        if (error.status === 409) {
            //空仓库没有分支, 先创建一个提交
            await api("PUT", "/contents/README.md", {
                body: {
                    message: "init neno",
                    content: bytesToBase64(textToBytes("# NENO\n\nNENO 笔记数据仓库\n")),
                },
            });
            state.branch = null;
            return resolveHead(state, true);
        }
        if (error.status === 404) {
            //默认分支可能被改名
            state.branch = null;
            return resolveHead(state, true);
        }
        throw error;
    }
}

function blobsOf(entries, prefix = "") {
    const map = {};
    for (const entry of entries) {
        if (entry.type === "blob") map[prefix + entry.path] = entry.sha;
    }
    return map;
}

async function walkTree(sha, prefix) {
    const re = await api("GET", `/git/trees/${sha}`);
    const map = blobsOf(re.data.tree, prefix);
    for (const entry of re.data.tree) {
        if (entry.type === "tree") Object.assign(map, await walkTree(entry.sha, `${prefix}${entry.path}/`));
    }
    return map;
}

//路径 -> blob sha
async function fetchTree(commitSha) {
    const re = await api("GET", `/git/trees/${commitSha}`, {query: {recursive: 1}});
    //文件非常多时 recursive 结果会被截断, 改为逐个目录读取
    if (re.data.truncated) return walkTree(commitSha, "");
    return blobsOf(re.data.tree);
}

async function fetchBlob(sha) {
    const re = await api("GET", `/git/blobs/${sha}`);
    return base64ToBytes(re.data.content);
}

async function mapLimit(items, limit, fn) {
    let index = 0;
    const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
        while (index < items.length) {
            const item = items[index++];
            await fn(item);
        }
    });
    await Promise.all(workers);
}

function startProgress(total) {
    taskCountTag.set({all: total, done: 0});
    return {
        tick: () => taskCountTag.update((value) => ({all: value.all, done: value.done + 1})),
        end: () => taskCountTag.set({all: 0, done: 0}),
    };
}

// ---------- 拉取与合并 ----------

//返回 {changed: 本地数据是否变化, noteChanges: 每条笔记的变化}
async function pull(state, head, dirtyMap, legacy) {
    const remote = await fetchTree(head);
    const base = state.baseShas;
    let localChanged = false;
    const noteChanges = [];

    const dropDirty = async (dirty) => {
        await clearDirty(dirty);
        dirtyMap.delete(dirty.key);
    };

    const jobs = Object.keys(remote)
        .filter((path) => remote[path] !== base[path])
        .map((path) => ({path, info: classifyPath(path)}))
        .filter((job) => job.info !== null);

    const progress = startProgress(jobs.length);
    try {
        await mapLimit(jobs, FETCH_CONCURRENCY, async ({path, info}) => {
            const sha = remote[path];
            const dirty = dirtyMap.get(`${info.kind}:${info.id}`);

            if (info.kind === "note") {
                const local = await getNote(info.id);
                //没有同步记录时(首次同步/升级)先比较内容, 一致就不用下载
                if (local && !dirty && base[path] === undefined
                    && await gitBlobSha(textToBytes(serializeNote(local))) === sha) {
                    return;
                }
                const remoteNote = JSON.parse(bytesToText(await fetchBlob(sha)));
                if (dirty && dirty.deleted) {
                    //本地删除后远端又修改了, 以较新的操作为准
                    if (noteTime(remoteNote) > dirty.at) {
                        await putNote(remoteNote);
                        await dropDirty(dirty);
                        localChanged = true;
                        noteChanges.push({type: "add", note: remoteNote});
                    }
                    return;
                }
                if (dirty && local && noteTime(local) >= noteTime(remoteNote)) {
                    //本地的修改更新, 保留本地, 稍后推送
                    return;
                }
                await putNote(remoteNote);
                if (dirty) await dropDirty(dirty);
                localChanged = true;
                noteChanges.push({type: local ? "update" : "add", note: remoteNote});
            } else if (info.kind === "pic") {
                //本地新增或删除了这张图片, 以本地为准
                if (dirty) return;
                const local = await getPic(info.id);
                if (local && await gitBlobSha(await blobToBytes(local.file)) === sha) return;
                const bytes = await fetchBlob(sha);
                await putPic(info.id, new Blob([bytes], {type: imageType(info.suffix)}));
                localChanged = true;
            } else if (info.kind === "pinTags") {
                if (!dirty && base[path] === undefined
                    && await gitBlobSha(textToBytes(serializePinTags(await getTagSettings()))) === sha) {
                    return;
                }
                const remoteSettings = parsePinTags(bytesToText(await fetchBlob(sha)));
                if (dirty) {
                    //两端都修改了标签设置时: 置顶标签取并集, 同一个标签的图标以本地为准
                    const local = await getTagSettings();
                    await setTagSettings({
                        tags: new Set([...local.tags, ...remoteSettings.tags]),
                        icons: {...remoteSettings.icons, ...local.icons},
                    });
                } else {
                    await setTagSettings(remoteSettings);
                }
                localChanged = true;
            }
        });
    } finally {
        progress.end();
    }

    //远端删除的文件
    for (const path of Object.keys(base)) {
        if (path in remote) continue;
        const info = classifyPath(path);
        if (!info || info.kind === "pinTags") continue;
        const dirty = dirtyMap.get(`${info.kind}:${info.id}`);
        //本地有新的修改时保留, 稍后重新推送
        if (dirty && !dirty.deleted) continue;
        if (dirty) await dropDirty(dirty);
        if (info.kind === "note") {
            const old = await getNote(info.id);
            await deleteNoteLocal(info.id);
            if (old) noteChanges.push({type: "delete", note: old});
        } else {
            await deletePicLocal(info.id);
        }
        localChanged = true;
    }

    //第一次与这个仓库同步: 把只存在于本地的笔记也上传, 避免数据只留在这台设备上
    //从旧版本升级的用户不做这一步, 因为本地多出来的笔记可能是在其他设备上删除的
    if (!state.initialized && !legacy) {
        for (const note of await getAllNotes()) {
            if (!(notePath(note) in remote) && !dirtyMap.has(`note:${note._id}`)) {
                await markDirty("note", note._id);
            }
            for (const image of note.images || []) {
                if (!(picPath(image.key, image.suffixName) in remote) && !dirtyMap.has(`pic:${image.key}`)
                    && await getPic(image.key)) {
                    await markDirty("pic", image.key, {suffix: image.suffixName});
                }
            }
        }
        const settings = await getTagSettings();
        if (!(PIN_TAGS_PATH in remote) && (settings.tags.length > 0 || Object.keys(settings.icons).length > 0)) {
            await markDirty("pinTags", "pinTags");
        }
    }

    state.baseShas = remote;
    state.headOid = head;
    state.initialized = true;
    return {changed: localChanged, noteChanges};
}

// ---------- 推送 ----------

const COMMIT_MUTATION = `mutation($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) { commit { oid } }
}`;

async function createCommit(branch, expectedHeadOid, headline, additions, deletions) {
    try {
        const data = await graphql(config().access_token, COMMIT_MUTATION, {
            input: {
                branch: {repositoryNameWithOwner: repoKey(), branchName: branch},
                message: {headline},
                expectedHeadOid,
                fileChanges: {additions, deletions},
            },
        });
        return data.createCommitOnBranch.commit.oid;
    } catch (error) {
        //判断是否是远端已经有了新的提交
        if (error.status === 200) {
            const current = (await api("GET", `/git/ref/heads/${encodeURIComponent(branch)}`)).data.object.sha;
            if (current !== expectedHeadOid) throw new ConflictError(error.message);
        }
        throw error;
    }
}

//保持旧版本的提交信息格式, notion 同步的 action 依赖 "[ADD]" 判断是否有新笔记
function commitMessage(changes) {
    const notes = changes.filter((change) => change.entry.kind === "note");
    const added = notes.filter((change) => !change.deletion && change.isNew);
    const modified = notes.filter((change) => !change.deletion && !change.isNew);
    const deleted = notes.filter((change) => change.deletion);
    if (notes.length === 1) {
        if (added.length === 1) return `[ADD] ${noteSummary(added[0].note)}`;
        if (modified.length === 1) return `[MODIFY] ${noteSummary(modified[0].note)}`;
        return "[DELETE] 删除 1 条笔记";
    }
    if (notes.length === 0) {
        return changes.some((change) => change.entry.kind === "pinTags") ? "update pinTags" : "update pictures";
    }
    const parts = [];
    if (added.length) parts.push(`新增 ${added.length} 条`);
    if (modified.length) parts.push(`修改 ${modified.length} 条`);
    if (deleted.length) parts.push(`删除 ${deleted.length} 条`);
    const tag = added.length ? "[ADD]" : modified.length ? "[MODIFY]" : "[DELETE]";
    return `${tag} ${parts.join(", ")}笔记`;
}

//把 dirty 记录转换成文件改动, 内容与远端一致的直接清除
async function collectChanges(state) {
    const changes = [];
    const base = state.baseShas;
    for (const entry of await getDirtyList()) {
        let change = null;
        if (entry.kind === "note") {
            if (entry.deleted) {
                const path = entry.created_at ? `${entry.created_at.substring(0, 10)}/${entry.id}.json` : null;
                if (path && base[path]) change = {entry, path, deletion: true};
            } else {
                const note = await getNote(entry.id);
                if (note) {
                    const path = notePath(note);
                    const bytes = textToBytes(serializeNote(note));
                    const sha = await gitBlobSha(bytes);
                    if (base[path] !== sha) change = {entry, path, bytes, sha, note, isNew: !base[path]};
                }
            }
        } else if (entry.kind === "pic") {
            const path = picPath(entry.id, entry.suffix);
            if (entry.deleted) {
                if (base[path]) change = {entry, path, deletion: true};
            } else {
                const pic = await getPic(entry.id);
                if (pic) {
                    const bytes = await blobToBytes(pic.file);
                    const sha = await gitBlobSha(bytes);
                    if (base[path] !== sha) change = {entry, path, bytes, sha};
                }
            }
        } else if (entry.kind === "pinTags") {
            const bytes = textToBytes(serializePinTags(await getTagSettings()));
            const sha = await gitBlobSha(bytes);
            if (base[PIN_TAGS_PATH] !== sha) change = {entry, path: PIN_TAGS_PATH, bytes, sha};
        }
        if (change) changes.push(change);
        else await clearDirty(entry);
    }
    return changes;
}

function chunkChanges(changes) {
    const chunks = [];
    let current = [];
    let size = 0;
    for (const change of changes) {
        const changeSize = change.bytes ? change.bytes.byteLength * 4 / 3 : 0;
        if (current.length > 0 && (current.length >= MAX_COMMIT_FILES || size + changeSize > MAX_COMMIT_BYTES)) {
            chunks.push(current);
            current = [];
            size = 0;
        }
        current.push(change);
        size += changeSize;
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
}

async function push(state, head) {
    const changes = await collectChanges(state);
    if (changes.length === 0) return head;
    const progress = startProgress(changes.length);
    try {
        for (const chunk of chunkChanges(changes)) {
            const additions = chunk.filter((change) => !change.deletion)
                .map((change) => ({path: change.path, contents: bytesToBase64(change.bytes)}));
            const deletions = chunk.filter((change) => change.deletion).map((change) => ({path: change.path}));
            head = await createCommit(state.branch, head, commitMessage(chunk), additions, deletions);
            for (const change of chunk) {
                if (change.deletion) delete state.baseShas[change.path];
                else state.baseShas[change.path] = change.sha;
                await clearDirty(change.entry);
                progress.tick();
            }
            state.headOid = head;
            await saveSyncState(state);
        }
    } finally {
        progress.end();
    }
    return head;
}

// ---------- 升级 ----------

//把旧版本任务队列中尚未推送的改动转换为 dirty 记录
async function migrateLegacyTasks() {
    for (const task of await takeLegacyTasks()) {
        const data = task.data || {};
        if (task.action === "push") {
            await markDirty("note", data._id);
        } else if (task.action === "delete") {
            await markDirty("note", data._id, {deleted: true, created_at: data.created_at});
            for (const image of data.images || []) {
                await markDirty("pic", image.key, {suffix: image.suffixName, deleted: true});
            }
        } else if (task.action === "uploadPic") {
            await markDirty("pic", data._id, {suffix: data.suffixName});
        } else if (task.action === "pinTags") {
            await markDirty("pinTags", "pinTags");
        }
        //countDate 已改为本地计算
    }
}

// ---------- 同步流程 ----------

async function syncOnce() {
    await migrateLegacyTasks();
    const state = await loadState();
    //从旧版本升级: 旧版本记录过同步的提交, 但还没有新引擎的同步记录
    const legacy = !state.initialized && !!config().lastCommitSha;
    let head = await resolveHead(state);
    const dirtyList = await getDirtyList();

    if (head !== state.headOid || !state.initialized) {
        const {changed, noteChanges} = await pull(state, head, new Map(dirtyList.map((entry) => [entry.key, entry])), legacy);
        await saveSyncState(state);
        if (changed) {
            //少量变化逐条更新列表; 首次同步等大量变化时整体刷新
            if (noteChanges.length <= MAX_INCREMENTAL_CHANGES) {
                noteChanges.forEach((change) => emitNoteChange(change.type, change.note));
            } else {
                reload.set({tag: Date.now(), action: "neno"});
            }
            reload.set({tag: Date.now(), action: "nenoCount"});
        }
    } else if (dirtyList.length === 0) {
        return;
    }

    head = await push(state, head);
    state.headOid = head;
    await saveSyncState(state);
    if (config().lastCommitSha !== head) {
        githubStore.update((value) => ({...value, lastCommitSha: head}));
    }
}

async function syncWithRetry() {
    for (let attempt = 1; ; attempt++) {
        try {
            await syncOnce();
            return;
        } catch (error) {
            if (!(error instanceof ConflictError) || attempt >= MAX_ATTEMPTS) throw error;
        }
    }
}

//同一时间只允许一个标签页同步
async function withLock(fn) {
    if (navigator.locks) return navigator.locks.request("neno-sync", fn);
    return fn();
}

let running = false;
let rerun = false;

export async function syncNow() {
    if (!isSyncConfigured() || get(syncStatus).authError) return;
    if (running) {
        rerun = true;
        return;
    }
    running = true;
    syncStatus.update((value) => ({...value, syncing: true}));
    let errorMessage = "";
    try {
        await withLock(async () => {
            do {
                rerun = false;
                await syncWithRetry();
            } while (rerun);
        });
    } catch (error) {
        console.log("同步失败", error);
        if (error.status === 401) {
            syncStatus.update((value) => ({...value, authError: true}));
        }
        errorMessage = error.message || "同步失败";
    } finally {
        running = false;
        syncStatus.update((value) => ({
            ...value,
            syncing: false,
            error: errorMessage,
            lastSyncAt: errorMessage ? value.lastSyncAt : Date.now(),
        }));
    }
}

let pushTimer = null;

//本地修改后稍等片刻再推送, 把连续的修改合并成一次提交
export function scheduleSync(delay = PUSH_DELAY) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(syncNow, delay);
}

//远端检查: 页面在前台时轮询, 最近有操作时 3 秒一次, 空闲时 30 秒一次, 后台时暂停
let pollTimer = null;
let lastActivity = Date.now();

const isVisible = () => document.visibilityState === "visible";
const isIdle = () => Date.now() - lastActivity > IDLE_AFTER;

function schedulePoll(delay) {
    clearTimeout(pollTimer);
    if (!isVisible()) return;
    pollTimer = setTimeout(async () => {
        await syncNow();
        schedulePoll();
    }, delay ?? (isIdle() ? IDLE_POLL_INTERVAL : ACTIVE_POLL_INTERVAL));
}

function markActivity() {
    const wasIdle = isIdle();
    lastActivity = Date.now();
    //从空闲中回来时尽快检查一次, 不用等 30 秒
    if (wasIdle) schedulePoll(300);
}

let started = false;

export function startSyncEngine() {
    if (started) return;
    started = true;
    onLocalChange(() => {
        markActivity();
        scheduleSync();
    });
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
        window.addEventListener(type, markActivity, {passive: true, capture: true});
    }
    document.addEventListener("visibilitychange", () => {
        if (isVisible()) {
            markActivity();
            schedulePoll(300);
        } else {
            //切到后台: 立即推送本地改动, 停止轮询
            clearTimeout(pollTimer);
            syncNow();
        }
    });
    window.addEventListener("focus", () => schedulePoll(300));
    window.addEventListener("online", () => schedulePoll(300));
    syncNow().then(() => schedulePoll());
}

//直接提交若干文本文件(用于写入 notion 同步的 workflow)
export async function commitTextFiles(files, headline) {
    return withLock(async () => {
        const state = await loadState();
        const head = await resolveHead(state);
        return createCommit(state.branch, head, headline,
            files.map((file) => ({path: file.path, contents: bytesToBase64(textToBytes(file.text))})), []);
    });
}
