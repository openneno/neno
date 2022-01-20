import { writable } from "svelte/store";

export const paged = writable("neno");//neno(NENO),dayily(每日回顾),luck(每日漫步),setting(设置)
export const settingStore = writable({
    isDark: false
});
export const githubStore = writable({
    access_token: "",
    repoName: "",
    branch: "master",
    githubName: "",
    lastCommitSha: ""
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





