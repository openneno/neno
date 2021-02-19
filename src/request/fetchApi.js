import { tokoen } from "../store/store.js";
let tokenen = ""
tokoen.subscribe(value => {
    tokenen = value;
});
const baseurl = "http://127.0.0.1:3000"
// const baseurl = "https://b9c21f2efdc44e2792d2ac7cbb8feff4.apig.cn-north-4.huaweicloudapis.com"
// const baseurl = "https://fmolo.bijiduo.com"
function genergeParams(data) {
    return {
        body: JSON.stringify(data),
        method: "post",
        headers: {
            'content-type': 'application/json'
        },
        mode: "cors",
    }

}
export const getAllFmolo = (data) => {
    return fetch(`${baseurl}/find`, genergeParams(data))
}
export const addFmolo = (data) => {
    return fetch(`${baseurl}/addNeno`, genergeParams(data))
}
export const detail = (data) => {
    return fetch(`${baseurl}/detail`, genergeParams(data))
}
export const deleteOne = (data) => {
    return fetch(`${baseurl}/delete`, genergeParams(data))
}
export const tags = (data) => {
    return fetch(`${baseurl}/tags`, genergeParams(data))
}
export const pin = (data) => {
    return fetch(`${baseurl}/pin`, genergeParams(data))
}
export const pins = (data) => {
    return fetch(`${baseurl}/pins`, genergeParams(data))
}
export const search = (data) => {
    return fetch(`${baseurl}/search`, genergeParams(data))
}
export const qiniuToken = (data) => {
    return fetch(`${baseurl}/qiniu`, genergeParams(data))
}
export const setting = (data) => {
    return fetch(`${baseurl}/setting`, genergeParams(data))
}



