export const syncAllNenoToNotion=`# This is a syncAllNenoToNotion workflow 

name: sync all neno to notion

# Controls when the workflow will run
on:
  # Triggers the workflow on push or pull request events but only for the main branch


  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
 
  syncAllNenoToNotion:
    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      - uses: actions/checkout@v2
      
      - name: check
        run: | 
          curl --location --request GET 'https://api.github.com/repos/Mran/neno/contents/syncAllNenoToNotion.js' \\
          --header 'pragma: no-cache' \\
          --header 'accept: application/vnd.github.v3.raw+json' \\
          --header 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'\\
          > syncAllNenoToNotion.js
          
   
      
      - run: pwd
      - run: ls
      
      - name: Setup Node
        uses: actions/setup-node@v1
        with:
          node-version: '16.13.0'
      
      - name: install dependence
        run: npm i node-fetch@2.6.6
      
      - name: runSync
        env:
          NOTION_DATABASEID: [NOTION_DATABASEID]
          NOTION_TOKEN: [NOTION_TOKEN]
          GITHUB_TOKEN: [GITHUB_TOKEN]
        run: node syncAllNenoToNotion.js
        
       
 `
export const  syncNenoToNotion="# This is a syncNenoToNotion workflow \n" +
    "\n" +
    "name: sync single neno to notion\n" +
    "\n" +
    "# Controls when the workflow will run\n" +
    "on:\n" +
    "  # Triggers the workflow on push or pull request events but only for the main branch\n" +
    "  push:\n" +
    "    branches: [ main ]\n" +
    "\n" +
    "\n" +
    "  # Allows you to run this workflow manually from the Actions tab\n" +
    "  workflow_dispatch:\n" +
    "\n" +
    "# A workflow run is made up of one or more jobs that can run sequentially or in parallel\n" +
    "jobs:\n" +
    "  # This workflow contains a single job called \"syncNenoToNotion\"\n" +
    "  syncNenoToNotion:\n" +
    "    # The type of runner that the job will run on\n" +
    "    runs-on: ubuntu-latest\n" +
    "\n" +
    "    # Steps represent a sequence of tasks that will be executed as part of the job\n" +
    "    steps:\n" +
    "      - name: check\n" +
    "        if: ${{ contains(github.event.head_commit.message, '[ADD]') }}\n" +
    "        run: | \n" +
    "          curl --location --request GET 'https://api.github.com/repos/Mran/neno/contents/syncNenoToNotion.js' \\\n" +
    "          --header 'pragma: no-cache' \\\n" +
    "          --header 'accept: application/vnd.github.v3.raw+json' \\\n" +
    "          --header 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'\\\n" +
    "          > syncNenoToNotion.js\n" +
    "      - run: pwd\n" +
    "      - run: ls\n" +
    "      - name: Setup Node\n" +
    "        if: ${{ contains(github.event.head_commit.message, '[ADD]') }}\n" +
    "        uses: actions/setup-node@v1\n" +
    "        with:\n" +
    "          node-version: '16.13.0'\n" +
    "      - name: install dependence\n" +
    "        if: ${{ contains(github.event.head_commit.message, '[ADD]') }}\n" +
    "        run: npm i node-fetch@2.6.6\n" +
    "      - name: runSync\n" +
    "        if: ${{ contains(github.event.head_commit.message, '[ADD]') }}\n" +
    "        env:\n" +
    "          NOTION_DATABASEID: [NOTION_DATABASEID]\n" +
    "          NOTION_TOKEN: [NOTION_TOKEN]\n" +
    "          GITHUB_TOKEN: [GITHUB_TOKEN]\n" +
    "        run: node syncNenoToNotion.js\n" +
    "        \n" +
    "       \n" +
    " "
