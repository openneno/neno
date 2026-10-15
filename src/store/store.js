import { writable } from "svelte/store";

export const currentPage = writable("neno");//neno(NENO),dayily(每日回顾),luck(每日漫步),setting(设置)
export const settingStore = writable({
    isDark: false,
    themeMode: "light",//light(浅色),dark(深色),system(跟随系统)
    themeColor: "green",//主题色,见 lib/theme.js
});
export const githubStore = writable({
    access_token: "",//github token Or gitea token
    repoName: "",//仓库名称
    branch: "master",
    githubName: "",//github用户名
    lastCommitSha: "",//最后一次提交的sha
    isCustomGitea: false,//是否自定义Gitea
    gitUrl: "https://api.github.com",//Git地址

});
//notion相关的配置
//internalIntegrationToken apikey
//databaseId 授权的数据库id
export const notionStore = writable({
    isSyncToNotion: false,
    internalIntegrationToken: "",
    databaseId: "",

});
export const countStore = writable({ tagCount: 0, nenoCount: 0, dayCount: 0, dateCount: {} });
export const tagStore = writable({ pinTags: [], allTags: [] });
export const searchNenoByDate = writable({ date: "" });
export const searchNenoByTag = writable({ tag: "" });
export const reload = writable({ tag: 0, action: "" });

export const commitToGithubTag = writable({ timestmp: 0, data: {} });
export const taskCountTag = writable({ all: 0, done: 0 });
//同步状态(不持久化): authError 表示 Token 已失效, 同步暂停直到重新配置
export const syncStatus = writable({ authError: false });
