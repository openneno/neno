import { tokoen } from "../store/store.js";
let tokenen = ""
tokoen.subscribe(value => {
    tokenen = value;
});
const baseurl = "http://127.0.0.1:9090"
export const getAllFmolo = (data) => {
    console.log(tokoen);
    console.log(tokenen);

    return fetch(`${baseurl}/v/list/all`, {
        body: JSON.stringify(data),
        method: "post",
        headers: {
            Token: tokenen
        },
        mode: "cors",
    })

}