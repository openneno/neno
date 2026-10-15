//git 对象相关的工具函数: 计算 blob sha, base64 与字节互转

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function textToBytes(text) {
    return encoder.encode(text);
}

export function bytesToText(bytes) {
    return decoder.decode(bytes);
}

//与 git hash-object 相同: sha1("blob <字节数>\0" + 内容), 用于判断文件是否已经和远端一致
export async function gitBlobSha(bytes) {
    const header = encoder.encode(`blob ${bytes.byteLength}\0`);
    const data = new Uint8Array(header.byteLength + bytes.byteLength);
    data.set(header, 0);
    data.set(bytes, header.byteLength);
    const digest = await crypto.subtle.digest("SHA-1", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

//GitHub 返回的 base64 带有换行
export function base64ToBytes(base64) {
    const binary = atob(base64.replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export async function blobToBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
}

const IMAGE_TYPES = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    apng: "image/apng",
};

export function imageType(suffix) {
    return IMAGE_TYPES[(suffix || "").toLowerCase()] || "application/octet-stream";
}
