![icon](https://github.com/Mran/neno/blob/master/public/neno.ico)

![](https://visitor-badge.glitch.me/badge?page_id=neno)

NENO
=============

仿照[浮墨](https://flomoapp.com/)的开源版本

- svelte+tailwindcss构建的PWA应用
- 基本功能上与[浮墨](https://flomoapp.com/)保持相同
- **无需后端,完全使用github或者gitee进行存储你的所有数据,文字和图片**
- **支持完全离线使用**
- **支持完整版数据导入导出**
- **支持同步内容到Notion(使用gihub action)**
- **支持utools的neno插件**
- **支持微信公众号记录笔记到neno**
- **支持Telegram Bot记录笔记到neno**
- **支持CLI工具记录笔记到neno**
- **支持浏览器插件记录笔记到neno**

### neno的外部扩展工具
  1. [utools](https://u.tools/#/) 是一个快速的工具平台。在utools上搜索neno插件，即可使用。

     >项目地址[neno-extension](https://github.com/Mran/neno-extension#/)
  2. 使用微信公众号进行输入。
      >项目地址[neno-wx](https://github.com/Mran/neno-wx#/)
     ![](https://github.com/Mran/neno-extension/raw/master/asset/neno-wx.png)
  3. 使用Telegram Bot进行输入。
      >项目地址[neno-telegram](https://github.com/openneno/neno-tg) 体验地址[neno Bot](https://t.me/NenoTG_Bot)
  4. 使用CLI进行输入。
      >项目地址[neno-cli](https://github.com/openneno/neno-cli)
  5. 使用谷歌浏览器插件进行快速选择文本输入
     >项目地址[neno-chrome-plugin](https://github.com/openneno/neno-chrome-plugin)


[马上体验](https://neno.pages.dev/)

### 前端部署方式

#### 自己打包

```
npm install
node run build
dist 目录下面为构建好的前端页面
```

### 部署到vercel
  

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FMran%2Fneno)


## 如何使用

![](https://github.com/Mran/neno/blob/master/readmepic/settinghow.png)

填上自己的githubtoken,然后点击获取github用户名,填上用于存储数据的仓库名称,点击保存即可

### Todo

- [x] 分享出图片
- [X] 完全基于浏览器的离线版本
- [X] 使用github进行存储
- [X] 基于github action 的notion 同步
- [X] 基于serverless的 的微信公众号输入笔记
- [X] 基于serverless的 的TelegramBot输入笔记
- [ ] 每日回顾
- [ ] 随机漫步


![](https://github.com/Mran/neno/blob/master/readmepic/%E9%A6%96%E9%A1%B5.png)
![](https://github.com/Mran/neno/blob/master/readmepic/%E9%A6%96%E9%A1%B5%E7%A7%BB%E5%8A%A8%E7%AB%AF.png)
![](https://github.com/Mran/neno/blob/master/readmepic/%E7%88%B6%E7%BA%A7.png)
![](https://github.com/Mran/neno/blob/master/readmepic/setting.png)

---

## License

GPL
