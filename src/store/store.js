import { writable } from "svelte/store";

//Insert store variables here
export const tokoen = writable(" eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6Ijk0OTAwNTQ4NkBxcS5jb20iLCJleHAiOjE2MTMyMTU2MTMsImlhdCI6MTYxMzEyOTIxMywiaXNzIjoiYXdlTGlzdCJ9.g3JKHINnQvqsw9H1-phS_ma-08DGzLx5dQRv8McRnJU");
export const pagedd = writable("neno");//neno(NENO),dayily(每日回顾),luck(每日漫步),setting(设置)
export const settingStrore = writable({ platform: "七牛", imgDomain: "http://img.neno.bijiduo.com", });
export const countStrore = writable({ tagCount: 0, nenoCount: 0, dayCount: 0, dateCount: {} });
export const tagStrore = writable({ pinTags: [], allTags: [] });
export const searchNenoByDate = writable({ date: "" });
export const searchNenoByTag = writable({ tag: "" });



