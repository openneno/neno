<style global style lang="postcss">
  /* prgecss start ignore */
  @tailwind base;
  @tailwind components;
  /* purgecss end ignore */

  @tailwind utilities;
  @layer components {
    .ql-editor.ql-blank::before {
      @apply dark:text-white;
    }
  }
</style>
