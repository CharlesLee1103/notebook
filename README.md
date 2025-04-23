# Online Notebook

一个在线笔记本应用，支持 Markdown 编辑和实时预览。

## 站点
[随记](https://jiezai.fun)

## 功能特点

- Markdown 编辑和实时预览
- 支持代码高亮
- 待办事项管理
- 自动保存
- 快捷键支持
- 全屏编辑/预览模式
- 支持文件导入导出

## 快捷键

- ⌘S / Ctrl+S：保存笔记
- ⌘E / Ctrl+E：导出笔记
- ⌘T / Alt+T：显示/隐藏待办面板
- ⌘N / Alt+N：快速添加待办
- ⌘L / Alt+L：插入待办列表
- ⌘Q / Ctrl+Q：折叠/展开代码块
- ESC：切换预览全屏
- Enter：从预览返回编辑

## 技术栈

- CodeMirror：代码编辑器
- Marked.js：Markdown 解析
- Highlight.js：代码高亮

## 本地开发

直接在浏览器中打开 `notebook.html` 即可使用。

## 部署说明

1. 将 `notebook.html` 部署到 Web 服务器
2. 确保所有静态资源可以正确加载
3. 访问对应的 URL 即可使用

## 注意事项

- 所有数据保存在浏览器的 localStorage 中
- 建议定期导出重要笔记
- 清除浏览器数据会导致笔记丢失 
