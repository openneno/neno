import {writable} from "svelte/store";

//Insert store variables here
export const tokoen = writable(" eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6Ijk0OTAwNTQ4NkBxcS5jb20iLCJleHAiOjE2MTMyMTU2MTMsImlhdCI6MTYxMzEyOTIxMywiaXNzIjoiYXdlTGlzdCJ9.g3JKHINnQvqsw9H1-phS_ma-08DGzLx5dQRv8McRnJU");
export const pagedd = writable("neno");//neno(NENO),dayily(每日回顾),luck(每日漫步),setting(设置)
export const settingStore = writable({
    platform: "七牛",
    imgDomain: "http://img.neno.topmini.top",
    domain: "https://api.neno.topmini.top",
    useMode: "github"
});
export const githubStore = writable({
    access_token: "",
    expires_in: 0,
    refresh_token: "",
    refresh_token_expires_in: 0,
    repoName: "",
    branch: "master",
    githubName: "",
    lastCommitSha: ""
});

export const countStore = writable({tagCount: 0, nenoCount: 0, dayCount: 0, dateCount: {}});
export const tagStore = writable({pinTags: [], allTags: []});
export const searchNenoByDate = writable({date: ""});
export const searchNenoByTag = writable({tag: ""});
export const reload = writable({tag: 0, action: ""});

export const commitToGithubTag = writable({timestmp: 0, data: {}});
export const taskCountTag = writable({all: 0, done: 0});




