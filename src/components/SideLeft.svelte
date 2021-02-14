<script>
    import { tokoen } from "../store/store.js";
</script>

<div
    class="lt:hidden  sm:block  border-soild border-8 borderborder-red-300 bg-red-200"
    style="width:240px"
>
    <div>
        {#if $tokoen == ""}
            <!-- content here -->
            <button
                class="rounded bg-green-700 p-3 text-white focus:outline-none"
                >登录</button
            >
        {:else}
            <!-- else content here -->
            <button class="rounded bg-red-700 p-3 text-white focus:outline-none"
                >退出</button
            >
        {/if}
    </div>
</div>


<style type="text/postcss">
</style>
