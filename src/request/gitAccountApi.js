//同步配置向导使用的接口: 校验 Token, 获取用户信息, 列出/创建仓库
//这些接口不依赖 githubStore, 以便在保存配置之前使用
import {request} from "../utils/githubtool/index";
import {Base64} from "js-base64";

export const GITHUB_URL = "https://api.github.com";
export const GITEE_URL = "https://gitee.com/api/v5";

export const PLATFORMS = {
    [GITHUB_URL]: {
        name: "GitHub",
        //经典 Token, 预先勾选权限: repo 读写仓库, workflow 用于同步到 notion 的 action
        tokenUrl: "https://github.com/settings/tokens/new?scopes=repo,workflow&description=NENO",
        fineGrainedTokenUrl: "https://github.com/settings/personal-access-tokens/new",
        repoUrl: (fullName) => `https://github.com/${fullName}`,
    },
    [GITEE_URL]: {
        name: "Gitee",
        tokenUrl: "https://gitee.com/profile/personal_access_tokens/new",
        repoUrl: (fullName) => `https://gitee.com/${fullName}`,
    },
};

export const DEFAULT_REPO_NAME = "neno-data";

function config(gitUrl, token) {
    return {
        baseUrl: gitUrl,
        headers: {
            authorization: `token ${token.trim()}`,
        },
    };
}

//把接口错误转换成用户能看懂的提示
export function describeError(error) {
    const status = error && error.status;
    if (status === 401) return "Token 无效或已过期, 请重新生成";
    if (status === 403) return "Token 权限不足, 请确认已勾选仓库读写权限";
    if (status === 404) return "找不到对应的资源, 请检查 Token 的仓库访问范围";
    if (status === 422) return "仓库名已存在或不合法, 请换一个名字";
    if (status === 500 || !status) return "网络连接失败, 请检查网络后重试";
    return (error && error.message) || "未知错误";
}

//校验 Token 并返回用户信息
export async function fetchAccount(gitUrl, token) {
    const re = await request("GET /user", config(gitUrl, token));
    const scopes = re.headers["x-oauth-scopes"];
    return {
        login: re.data.login,
        name: re.data.name || re.data.login,
        avatar: re.data.avatar_url,
        //经典 Token 会返回授权范围, 细粒度 Token 没有这个响应头
        scopes: typeof scopes === "string" ? scopes.split(",").map((s) => s.trim()).filter(Boolean) : null,
    };
}

function toRepo(gitUrl, raw) {
    const [owner, repo] = raw.full_name.split("/");
    return {
        owner,
        repo,
        fullName: raw.full_name,
        private: !!raw.private,
        updatedAt: raw.updated_at || raw.pushed_at || "",
        url: raw.html_url || PLATFORMS[gitUrl].repoUrl(raw.full_name),
    };
}

//列出 Token 可以写入的仓库, 按更新时间倒序
export async function listRepos(gitUrl, token) {
    const re = await request("GET /user/repos", Object.assign(config(gitUrl, token), {
        sort: "updated",
        per_page: 100,
    }));
    return re.data
        .filter((raw) => !raw.permissions || raw.permissions.push || raw.permissions.admin)
        .map((raw) => toRepo(gitUrl, raw));
}

//新建一个私有仓库, auto_init 保证仓库至少有一次提交, 同步逻辑依赖分支上的最新提交
export async function createRepo(gitUrl, token, name) {
    const re = await request("POST /user/repos", Object.assign(config(gitUrl, token), {
        name,
        private: true,
        auto_init: true,
        description: "NENO 笔记数据",
    }));
    return toRepo(gitUrl, re.data);
}

//其他设备/插件(utools, cli, 浏览器插件)使用的 neno token: 配置的 base64 编码, 保持原有格式
export function encodeNenoToken(store) {
    return Base64.encode(JSON.stringify({
        access_token: store.access_token,
        repoName: store.repoName,
        githubName: store.githubName,
        gitUrl: store.gitUrl,
    }));
}

export function decodeNenoToken(text) {
    let value = text.trim();
    //支持直接粘贴同步链接
    const index = value.indexOf("#neno-config=");
    if (index !== -1) {
        value = decodeURIComponent(value.substring(index + "#neno-config=".length));
    }
    const data = JSON.parse(Base64.decode(value));
    if (!data.access_token || !data.repoName || !data.githubName) {
        throw new Error("配置不完整");
    }
    return {
        access_token: data.access_token,
        repoName: data.repoName,
        githubName: data.githubName,
        gitUrl: data.gitUrl === GITEE_URL ? GITEE_URL : GITHUB_URL,
    };
}

//同步链接把配置放在 # 之后, 不会随请求发送到服务器
export function buildSyncLink(store) {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#neno-config=${encodeURIComponent(encodeNenoToken(store))}`;
}
