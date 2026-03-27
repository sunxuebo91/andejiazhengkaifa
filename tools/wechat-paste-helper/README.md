# WeChat Paste Helper

用于解决微信收藏文档批量复制图片时，浏览器只能拿到 `D:\...jpg` 路径、拿不到真实图片二进制的问题。

## 作用

当前前端在检测到微信 HTML 里的本地图片路径后，会自动请求本机：

`http://127.0.0.1:43821/api/read-images`

这个 helper 会读取这些 Windows 图片文件并返回 `data:image/...;base64,...`，从而实现“单次粘贴，多张图片直接进入网页”。

## 启动

在用户自己的 Windows 电脑上运行：

```bash
npm run wechat-paste-helper
```

默认监听：

`http://127.0.0.1:43821`

健康检查：

```bash
curl http://127.0.0.1:43821/health
```

## 说明

- 这是本机服务，必须运行在执行粘贴操作的那台电脑上。
- 目前支持 `jpg/jpeg/png/gif/webp/bmp`。
- 页面端不需要额外操作，照常 `Ctrl+V` 粘贴即可。
