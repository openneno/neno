//笔记仓库的文件结构, 与旧版本及 utools/cli/notion action 等扩展工具保持一致:
//  YYYY-MM-DD/<笔记 _id>.json   一条笔记
//  picData/<图片 _id>.<后缀>     一张图片
//  pinTags/pinTags.json          置顶标签
//  countDate/countDate.json      旧版本的每日计数, 现在由本地根据笔记计算, 不再读写

const NOTE_PATH = /^(\d{4}-\d{2}-\d{2})\/([0-9a-zA-Z]+)\.json$/;
const PIC_PATH = /^picData\/([^/.]+)\.([0-9a-zA-Z]+)$/;
export const PIN_TAGS_PATH = "pinTags/pinTags.json";

export function classifyPath(path) {
    let match = path.match(NOTE_PATH);
    if (match) return {kind: "note", id: match[2]};
    match = path.match(PIC_PATH);
    if (match) return {kind: "pic", id: match[1], suffix: match[2]};
    if (path === PIN_TAGS_PATH) return {kind: "pinTags", id: "pinTags"};
    return null;
}

export function notePath(note) {
    return `${note.created_at.substring(0, 10)}/${note._id}.json`;
}

export function picPath(id, suffix) {
    return `picData/${id}.${suffix}`;
}

//写入仓库的笔记内容, 去掉只在界面上使用的关联字段
export function serializeNote(note) {
    // eslint-disable-next-line no-unused-vars
    const {parent, children, ...data} = note;
    return JSON.stringify(data, null, "\t");
}

//标签设置: tags 置顶标签; icons 标签图标 {"#读书": "📚"}, 是后来新增的可选字段
//没有图标时不写 icons, 文件内容与旧版本完全一致; 旧版本和扩展工具只读取 tags, 不受影响
export function serializePinTags({tags = [], icons = {}} = {}) {
    const data = {_id: "pinTags", created_at: "pinTags", tags: [...tags]};
    if (Object.keys(icons).length > 0) data.icons = icons;
    return JSON.stringify(data, null, "\t");
}

export function parsePinTags(text) {
    const data = JSON.parse(text);
    return {tags: Array.isArray(data.tags) ? data.tags : [], icons: normalizeIcons(data.icons)};
}

//只保留 "标签 -> 非空字符串" 的条目, 忽略格式不对的数据
export function normalizeIcons(icons) {
    const result = {};
    if (icons && typeof icons === "object") {
        for (const [tag, icon] of Object.entries(icons)) {
            if (typeof icon === "string" && icon.trim() !== "") result[tag] = icon.trim();
        }
    }
    return result;
}

//笔记的修改时间, 用于两端都修改时决定保留哪一份
export function noteTime(note) {
    const time = Date.parse((note && (note.update_at || note.created_at)) || "");
    return Number.isNaN(time) ? 0 : time;
}

export function noteSummary(note) {
    const text = (note.pureContent || "").replace(/\s+/g, " ").trim();
    return text.length > 60 ? `${text.substring(0, 60)}...` : text;
}
