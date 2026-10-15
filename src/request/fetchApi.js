import {reload} from "../store/store.js";
import {getObjectId} from "../utils/objetid.js";
import {getObjectURL} from "../utils/process.js";
import {openDB} from 'idb';
import dayjs from "dayjs";



const db = openDB("neno", 4, {
    upgrade(db, oldVersion, newVersion, transaction) {
        console.log('数据库新建成功');

        let objectStore;
        if (!db.objectStoreNames.contains('nenoitem')) {
            objectStore = db.createObjectStore('nenoitem', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: true});// 创建索引
            objectStore.createIndex('parentId', 'parentId', {unique: false});// 创建索引

            objectStore = db.createObjectStore('nenoPic', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: true});

            objectStore = db.createObjectStore('nenoCount', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: false});

            objectStore = db.createObjectStore('task', {keyPath: '_id'});
            objectStore.createIndex('_id', '_id', {unique: true});

            objectStore = db.createObjectStore('nenoPinTags', {keyPath: '_id'});
        }
    },
})


const readUploadedFileAsText = (inputFile) => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
        temporaryFileReader.onerror = () => {
            temporaryFileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        temporaryFileReader.onload = (e) => {
            resolve(e.target.result);
        };
        temporaryFileReader.readAsDataURL(inputFile);
    });
};
export const exportIndexedDBToFile = async () => {
    let allNeno = await (await db).getAll("nenoitem")
    let allNenoCount = await (await db).getAll("nenoCount")
    let allNenoPinTags = await (await db).getAll("nenoPinTags")
    let allNenoPic = await (await db).getAll("nenoPic")
    let allNenopicBase64 = []
    for (const element of allNenoPic) {
        const blob = element.file;
        let picbase64 = await readUploadedFileAsText(blob)
        allNenopicBase64 = [...allNenopicBase64, {_id: element._id, file: picbase64}]
    }

    return new Promise((resolve, rej) => {
        return resolve({
            body: {
                allNeno: allNeno,
                allNenoCount: allNenoCount,
                allNenoPinTags: allNenoPinTags,
                allNenoPic: allNenopicBase64,

            }
        })

    })

}
export const imporFileTotIndexedDB = async (allData) => {
    let allNeno = await (await db).getAll("nenoitem")

    let allNenoCount = await (await db).getAll("nenoCount")
    let allNenoPinTags = await (await db).getAll("nenoPinTags")
    allData.allNeno.forEach(async (element) => {
        let re = await (await db).put('nenoitem', element);
        console.log("  allData.allNeno", re, element);
    });
    allData.allNenoCount.forEach(async (element) => {
        let re = await (await db).put('nenoCount', element);
        console.log("  allData.allNenoCount", re, element);

    });
    allData.allNenoPinTags.forEach(async (element) => {
        let re = await (await db).put('nenoPinTags', element);
        console.log("  allData.allNenoPinTags", re, element);

    });


    allData.allNenoPic.forEach(async (element) => {
        let file = await (await fetch(element.file)).blob()
        element.file = file
        let re = await (await db).put('nenoPic', element);
        console.log("  allData.allNenoPic", re, element);

    });
    return new Promise((resolve, rej) => {
        return resolve({
            body: {
                allNeno: allNeno, allNenoCount: allNenoCount, allNenoPinTags: allNenoPinTags,
            }
        })

    })

}
export const getFileFromIndexedDB = async (key) => {
    let result = await (await db).get("nenoPic", key)
    return new Promise((resolve, rej) => {
        const url = getObjectURL(result.file);
        return resolve({key: url})

    })
}
export const uploadPicIndexedDB = async (imageFile) => {
    const _id = getObjectId().toString();
    const picData = {_id: _id, file: imageFile, created_at: "picData"};
    await (await db).put("nenoPic", picData)
    picData.base64File = await readUploadedFileAsText(imageFile)
    picData.suffixName = imageFile.name.substring(imageFile.name.lastIndexOf(".") + 1)
    await pushTaskToIndexedDB({timestmp: Date.now(), data: picData, action: "uploadPic"})

    return new Promise((resolve, rej) => {
        return resolve({key: _id, suffixName: picData.suffixName})
    })
}

export const insertToIndexedDB = async (data) => {

    await (await db).put('nenoitem', data);

    return new Promise((resolve, rej) => {
        return resolve("ok")

    })

}
export const insertCountDateToIndexedDB = async (data) => {

    await (await db).put('nenoCount', data);
    return new Promise((resolve, rej) => {
        return resolve("ok")

    })

}
export const insertPinTagsToIndexedDB = async (data) => {

    await (await db).put('nenoPinTags', data);
    return new Promise((resolve, rej) => {
        return resolve("ok")

    })

}
export const insertPicToIndexedDB = async (imageBase64Data) => {
    const picData = {
        _id: imageBase64Data._id, file: await fetch(imageBase64Data.base64).then(r => r.blob()), created_at: "picData"
    };
    await (await db).put("nenoPic", picData)
    return new Promise((resolve, rej) => {
        return resolve({key: imageBase64Data._id})
    })
}
export const deletePicFromIndexedDB = async (data) => {
    await (await db).delete('nenoPic', data.key);
    return new Promise(async (resolve, rej) => {
        return resolve({body: {}, code: 200})
    })
}
export const deleteOneFromIndexedDB = async (data) => {
    await (await db).delete('nenoitem', data._id);
    return new Promise(async (resolve, rej) => {
        return resolve({body: {}, code: 200})
    })
}
export const pushTaskToIndexedDB = async (data) => {
    const taskData = await (await db).put('task', {_id: getObjectId().toString(), data: data});

    return new Promise(async (resolve, rej) => {
        return resolve({body: taskData, code: 200})
    })
}
export const popTaskToIndexedDB = async (data) => {
    let taskData = []
    let cursor = await (await db).transaction("task").store.openCursor();

    while ((cursor)) {

        taskData = [...taskData, cursor.value]

        cursor = await cursor.continue();
    }

    return new Promise(async (resolve, rej) => {
        return resolve({body: taskData})

    })
}
export const deleteTaskToIndexedDB = async (_id) => {
    await (await db).delete('task', _id);
    return new Promise(async (resolve, rej) => {
        return resolve({body: {}, code: 200})
    })
}
export const getAllNeno = async (data) => {
    let nenos = []
    let count = 0;
    let pageing = 0;
    // const tx = (await db).transaction("nenoitem");
    //
    // for await (const cursor of tx.store) {
    //     console.log(cursor.value);
    //     // Skip the next item
    //     // cursor.advance(2);
    // }
    let cursor = await (await db).transaction("nenoitem").store.openCursor(null, "prev");

    while ((cursor)) {

        if (data.page !== 0 && pageing === 0) {
            cursor = await (cursor).advance(data.page * 20 + 1)
            pageing = 1
        } else {
            let result = cursor.value;

            nenos = [...nenos, result]
            if (++count > 20) {
                for (let neno of nenos) {
                    await getParentDetail(neno)
                }
                return new Promise((resolve, rej) => {
                    return resolve({body: nenos})

                })
            }
            console.log()
            cursor = await cursor.continue();
        }
    }
    return new Promise((resolve, rej) => {
        return resolve({body: nenos})
    })
}

async function getParentDetail(result) {
    //查找父item
    if (result.parentId) {
        const presult = await (await db).getFromIndex('nenoitem', "_id", result.parentId);
        result.parent = presult
    }
    let children = [];

    const cresult = await (await db).getAllFromIndex('nenoitem', "parentId", result._id);

    for (let index = 0; index < cresult.length; index++) {
        const element = cresult[index];


        const gcresult = await (await db).getAllFromIndex('nenoitem', "parentId", element._id);
        element.children = gcresult

        children = [...children, element]
    }
    result.children = children
}

//获取所有笔记(按创建时间倒序), 用于每日回顾和随机漫步
export const getAllNenoList = async () => {
    let nenos = await (await db).getAll("nenoitem")
    return nenos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

//补充笔记的父笔记(批注对象)和子笔记(批注), NenoItem 需要这些字段展示关联
export const withRelations = async (neno) => {
    const copy = {...neno}
    await getParentDetail(copy)
    return copy
}

export const addNeno = async (data) => {
    if (data._id !== "") {
        const old = await (await db).getFromIndex('nenoitem', "_id", data._id);
        if (old) {
            data.created_at = old.created_at
            data.sha = old.sha || ""
        }
        data.update_at = dayjs().format()
        await (await db).put('nenoitem', data);

    } else {

        data._id = getObjectId().toString()
        data.created_at = dayjs().format()
        await (await db).put('nenoitem', data);
        let dDate = data.created_at.substring(0, 10)
        let countDate = {}

        let cursor = await (await db).transaction("nenoCount").store.openCursor();

        if (cursor) {
            countDate = cursor.value
            if (countDate[dDate]) {
                countDate[dDate] += 1
            } else {
                countDate[dDate] = 1
            }
            await (await db).put('nenoCount', countDate);
        } else {
            countDate._id = getObjectId().toString()
            countDate[dDate] = 1
            await (await db).put('nenoCount', countDate);

        }
        countDate.created_at = "countDate"
        countDate._id = "countDate"
        reload.set({tag: Date.now(), action: "nenoCount"})
        await pushTaskToIndexedDB({timestmp: Date.now(), data: countDate, action: "countDate"})
    }
    await pushTaskToIndexedDB({timestmp: Date.now(), data: data, action: "push"})

    return new Promise(async (resolve, rej) => {

        return resolve({body: data})

    })

}
export const detail = async (data) => {
    const result = await (await db).getFromIndex('nenoitem', "_id", data._id);
    await getParentDetail(result)

    return new Promise(async (resolve, rej) => {
        return resolve({body: result})
    })
}
export const deleteOne = async (data) => {
    const result = await (await db).getFromIndex('nenoitem', "_id", data._id);
    console.log(data)
    for (const datum of result.images) {
        await deletePicFromIndexedDB(datum)
    }
    await (await db).delete('nenoitem', data._id);

    await pushTaskToIndexedDB({timestmp: Date.now(), data: result, action: "delete"})

    reload.set({tag: Date.now(), action: "nenoCount"})

    return new Promise(async (resolve, rej) => {
        return resolve({body: {}, code: 200})
    })
}

export const tags = async (data) => {
    let tags = new Set()

    let cursor = await (await db).transaction("nenoitem").store.openCursor();
    while (cursor) {
        let neno = cursor.value
        neno.tags.forEach(element => {
            tags.add(element)
        });
        cursor = await cursor.continue()
    }
    return new Promise(async (resolve, rej) => {
        return resolve({
            code: 200, message: "BIU", body: [...tags]
        })
    })
}
export const pin = async (data) => {
    let pinTags = {}

    let cursor = await (await db).transaction("nenoPinTags").store.openCursor();
    if (cursor) {
        pinTags = cursor.value
        pinTags.tags = new Set(pinTags.tags)
    } else {
        pinTags._id = getObjectId().toString()
        pinTags.tags = new Set()
    }
    if (pinTags.tags.has(data.tag)) {
        pinTags.tags.delete(data.tag)
    } else {
        pinTags.tags.add(data.tag)
    }

    pinTags.tags = [...pinTags.tags]

    await (await db).put('nenoPinTags', pinTags);
    pinTags.created_at = "pinTags"
    pinTags._id = "pinTags"
    await pushTaskToIndexedDB({timestmp: Date.now(), data: pinTags, action: "pinTags"})

    return new Promise(async (resolve, rej) => {
        return resolve({
            code: 200, message: "BIU", body: [...pinTags.tags]
        })
    })
}
export const pins = async (data) => {
    let pinTags = []
    let cursor = await (await db).transaction("nenoPinTags").store.openCursor();
    if (cursor) {
        pinTags = cursor.value.tags
    }
    let repintags = []
    pinTags.forEach(element => {
        repintags = [...repintags, {_id: getObjectId().toString(), tag: element}]
    });
    return new Promise(async (resolve, rej) => {
        return resolve({
            code: 200, message: "BIU", body: [...repintags]
        })
    })
}
//取笔记的纯文本, 旧数据可能没有 pureContent
export const getPlainText = (neno) => {
    if (typeof neno.pureContent === "string" && neno.pureContent !== "") {
        return neno.pureContent
    }
    const div = document.createElement("div");
    div.innerHTML = neno.content || "";
    return div.textContent || "";
}

export const search = async (data) => {
    let nenos = [];
    //搜索内容时只匹配纯文本(不匹配 html 标签), 并忽略大小写
    const keyword = (data.content || "").trim().toLowerCase();
    let cursor = await (await db).transaction("nenoitem").store.openCursor(null, "prev");

    while ((cursor)) {
        let value = cursor.value;

        if (value.created_at.substring(0, 10) === data.created_at || value.tags.includes(data.tag) || (keyword !== "" && getPlainText(value).toLowerCase().indexOf(keyword) !== -1)) {
            nenos = [...nenos, value]
        }
        cursor = await cursor.continue();
    }
    return new Promise((resolve, rej) => {
        return resolve({body: nenos})

    })

}

export const count = async (data) => {
    let cursor = await (await db).transaction("nenoCount").store.openCursor();
    let countDate = {}
    if (cursor) {
        countDate = cursor.value
    }
    let count = await (await db).countFromIndex("nenoitem", "_id")
    return new Promise(async (resolve, rej) => {
        return resolve({body: {countDate: countDate, count: count}})

    })
}
export const renameTag = async (data) => {
    let cursor = await (await db).transaction("nenoitem", "readwrite").store.openCursor();
    while (cursor) {
        console.log(cursor.key, cursor.value);
        let neno = cursor.value
        for (let index = 0; index < neno.tags.length; index++) {
            const element = neno.tags[index];
            if (element === data.oldTag) {
                let element = neno;
                let rawContent = element.content
                let pIndex = 0;
                let pContent = ""
                for (let tindex = 0; tindex < element.tags.length; tindex++) {
                    let rawtag = element.tags[tindex];

                    if (rawtag === data.oldTag) {
                        let breakIndex = rawContent.indexOf(rawtag);

                        element.tags[tindex] = data.newTag
                        //截取前段的字符
                        pContent += rawContent.substring(0, breakIndex);
                        //加上替换的内容
                        pContent += data.newTag
                        pIndex += breakIndex + data.oldTag.length;
                        rawContent = rawContent.substring(breakIndex + data.oldTag.length);

                    } else {
                        let breakIndex = rawContent.indexOf(rawtag);
                        pContent += rawContent.substring(0, breakIndex + rawtag.length);

                        rawContent = rawContent.substring(breakIndex + rawtag.length);
                        pIndex += breakIndex + rawtag.length;

                    }
                }
                pContent += element.content.substring(pIndex);
                element.content = pContent
                cursor.update(neno)
                await pushTaskToIndexedDB({timestmp: Date.now(), data: neno, action: "push"})

                break
            }
        }
        cursor = await cursor.continue()
    }
    reload.set({tag: Date.now(), action: "nenoCount"})
    return new Promise(async (resolve, rej) => {
        return resolve({
            code: 200, message: "BIU", body: {}
        })
    })
}
