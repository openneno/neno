<script>
    import { EditorState } from "prosemirror-state";
    import { EditorView } from "prosemirror-view";
    import { Schema, DOMParser } from "prosemirror-model";
    import { schema } from "prosemirror-schema-basic";
    import { addListNodes } from "prosemirror-schema-list";
    import { exampleSetup } from "prosemirror-example-setup";
    import { onMount } from "svelte";
    let editor = "";
    let content = "";
    onMount(() => {
        let state = EditorState.create({
            doc: DOMParser.fromSchema(schema).parse(content),
        });
        let view = new EditorView(editor, { state });
    });
</script>

<div class="border-gray-200 border-solid border-4 rounded-lg mt-2 p-2">
    <div bind:this={editor} />
    <div bind:this={content}>
        <p>123</p>
    </div>
    <div class=" flex justify-between  mt-4">
        <div id="toolbar-container" class="space-x-1">
            <button class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none"
                ><i class="ri-hashtag" /></button
            >
            <button class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none"
                ><i class="ri-list-check" /></button
            >
            <button class="rounded-sm hover:bg-gray-200 p-1"
                ><i class="ri-list-ordered" /></button
            >
            <button class="rounded-sm hover:bg-gray-200 p-1"
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
</div>
