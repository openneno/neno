import { tokoen } from "../store/store.js";
let tokenen = ""
tokoen.subscribe(value => {
    tokenen = value;
});
// const baseurl = "http://127.0.0.1:9090"
const baseurl = "https://b9c21f2efdc44e2792d2ac7cbb8feff4.apig.cn-north-4.huaweicloudapis.com"
export const getAllFmolo = (data) => {
    // console.log(tokoen);

    return fetch(`${baseurl}/find`, {
        body: JSON.stringify(data),
        method: "post",
        mode: "cors",
    })

}
export const addFmolo = (data) => {

    return fetch(`${baseurl}/addNeno`, {
        body: JSON.stringify(data),
        method: "post",
        mode: "cors",
    })
}
export const detail = (data) => {

    return fetch(`${baseurl}/detail`, {
        body: JSON.stringify(data),
        method: "post",
        mode: "cors",
    })
}
export const deleteOne = (data) => {

    return fetch(`${baseurl}/delete`, {
        body: JSON.stringify(data),
        method: "post",
        mode: "cors",
    })
}