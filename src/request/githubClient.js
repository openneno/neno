//基于 fetch 的 GitHub REST / GraphQL 客户端
//开发环境可以通过 localStorage 的 neno-dev-github-api 指向本地模拟的 GitHub(用于同步测试), 生产构建中不生效
const DEV_API = import.meta.env.DEV ? (() => {
    try {
        return window.localStorage.getItem("neno-dev-github-api");
    } catch (e) {
        return null;
    }
})() : null;
export const GITHUB_API = DEV_API || "https://api.github.com";

export class GithubError extends Error {
    constructor(message, status, extra = {}) {
        super(message);
        this.name = "GithubError";
        this.status = status;
        Object.assign(this, extra);
    }
}

function headers(token, hasBody) {
    const result = {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token.trim()}`,
    };
    if (hasBody) result["Content-Type"] = "application/json";
    return result;
}

async function readError(response) {
    let message = response.statusText;
    try {
        const body = await response.json();
        message = body.message || message;
    } catch (e) {
        //忽略无法解析的错误内容
    }
    return new GithubError(message, response.status);
}

//REST 请求, 返回 {data, headers, etag}; query 会拼接到地址上
//传入 etag 时发送条件请求: 内容没有变化时返回 {notModified: true}, GitHub 不计入请求配额
export async function rest(token, method, path, {body, query, etag} = {}) {
    let url = GITHUB_API + path;
    if (query) {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => value !== undefined && params.set(key, String(value)));
        url += `?${params}`;
    }
    let response;
    try {
        const requestHeaders = headers(token, body !== undefined);
        if (etag) requestHeaders["If-None-Match"] = etag;
        response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body === undefined ? undefined : JSON.stringify(body),
            //同步需要拿到最新的分支状态, 不使用浏览器缓存
            cache: "no-store",
        });
    } catch (error) {
        throw new GithubError(error.message || "网络连接失败", 0);
    }
    if (response.status === 304) return {notModified: true, data: null, headers: response.headers, etag};
    if (!response.ok) throw await readError(response);
    const data = response.status === 204 ? null : await response.json();
    return {data, headers: response.headers, etag: response.headers.get("etag")};
}

export async function graphql(token, query, variables) {
    let response;
    try {
        response = await fetch(`${GITHUB_API}/graphql`, {
            method: "POST",
            headers: headers(token, true),
            body: JSON.stringify({query, variables}),
        });
    } catch (error) {
        throw new GithubError(error.message || "网络连接失败", 0);
    }
    if (!response.ok) throw await readError(response);
    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
        const first = result.errors[0];
        throw new GithubError(first.message, 200, {type: first.type, errors: result.errors});
    }
    return result.data;
}
