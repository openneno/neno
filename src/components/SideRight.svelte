<script>
    import Editor from "./Editor.svelte";
    import ProEditor from "./ProEditor.svelte";
    import QuillEditor from "./QuillEditor.svelte";
</script>

<div class="  flex-1 flex flex-col justify-start p-4 ">
    <div class="  flex flex-row items-center justify-between">
        <div>MEMO</div>

        <div class="bg-gray-200 rounded-lg h-8 p-2 flex items-center">
            <i class="ri-search-2-line text-gray-300" />
            <input class=" ml-2 bg-gray-200 focus:outline-none" type="text" />
        </div>
    </div>
    <!-- <Editor /> -->
    <!-- <ProEditor /> -->
    <QuillEditor />
</div>

<style type="text/postcss">
</style>
