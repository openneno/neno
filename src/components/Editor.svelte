<script>
    import { onMount } from "svelte";
    let editor = "";
    import { afterUpdate, tick } from "svelte";

    afterUpdate(async () => {
        // await tick();
        // editor.focus();
    });
    onMount(() => {
        // editor.focus();
        // let selection = getSelection();
        // console.log(selection, selection.focusNode.length);
        // selection.setPosition(selection.focusNode, selection.focusNode.length);
    });

    let lastEditRange;
    let eContent = ``;
    let bolding = false;
    $: {
        console.log(eContent);
    }
    function get1LevelNodePosition(selection) {
        let cNode = selection.focusNode;
        if (cNode == null || cNode.id == "msgInputContainer") {
            console.log("return ", "null");

            return null;
        }
        if (cNode.type) {
        }
        while (true) {
            if (cNode.parentNode.id == "msgInputContainer") {
                console.log("return ", cNode, cNode.nextElementSibling);
                return { node: cNode, nextnode: cNode.nextElementSibling };
            } else {
                cNode = cNode.parentNode;
            }
        }
    }
    function hashtag(params) {}
    async function listcheck(params) {
        editor.focus();
        let selection = getSelection();
        console.log("selection", selection);
        //判断当前属于div,ol,还是ul
        let inNode = get1LevelNodePosition(selection);
        if (inNode == null || inNode.nextnode == null) {
            addli(null);
        } else if (inNode.node.nodeName == "OL") {
            //将有序列表变成普通列表
            let selection = getSelection();
            let cNode = selection.focusNode;
            let targetNode = "";
            //获得光标所在的li
            while (true) {
                if (cNode.nodeName == "LI") {
                    targetNode = cNode;
                    break;
                } else {
                    cNode = cNode.parentNode;
                }
            }
            let targetIndex = 0;
            let geted = false;
            let newNode = document.createElement("div");
            let newNextNode = document.createElement("ol");
            newNextNode.className = "list-decimal list-inside";

            //获得光标所在的li的位置
            for (let index = 0; index < inNode.node.children.length; index++) {
                const element = inNode.node.children[index];
                if (element.isSameNode(targetNode)) {
                    targetIndex = index;
                    geted = true;
                    let a = targetNode.childNodes.length;
                    for (let i = 0; i < a; i++) {
                        let elementaa = targetNode.childNodes[i].cloneNode(
                            true
                        );
                        newNode.appendChild(elementaa);
                    }
                    editor.insertBefore(newNode, inNode.nextnode);
                    continue;
                }
                if (geted) {
                    newNextNode.appendChild(element.cloneNode(true));
                }
            }
            console.log("newNextNode", newNextNode);
            inNode.node.removeChild(targetNode);
            if (inNode.node.childNodes.length == 0) {
                //如果移除后ol内为空,移除这个空的ol
                editor.removeChild(inNode.node);
            } else {
                //移除目标节点后面的li
                let a = newNextNode.childNodes.length;
                for (let i = 0; i < a; i++) {
                    inNode.node.removeChild(inNode.node.lastChild);
                }
            }
            //将目标节点后面的li集中到新的ol中并插入
            editor.insertBefore(newNextNode, newNode.nextElementSibling);
            moveRange(newNode);
        } else if (inNode.node.nodeName == "DIV") {
            let olNode = document.createElement("ol");
            olNode.className = "list-decimal list-inside";
            let liNode = document.createElement("li");
            let a = inNode.node.childNodes.length;
            for (let i = 0; i < a; i++) {
                let elementaa = inNode.node.childNodes[i].cloneNode(true);
                liNode.appendChild(elementaa);
            }
            olNode.appendChild(liNode);
            editor.insertBefore(olNode, inNode.nextnode);
            editor.removeChild(inNode.node);

            moveRange(liNode);
        } else if (inNode.node.nodeName == "#text") {
            addli(inNode.nextnode);
        } else if (inNode.node.nodeName == "UL") {
            //将无序列表变成有序列表
            let olNode = document.createElement("ol");
            olNode.className = "list-decimal list-inside";
            console.log(inNode.node.children.length);
            let a = inNode.node.children.length;
            for (let i = 0; i < a; i++) {
                let element = inNode.node.children[i].cloneNode(true);
                console.log(i, element, inNode.node.children.length);
                olNode.appendChild(element);
            }

            inNode.node.parentNode.replaceChild(olNode, inNode.node);
        }
    }
    function addli(inNode) {
        let olNode = document.createElement("ol");
        olNode.className = "list-decimal list-inside";
        let liNode = document.createElement("li");
        olNode.appendChild(liNode);
        if (inNode == null) {
            editor.appendChild(olNode);
        } else {
            editor.insertBefore(olNode, inNode);
        }
        moveRange(liNode);
    }
    function addul(inNode) {
        let olNode = document.createElement("ul");
        olNode.className = "list-disc list-inside";
        let liNode = document.createElement("li");
        olNode.appendChild(liNode);
        if (inNode == null) {
            editor.appendChild(olNode);
        } else {
            editor.insertBefore(olNode, inNode);
        }
        moveRange(liNode);
    }

    function toli(inNode) {}
    function listorder(params) {
        editor.focus();
        let selection = getSelection();
        console.log("selection", selection);
        //判断当前属于div,ol,还是ul
        let inNode = get1LevelNodePosition(selection);
        if (inNode == null || inNode.nextnode == null) {
            addul(null);
        } else if (inNode.node.nodeName == "UL") {
            //将无序列表变成普通列表
            let selection = getSelection();
            let cNode = selection.focusNode;
            let targetNode = "";
            //获得光标所在的li
            while (true) {
                if (cNode.nodeName == "LI") {
                    targetNode = cNode;
                    break;
                } else {
                    cNode = cNode.parentNode;
                }
            }
            let targetIndex = 0;
            let geted = false;
            let newNode = document.createElement("div");
            let newNextNode = document.createElement("ul");
            newNextNode.className = "list-disc list-inside";

            //获得光标所在的li的位置
            for (let index = 0; index < inNode.node.children.length; index++) {
                const element = inNode.node.children[index];
                if (element.isSameNode(targetNode)) {
                    targetIndex = index;
                    geted = true;
                    let a = targetNode.childNodes.length;
                    for (let i = 0; i < a; i++) {
                        let elementaa = targetNode.childNodes[i].cloneNode(
                            true
                        );
                        newNode.appendChild(elementaa);
                    }
                    editor.insertBefore(newNode, inNode.nextnode);
                    continue;
                }
                if (geted) {
                    newNextNode.appendChild(element.cloneNode(true));
                }
            }
            console.log("newNextNode", newNextNode);
            inNode.node.removeChild(targetNode);
            if (inNode.node.childNodes.length == 0) {
                //如果移除后ol内为空,移除这个空的ol
                editor.removeChild(inNode.node);
            } else {
                //移除目标节点后面的li
                let a = newNextNode.childNodes.length;
                for (let i = 0; i < a; i++) {
                    inNode.node.removeChild(inNode.node.lastChild);
                }
            }
            //将目标节点后面的li集中到新的ol中并插入
            editor.insertBefore(newNextNode, newNode.nextElementSibling);
            moveRange(newNode);
        } else if (inNode.node.nodeName == "DIV") {
            let olNode = document.createElement("ul");
            olNode.className = "list-disc list-inside";
            let liNode = document.createElement("li");
            let a = inNode.node.childNodes.length;
            for (let i = 0; i < a; i++) {
                let elementaa = inNode.node.childNodes[i].cloneNode(true);
                liNode.appendChild(elementaa);
            }
            olNode.appendChild(liNode);
            editor.insertBefore(olNode, inNode.nextnode);
            editor.removeChild(inNode.node);

            moveRange(liNode);
        } else if (inNode.node.nodeName == "#text") {
            addli(inNode.nextnode);
        } else if (inNode.node.nodeName == "OL") {
            //将无序列表变成有序列表
            let olNode = document.createElement("ul");
            olNode.className = "list-disc list-inside";
            console.log(inNode.node.children.length);
            let a = inNode.node.children.length;
            for (let i = 0; i < a; i++) {
                let element = inNode.node.children[i].cloneNode(true);
                console.log(i, element, inNode.node.children.length);
                olNode.appendChild(element);
            }

            inNode.node.parentNode.replaceChild(olNode, inNode.node);
        }
    }
    async function bold(params) {
        editor.focus();
    }
    function underline(params) {}
    function picture(params) {}
    function moveRange(liNode) {
        let selection = window.getSelection();
        // 创建新的光标对象
        var range = document.createRange();
        // 光标对象的范围界定为新建的表情节点
        range.selectNodeContents(liNode);
        // 光标位置定位在表情节点的最大长度
        console.log("liNode.length", liNode.length);
        range.setStart(liNode, 0);
        // range.setEnd(liNode, 0);
        // 使光标开始和光标结束重叠
        range.collapse(true);
        // 清除选定对象的所有光标对象
        selection.removeAllRanges();
        // 插入新的光标对象
        selection.collapse(liNode, 0);
        selection.addRange(range);
    }
</script>

<div class="border-gray-200 border-solid border-4 rounded-lg mt-2 p-2">
    <div
        id="msgInputContainer"
        class="msgInputContainer min-h-32 max-h-64   overflow-y-auto overflow-x-hidden focus:outline-none "
        contenteditable="true"
        bind:this={editor}
        bind:innerHTML={eContent}
    />
    <div class=" flex justify-between  mt-4">
        <div id="toolbar-container" class="space-x-1">
            <button class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none"
                ><i class="ri-hashtag" /></button
            >
            <button
                class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none"
                on:click={listcheck}><i class="ri-list-check" /></button
            >
            <button
                class="rounded-sm hover:bg-gray-200 p-1"
                on:click={listorder}><i class="ri-list-ordered" /></button
            >
            <button class="rounded-sm hover:bg-gray-200 p-1" on:click={bold}
                ><i class="ri-bold" /></button
            >
            <button class="rounded-sm hover:bg-gray-200 p-1"
                ><i class="ri-underline" /></button
            >
            <button class="rounded-sm hover:bg-gray-200 p-1"
                ><i class="ri-image-2-line" /></button
            >
        </div>
    </div>
    <div>{eContent}</div>
</div>

<style>
    div#msgInputContainer:empty:before {
        content: "123";
    }
</style>
