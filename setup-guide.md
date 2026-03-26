# Meeting Review 多人在线同步版部署说明

## 一、适用场景

这套版本适用于：
- 你的网站继续部署在 GitHub Pages
- Meetings 和 Review 需要多人共同在线编辑
- 所有成员看到同一份实时同步的数据

## 二、你需要准备的东西

1. 一个 Google 账号，用来创建 Firebase 项目
2. 课题组成员的 Google 邮箱
3. 你现在的 GitHub 仓库：Meeting-Review

## 三、Firebase 端配置步骤

### 1. 创建 Firebase 项目
进入 Firebase 控制台，新建项目。

### 2. 注册 Web App
在项目中添加一个 Web 应用，得到一组配置参数。

### 3. 开启 Authentication
打开 Authentication
- 进入 Sign-in method
- 启用 Google 登录

### 4. 开启 Firestore Database
进入 Firestore Database
- 创建数据库
- 先选测试模式进行联调
- 联调通过后，再切换为安全规则模式

### 5. 添加授权域名
在 Authentication 的 Authorized domains 中，确认加入：
- liuyunjiang-x.github.io

## 四、网页文件中要改的地方

### 1. 修改 firebase-config.js
把下面示例内容替换成你自己 Firebase 控制台中的配置：

```js
export const firebaseProjectConfig = {
  apiKey: "你的 apiKey",
  authDomain: "你的项目.firebaseapp.com",
  projectId: "你的 projectId",
  storageBucket: "你的项目.appspot.com",
  messagingSenderId: "你的 messagingSenderId",
  appId: "你的 appId"
};

export const allowedEditorEmails = [
  "成员1@gmail.com",
  "成员2@gmail.com",
  "成员3@gmail.com"
];
```

### 2. 修改 firebase.rules.txt
把里面的示例邮箱换成你们课题组真实允许编辑的邮箱。

## 五、Firestore 安全规则发布

进入 Firestore Database -> Rules
把 `firebase.rules.txt` 的内容复制进去并发布。

## 六、上传到 GitHub

把以下文件上传并覆盖仓库中的同名文件：
- index.html
- meetings.html
- review.html
- styles.css
- app.js
- firebase-config.js

建议同时把下面两个文件也一起放进仓库，方便你后续维护：
- firebase-config.example.js
- firebase.rules.txt
- setup-guide.md

## 七、发布后效果

发布成功后：
- 成员可以 Google 登录
- 登录后可在 Meetings 和 Review 页面新增、编辑、删除
- 数据存储在 Firestore
- 页面通过 onSnapshot 实时同步更新

## 八、建议你下一步继续做的增强

1. 增加“只允许组内邮箱后缀登录”
2. 增加“按周归档组会记录”
3. 增加“任务完成率统计面板”
4. 增加“上传附件链接字段”
5. 增加“编辑历史记录”
