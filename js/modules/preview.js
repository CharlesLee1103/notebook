import { DOMUtils } from '../utils/dom.js';
import { StorageUtils } from '../utils/storage.js';

/**
 * 预览管理器类
 */
export class PreviewManager {
    constructor(previewElementId) {
        this.previewElement = DOMUtils.get(`#${previewElementId}`);
        this.todoIndex = 0;
        this.onTaskItemClickCallback = null;
        this.jsonEditorInstances = [];
        this.pendingJsonEditors = []; // 使用数组存储多个待处理的JSON编辑器
        this.loadedFonts = new Set(); // 已加载的字体集合
        
        console.log('PreviewManager 初始化', previewElementId, '找到预览元素:', !!this.previewElement);
        
        // 添加全局回调函数用于待办项点击
        window.toggleTodoItem = this.toggleTodoItem.bind(this);
        
        // 添加全局JSON操作函数
        window.copyJsonToClipboard = this.copyJsonToClipboard.bind(this);
        window.toggleJsonNode = this.toggleJsonNode.bind(this);
        window.editJsonContent = this.editJsonContent.bind(this);
        window.unescapeJsonContent = this.unescapeJsonContent.bind(this);
        
        // 预加载所有字体
        this.preloadFonts();
        
        // 监听字体更改事件
        document.addEventListener('fontFamilyChanged', (event) => {
            this.setFontFamily(event.detail.fontFamily);
        });
        
        // 应用默认字体或已保存的字体
        const savedFont = StorageUtils.get('fontFamily') || '新叶念体';
        this.setFontFamily(savedFont);
        
        this.setupMarked();
    }
    
    /**
     * 预加载所有字体
     */
    preloadFonts() {
        const fonts = [
            { name: '新叶念体', path: '../../font/新叶念体.otf' },
            { name: '瑞美加张清平硬笔楷书', path: '../../font/瑞美加张清平硬笔楷书.ttf' },
            { name: '瑞美加张清平硬笔行书', path: '../../font/瑞美加张清平硬笔行书.ttf' },
            { name: 'YunFengHanChanTi-2', path: '../../font/YunFengHanChanTi-2.ttf' },
            { name: 'ShouShuTi-2', path: '../../font/ShouShuTi-2.ttf' },
            { name: 'PingFangChangAnTi-2', path: '../../font/PingFangChangAnTi-2.ttf' },
            { name: 'XinYeNianTi-2', path: '../../font/XinYeNianTi-2.otf' }
        ];
        
        fonts.forEach(font => {
            this.loadFont(font.name, font.path);
        });
    }
    
    /**
     * 加载字体
     * @param {string} fontName 字体名称
     * @param {string} fontPath 字体路径
     */
    loadFont(fontName, fontPath) {
        if (this.loadedFonts.has(fontName)) {
            return Promise.resolve();
        }
        
        const fontFace = new FontFace(fontName, `url(${fontPath})`);
        return fontFace.load().then((loadedFace) => {
            document.fonts.add(loadedFace);
            this.loadedFonts.add(fontName);
            console.log(`字体加载成功：${fontName}`);
            return loadedFace;
        }).catch((error) => {
            console.error(`字体加载失败：${fontName}`, error);
        });
    }
    
    /**
     * 设置字体
     * @param {string} fontFamily 字体名称
     */
    setFontFamily(fontFamily) {
        if (this.previewElement) {
            if (fontFamily === 'default') {
                // 使用系统默认字体
                this.previewElement.style.fontFamily = `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
                console.log(`字体已应用：系统默认字体`);
                return;
            }
            
            // 确保字体已加载
            const font = Array.from(this.loadedFonts).find(name => name === fontFamily);
            if (font) {
                this.previewElement.style.fontFamily = `'${fontFamily}', sans-serif`;
                console.log(`字体已应用：${fontFamily}`);
            } else {
                // 尝试加载字体
                const fontMap = {
                    '新叶念体': '../../font/新叶念体.otf',
                    '瑞美加张清平硬笔楷书': '../../font/瑞美加张清平硬笔楷书.ttf',
                    '瑞美加张清平硬笔行书': '../../font/瑞美加张清平硬笔行书.ttf',
                    'YunFengHanChanTi-2': '../../font/YunFengHanChanTi-2.ttf',
                    'ShouShuTi-2': '../../font/ShouShuTi-2.ttf',
                    'PingFangChangAnTi-2': '../../font/PingFangChangAnTi-2.ttf',
                    'XinYeNianTi-2': '../../font/XinYeNianTi-2.otf'
                };
                
                if (fontMap[fontFamily]) {
                    this.loadFont(fontFamily, fontMap[fontFamily]).then(() => {
                        this.previewElement.style.fontFamily = `'${fontFamily}', sans-serif`;
                        console.log(`字体已加载并应用：${fontFamily}`);
                    });
                }
            }
        }
    }
    
    /**
     * 全局函数，处理待办项点击
     */
    toggleTodoItem(lineNumber, checked) {
        console.log('全局toggleTodoItem函数被调用:', lineNumber, checked);
        if (this.onTaskItemClickCallback) {
            this.onTaskItemClickCallback(parseInt(lineNumber), checked);
        }
    }

    /**
     * 复制JSON内容到剪贴板
     */
    copyJsonToClipboard(jsonId) {
        const jsonContainer = document.getElementById(jsonId);
        if (!jsonContainer) return;
        
        const jsonEditor = this.jsonEditorInstances.find(editor => editor.container.id === jsonId);
        if (jsonEditor) {
            const jsonContent = JSON.stringify(jsonEditor.get(), null, 2);
            navigator.clipboard.writeText(jsonContent).then(() => {
                // 显示复制成功提示
                const successTip = DOMUtils.create('div', {
                    className: 'json-copy-success',
                    innerHTML: '复制成功'
                });
                jsonContainer.appendChild(successTip);
                setTimeout(() => {
                    jsonContainer.removeChild(successTip);
                }, 1500);
            });
        }
    }
    
    /**
     * 切换JSON节点的折叠状态
     */
    toggleJsonNode(jsonId, path) {
        const jsonEditor = this.jsonEditorInstances.find(editor => editor.container.id === jsonId);
        if (jsonEditor) {
            jsonEditor.toggleNode(path);
        }
    }
    
    /**
     * 编辑JSON内容
     */
    editJsonContent(jsonId) {
        const jsonEditor = this.jsonEditorInstances.find(editor => editor.container.id === jsonId);
        if (jsonEditor) {
            jsonEditor.expandAll();
            jsonEditor.setMode('tree');
            
            // 提示用户编辑模式已激活
            const jsonContainer = document.getElementById(jsonId);
            if (jsonContainer) {
                const editTip = DOMUtils.create('div', {
                    className: 'json-edit-tip',
                    innerHTML: '编辑模式已激活，点击节点进行编辑'
                });
                jsonContainer.appendChild(editTip);
                setTimeout(() => {
                    jsonContainer.removeChild(editTip);
                }, 3000);
            }
        }
    }
    
    /**
     * 去转义JSON内容
     */
    unescapeJsonContent(jsonId) {
        const jsonEditor = this.jsonEditorInstances.find(editor => editor.container.id === jsonId);
        if (!jsonEditor) return;
        
        try {
            const jsonContent = jsonEditor.get();
            
            // 递归处理对象中的字符串，去除转义
            const unescapeObject = (obj) => {
                if (typeof obj === 'string') {
                    return JSON.parse(`"${obj.replace(/"/g, '\\"')}"`);
                } else if (Array.isArray(obj)) {
                    return obj.map(item => unescapeObject(item));
                } else if (obj !== null && typeof obj === 'object') {
                    const result = {};
                    for (const key in obj) {
                        result[key] = unescapeObject(obj[key]);
                    }
                    return result;
                }
                return obj;
            };
            
            const unescapedContent = unescapeObject(jsonContent);
            jsonEditor.set(unescapedContent);
            jsonEditor.expandAll();
            
            // 提示用户去转义成功
            const jsonContainer = document.getElementById(jsonId);
            if (jsonContainer) {
                const unescapeTip = DOMUtils.create('div', {
                    className: 'json-unescape-tip',
                    innerHTML: '去转义处理完成'
                });
                jsonContainer.appendChild(unescapeTip);
                setTimeout(() => {
                    jsonContainer.removeChild(unescapeTip);
                }, 1500);
            }
        } catch (error) {
            console.error('去转义JSON内容失败:', error);
            
            // 显示错误提示
            const jsonContainer = document.getElementById(jsonId);
            if (jsonContainer) {
                const errorTip = DOMUtils.create('div', {
                    className: 'json-error-tip',
                    innerHTML: '去转义失败: ' + error.message
                });
                jsonContainer.appendChild(errorTip);
                setTimeout(() => {
                    jsonContainer.removeChild(errorTip);
                }, 3000);
            }
        }
    }

    /**
     * 配置marked
     */
    setupMarked() {
        const renderer = new marked.Renderer();
        
        // 保存原始的list和listitem渲染函数
        const originalList = renderer.list;
        const originalListitem = renderer.listitem;
        const originalParagraph = renderer.paragraph;

        // 保存this引用，在渲染器回调中使用
        const self = this;

        // 处理独立公式
        const processMathBlock = (text) => {
            // 移除开头和结尾的$符号或\[\]符号
            let processedText = text;
            processedText = processedText.replace(/^\$\$|\$\$$/g, '');
            processedText = processedText.replace(/^\\\[|\\\]$/g, '');
            
            // 特殊处理 - 保护LaTeX换行符和其他特殊字符
            // 在经过marked处理前，先将LaTeX的特殊字符替换为特殊标记
            processedText = processedText.replace(/\\\\/g, function() { return 'LYJ_LATEX_NEWLINE_LYJ'; });
            processedText = processedText.replace(/\\begin\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_START_LYJ'; });
            processedText = processedText.replace(/\\end\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_END_LYJ'; });
            processedText = processedText.replace(/\\begin\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_START_LYJ'; });
            processedText = processedText.replace(/\\end\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_END_LYJ'; });
            processedText = processedText.replace(/&=/g, function() { return 'LYJ_LATEX_ALIGNMENT_LYJ'; });
            // 添加对\[和\]符号的处理
            processedText = processedText.replace(/\\\[/g, function() { return 'LYJ_LATEX_DISPLAY_START_LYJ'; });
            processedText = processedText.replace(/\\\]/g, function() { return 'LYJ_LATEX_DISPLAY_END_LYJ'; });
            
            return `<div class="math-block">$$${processedText}$$</div>`;
        };
        
        // 处理行内公式
        const processInlineMath = (match, formula) => {
            return `<span class="math-inline">\\(${formula}\\)</span>`;
        };
        
        // 自定义列表渲染
        renderer.list = function(body, ordered, start) {
            const type = ordered ? 'ol' : 'ul';
            const startAttr = (ordered && start !== 1) ? (' start="' + start + '"') : '';
            return '<' + type + startAttr + '>\n' + body + '</' + type + '>\n';
        };

        // 处理独立公式
        renderer.paragraph = function(text) {
            // 检查是否是独立公式（$$ ... $$ 或 \[ ... \]）
            if (text.startsWith('$$') && text.endsWith('$$')) {
                return processMathBlock(text);
            }
            
            if (text.startsWith('\\[') && text.endsWith('\\]')) {
                return processMathBlock(text);
            }
            
            // 检查是否包含$$...$$ 格式的独立公式 (在段落内)
            const displayMathRegex = /\$\$(.*?)\$\$/g;
            if (displayMathRegex.test(text)) {
                // 将段落中的$$...$$ 替换为数学块
                let processedText = text.replace(displayMathRegex, (match, formula) => {
                    return processMathBlock('$$' + formula + '$$');
                });
                // 如果整个段落只有一个公式，直接返回公式块
                if (processedText.indexOf('<div class="math-block">') === 0 && 
                    processedText.lastIndexOf('</div>') === processedText.length - 6) {
                    return processedText;
                }
                return processedText;
            }
            
            // 处理行内公式 $...$ 和 \(...\)
            let processedText = text;
            // 替换 $...$ 公式，但避免替换 $$...$$ 独立公式
            processedText = processedText.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, '<span class="math-inline">\\($1\\)</span>');
            // 替换 \(...\) 公式
            processedText = processedText.replace(/\\\((.*?)\\\)/g, '<span class="math-inline">\\($1\\)</span>');
            
            if (processedText !== text) {
                return '<p>' + processedText + '</p>';
            }
            
            return originalParagraph.call(this, text);
        };
        
        // 自定义代码块渲染 - 使用function关键字并传递self引用
        renderer.code = function(code, language) {
            // 检查是否是数学公式代码块
            if (language === 'math' || language === 'latex') {
                return processMathBlock(`$$${code}$$`);
            }
            
            // 特殊处理JSON代码块 - 使用简洁的样式
            if (language === 'json' || language.startsWith('json:')) {
                try {
                    // 检查是否包含jsonPath表达式
                    let jsonPath = null;
                    if (language.startsWith('json:')) {
                        jsonPath = language.substring(5); // 提取jsonPath表达式
                        console.log('检测到jsonPath:', jsonPath);
                    }
                    
                    // 尝试格式化JSON
                    let formattedJson;
                    let jsonObj;
                    try {
                        // 解析JSON并重新格式化
                        jsonObj = JSON.parse(code);
                        
                        // 如果有jsonPath表达式，应用它
                        if (jsonPath && jsonPath.trim()) {
                            try {
                                const filteredData = self.applyJsonPath(jsonObj, jsonPath);
                                if (filteredData !== undefined) {
                                    jsonObj = filteredData;
                                    console.log('应用jsonPath后结果:', filteredData);
                                } else {
                                    console.warn('jsonPath没有匹配结果:', jsonPath);
                                }
                            } catch (pathErr) {
                                console.error('jsonPath解析错误:', pathErr);
                            }
                        }
                        
                        formattedJson = JSON.stringify(jsonObj, null, 2);
                    } catch (e) {
                        // 如果解析失败，尝试修复常见问题
                        const fixedJsonCode = self.fixJsonCode(code);
                        try {
                            jsonObj = JSON.parse(fixedJsonCode);
                            
                            // 如果有jsonPath表达式，应用它
                            if (jsonPath && jsonPath.trim()) {
                                try {
                                    const filteredData = self.applyJsonPath(jsonObj, jsonPath);
                                    if (filteredData !== undefined) {
                                        jsonObj = filteredData;
                                    }
                                } catch (pathErr) {
                                    console.error('jsonPath解析错误:', pathErr);
                                }
                            }
                            
                            formattedJson = JSON.stringify(jsonObj, null, 2);
                        } catch (e2) {
                            // 如果仍然失败，使用原始代码
                            formattedJson = code;
                        }
                    }
                    
                    // 生成唯一ID
                    const jsonId = 'json-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                    
                    // 转义JSON字符串用于data属性(用于后续操作)
                    const escapedJson = JSON.stringify(formattedJson)
                        .replace(/&/g, '&amp;')
                        .replace(/'/g, '&apos;')
                        .replace(/"/g, '&quot;');
                    
                    // 如果使用了jsonPath，添加提示
                    let jsonPathInfo = '';
                    if (jsonPath && jsonPath.trim()) {
                        jsonPathInfo = `<div class="json-path-info">已应用筛选: <code>${jsonPath}</code></div>`;
                    }
                    
                    // 使用hljs高亮处理
                    const highlighted = hljs.highlight(formattedJson, { language: 'json' }).value;
                    
                    // 创建简洁的代码块，带有隐藏的功能菜单
                    return `
                        <div class="json-container" data-json="${escapedJson}" data-json-id="${jsonId}" ${jsonPath ? `data-json-path="${jsonPath}"` : ''}>
                            ${jsonPathInfo}
                            <div class="json-actions">
                                <button class="json-action-btn json-copy-btn" title="复制">复制</button>
                                <button class="json-action-btn json-unescape-btn" title="去除转义">去转义</button>
                                <button class="json-action-btn json-fold-btn" title="折叠/展开">折叠</button>
                                <button class="json-action-btn json-edit-btn" title="编辑">编辑</button>
                            </div>
                            <pre class="json-highlight"><code id="${jsonId}" class="hljs language-json">${highlighted}</code></pre>
                        </div>
                    `;
                } catch (error) {
                    console.error('处理JSON失败:', error);
                    // 解析失败时使用普通代码块
                    return '<pre><code class="hljs json">' + hljs.highlight(code, { language: 'json' }).value + '</code></pre>';
                }
            }
            
            // 其他代码块正常处理
            if (language && hljs.getLanguage(language)) {
                try {
                    return '<pre><code class="hljs ' + language + '">' +
                           hljs.highlight(code, { language: language }).value +
                           '</code></pre>';
                } catch (err) {}
            }
            return '<pre><code class="hljs">' + code + '</code></pre>';
        };
        
        // 自定义待办项渲染 - 这里也需要使用function关键字，访问self
        renderer.listitem = function(text) {
            const taskRegex = /^\[([ x])\] /;
            const match = text.match(taskRegex);
            
            if (match) {
                const isChecked = match[1] === 'x';
                // 使用self而不是this
                self.todoIndex++;
                
                // 使用自定义元素代替checkbox，更容易控制样式和点击效果
                return `
                    <li class="task-item" data-todo-index="${self.todoIndex - 1}">
                        <div class="custom-checkbox ${isChecked ? 'checked' : ''}" 
                             onclick="window.toggleTodoItem(this.closest('.task-item').getAttribute('data-line'), !this.classList.contains('checked')); this.classList.toggle('checked'); return false;">
                            <div class="checkbox-inner"></div>
                        </div>
                        <span class="task-text" onclick="var checkbox = this.previousElementSibling; checkbox.click();">${text.replace(taskRegex, '')}</span>
                    </li>`;
            }
            return originalListitem.call(this, text);
        };

        // 设置marked选项
        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: false,  // 设置为false，避免自动插入<br>
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            xhtml: false
        });
        
        // 添加简洁JSON样式和交互功能
        const style = document.createElement('style');
        style.textContent = `
            .json-container {
                position: relative;
                margin: 1em 0;
                overflow: hidden;
            }
            
            .json-highlight {
                margin: 0;
                padding: 0;
                background: transparent;
                overflow-x: auto;
            }
            
            .json-highlight code {
                display: block;
                padding: 1em;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 14px;
                line-height: 1.5;
                background-color: rgba(0, 0, 0, 0.03);
                border-radius: 3px;
            }
            
            /* 操作按钮样式 */
            .json-actions {
                position: absolute;
                top: 5px;
                right: 5px;
                display: flex;
                gap: 5px;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 10;
            }
            
            .json-container:hover .json-actions {
                opacity: 1;
            }
            
            .json-action-btn {
                background: rgba(255, 255, 255, 0.85);
                color: #333;
                border: 1px solid #ddd;
                border-radius: 3px;
                padding: 2px 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .json-action-btn:hover {
                background: rgba(240, 240, 240, 1);
                border-color: #ccc;
            }
            
            /* 折叠状态 */
            .json-folded .json-fold-node {
                display: none;
            }
            
            /* 折叠行 */
            .json-fold-toggle {
                cursor: pointer;
                color: #666;
                user-select: none;
                display: inline-block;
                width: 15px;
                text-align: center;
                margin-right: 3px;
            }
            
            .json-fold-toggle:hover {
                color: #000;
                background: rgba(0,0,0,0.05);
                border-radius: 2px;
            }
            
            .json-fold-toggle.folded {
                color: #2196F3;
            }
            
            /* JSON折叠结构 */
            .json-line {
                line-height: 1.5;
                white-space: pre;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            }
            
            .json-indent {
                display: inline-block;
            }
            
            .json-fold-content {
                margin-left: 15px;
            }
            
            /* 编辑模式 */
            .json-edit-mode .json-highlight {
                display: none;
            }
            
            .json-edit-area {
                display: none;
                width: 100%;
                min-height: 200px;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 14px;
                line-height: 1.5;
                padding: 1em;
                border: 1px solid #ddd;
                border-radius: 3px;
                resize: vertical;
            }
            
            .json-edit-mode .json-edit-area {
                display: block;
            }
            
            /* JSON Path提示 */
            .json-path-info {
                font-size: 12px;
                color: #666;
                background: rgba(0, 0, 0, 0.03);
                padding: 4px 8px;
                border-radius: 3px;
                margin-bottom: 5px;
            }
            
            .json-path-info code {
                background: rgba(0, 0, 0, 0.06);
                padding: 2px 4px;
                border-radius: 2px;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            }
            
            /* JSON语法高亮样式 */
            .json-content .hljs-attr {
                color: #36a3f7;
            }
            .json-content .hljs-string {
                color: #0a9477;
            }
            .json-content .hljs-number,
            .json-content .hljs-literal {
                color: #e67e22;
            }
            .json-content .hljs-punctuation {
                color: #7f8c8d;
            }
        `;
        document.head.appendChild(style);
        
        // 添加JSON交互功能
        document.addEventListener('click', function(e) {
            // 复制按钮
            if (e.target.classList.contains('json-copy-btn')) {
                const container = e.target.closest('.json-container');
                const codeEl = container.querySelector('code');
                
                try {
                    // 获取当前显示的内容
                    let jsonText = codeEl.textContent;
                    
                    // 移除语法高亮产生的所有HTML标签
                    jsonText = jsonText.replace(/<\/?[^>]+(>|$)/g, "");
                    
                    // 尝试解析为JSON对象并格式化
                    try {
                        const jsonObj = JSON.parse(jsonText);
                        const formattedJson = JSON.stringify(jsonObj, null, 2);
                        jsonText = formattedJson; // 使用格式化后的JSON
                    } catch (parseErr) {
                        console.warn('复制时JSON解析失败，使用纯文本:', parseErr);
                        // 保持原始文本，不做格式化
                    }
                    
                    // 确保不是jsonPath表达式
                    if (jsonText.trim().startsWith('$.')) {
                        console.error('检测到可能是jsonPath表达式，不是正确的JSON数据:', jsonText);
                        throw new Error('复制数据似乎是表达式而不是JSON');
                    }
                    
                    navigator.clipboard.writeText(jsonText)
                        .then(() => {
                            e.target.innerText = '✓ 已复制';
                            setTimeout(() => {
                                e.target.innerText = '复制';
                            }, 1500);
                        })
                        .catch(err => {
                            console.error('复制失败:', err);
                            e.target.innerText = '✗ 失败';
                            setTimeout(() => {
                                e.target.innerText = '复制';
                            }, 1500);
                        });
                } catch (err) {
                    // 如果上述所有方法都失败，尝试直接从视觉上可见的内容复制
                    console.error('复制处理失败，尝试直接获取视觉内容:', err);
                    
                    // 创建一个临时textarea来获取纯文本
                    const tempTextarea = document.createElement('textarea');
                    tempTextarea.value = codeEl.innerText; // 使用innerText而不是textContent
                    document.body.appendChild(tempTextarea);
                    tempTextarea.select();
                    
                    try {
                        document.execCommand('copy');
                        e.target.innerText = '✓ 已复制';
                    } catch (clipErr) {
                        console.error('后备复制方法失败:', clipErr);
                        e.target.innerText = '✗ 失败';
                    }
                    
                    document.body.removeChild(tempTextarea);
                    setTimeout(() => {
                        e.target.innerText = '复制';
                    }, 1500);
                }
            }
            
            // 去转义按钮
            if (e.target.classList.contains('json-unescape-btn')) {
                const container = e.target.closest('.json-container');
                const codeEl = container.querySelector('code');
                
                try {
                    // 获取当前JSON
                    const currentJson = JSON.parse(codeEl.textContent);
                    
                    // 递归处理字符串去转义
                    const unescapeObject = (obj) => {
                        if (typeof obj === 'string') {
                            // 去除字符串中的转义
                            return JSON.parse(`"${obj.replace(/"/g, '\\"')}"`);
                        } else if (Array.isArray(obj)) {
                            return obj.map(item => unescapeObject(item));
                        } else if (obj !== null && typeof obj === 'object') {
                            const result = {};
                            for (const key in obj) {
                                result[key] = unescapeObject(obj[key]);
                            }
                            return result;
                        }
                        return obj;
                    };
                    
                    // 应用去转义
                    const unescaped = unescapeObject(currentJson);
                    
                    // 更新显示
                    const formatted = JSON.stringify(unescaped, null, 2);
                    const highlighted = hljs.highlight(formatted, { language: 'json' }).value;
                    codeEl.innerHTML = highlighted;
                    
                    // 更新data属性
                    container.setAttribute('data-json', JSON.stringify(formatted)
                        .replace(/&/g, '&amp;')
                        .replace(/'/g, '&apos;')
                        .replace(/"/g, '&quot;'));
                        
                    // 提示成功
                    e.target.innerText = '✓ 已处理';
                    setTimeout(() => {
                        e.target.innerText = '去转义';
                    }, 1500);
                } catch (err) {
                    console.error('去转义失败:', err);
                    e.target.innerText = '✗ 失败';
                    setTimeout(() => {
                        e.target.innerText = '去转义';
                    }, 1500);
                }
            }
            
            // 折叠按钮
            if (e.target.classList.contains('json-fold-btn')) {
                const container = e.target.closest('.json-container');
                const codeEl = container.querySelector('code');
                
                if (!container.classList.contains('json-processed-for-folding')) {
                    // 第一次点击时处理JSON结构以支持折叠
                    try {
                        const jsonString = codeEl.textContent;
                        // 解析JSON以确保有效
                        const jsonObj = JSON.parse(jsonString);
                        
                        // 处理JSON DOM
                        processFoldableJson(codeEl, jsonObj);
                        
                        // 标记为已处理
                        container.classList.add('json-processed-for-folding');
                        
                        e.target.innerText = '✓ 可折叠';
                        setTimeout(() => {
                            e.target.innerText = '折叠';
                        }, 1500);
                    } catch (err) {
                        console.error('处理折叠失败:', err);
                        e.target.innerText = '✗ 失败';
                        setTimeout(() => {
                            e.target.innerText = '折叠';
                        }, 1500);
                    }
                } else {
                    // 如果已经处理过，执行全部折叠/展开
                    const toggles = container.querySelectorAll('.json-fold-toggle');
                    const firstToggle = toggles[0];
                    
                    if (toggles.length > 0) {
                        // 检查第一个是否已折叠来决定全部操作
                        const isFolded = firstToggle && firstToggle.classList.contains('folded');
                        
                        toggles.forEach(toggle => {
                            const content = toggle.nextElementSibling;
                            if (content && content.classList.contains('json-fold-content')) {
                                if (isFolded) {
                                    // 全部展开
                                    content.style.display = '';
                                    toggle.classList.remove('folded');
                                    toggle.textContent = '-';
                                } else {
                                    // 全部折叠
                                    content.style.display = 'none';
                                    toggle.classList.add('folded');
                                    toggle.textContent = '+';
                                }
                            }
                        });
                        
                        e.target.innerText = isFolded ? '✓ 已展开' : '✓ 已折叠';
                        setTimeout(() => {
                            e.target.innerText = '折叠';
                        }, 1500);
                    }
                }
            }
            
            // 编辑按钮
            if (e.target.classList.contains('json-edit-btn')) {
                const container = e.target.closest('.json-container');
                
                if (!container.classList.contains('json-edit-mode')) {
                    // 进入编辑模式
                    const codeEl = container.querySelector('code');
                    const jsonText = codeEl.textContent;
                    
                    // 如果还没有创建编辑区域，创建一个
                    if (!container.querySelector('.json-edit-area')) {
                        const textarea = document.createElement('textarea');
                        textarea.className = 'json-edit-area';
                        textarea.value = jsonText;
                        container.appendChild(textarea);
                    }
                    
                    // 切换显示
                    container.classList.add('json-edit-mode');
                    e.target.innerText = '保存';
                } else {
                    // 保存编辑
                    const textarea = container.querySelector('.json-edit-area');
                    const codeEl = container.querySelector('code');
                    
                    try {
                        // 尝试解析JSON确保有效
                        const json = JSON.parse(textarea.value);
                        const formatted = JSON.stringify(json, null, 2);
                        
                        // 更新显示
                        const highlighted = hljs.highlight(formatted, { language: 'json' }).value;
                        codeEl.innerHTML = highlighted;
                        
                        // 更新data属性
                        container.setAttribute('data-json', JSON.stringify(formatted)
                            .replace(/&/g, '&amp;')
                            .replace(/'/g, '&apos;')
                            .replace(/"/g, '&quot;'));
                        
                        // 退出编辑模式
                        container.classList.remove('json-edit-mode');
                        e.target.innerText = '编辑';
                        
                        // 重置折叠状态
                        container.classList.remove('json-processed-for-folding');
                    } catch (err) {
                        console.error('JSON格式错误:', err);
                        alert('JSON格式错误: ' + err.message);
                    }
                }
            }
        });
    }

    /**
     * 更新预览内容
     * @param {string} content markdown内容
     * @param {Function} onTaskItemClick 待办项点击回调
     */
    update(content, onTaskItemClick) {
        content=content.replace(/\\\[/g, '$$$').replace(/\\\]/g, '$$$');
        
        // 保存回调函数
        this.onTaskItemClickCallback = onTaskItemClick;
        
        // 重置待办项索引
        this.todoIndex = 0;
        
        // 清除已有的JSON编辑器实例
        this.jsonEditorInstances.forEach(editor => {
            if (editor && editor.destroy) {
                editor.destroy();
            }
        });
        this.jsonEditorInstances = [];
        
        // 清空待处理的JSON编辑器列表
        this.pendingJsonEditors = [];
        
        // 预处理内容，处理多行公式
        // 修复多行公式处理逻辑，使用更宽松的匹配条件
        content = content.replace(/(\n|^)\$\$\s*\n([\s\S]+?)\n\s*\$\$(\n|$)/g, (match, startNewline, formula, endNewline) => {
            // 保护LaTeX换行符和其他特殊字符
            formula = formula.replace(/\\\\/g, function() { return 'LYJ_LATEX_NEWLINE_LYJ'; });
            formula = formula.replace(/\\begin\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_START_LYJ'; });
            formula = formula.replace(/\\end\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_END_LYJ'; });
            formula = formula.replace(/\\begin\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_START_LYJ'; });
            formula = formula.replace(/\\end\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_END_LYJ'; });
            formula = formula.replace(/&=/g, function() { return 'LYJ_LATEX_ALIGNMENT_LYJ'; });
            // 添加对\[和\]符号的处理
            formula = formula.replace(/\\\[/g, function() { return 'LYJ_LATEX_DISPLAY_START_LYJ'; });
            formula = formula.replace(/\\\]/g, function() { return 'LYJ_LATEX_DISPLAY_END_LYJ'; });
            
            // 确保结果有适当的换行符
            return '\n\n$$' + formula.trim() + '$$\n\n';
        });
        
        // 同样修复多行\[ ... \]公式处理逻辑
        content = content.replace(/(\n|^)\\\[\s*\n([\s\S]+?)\n\s*\\\](\n|$)/g, (match, startNewline, formula, endNewline) => {
            // 保护LaTeX换行符和其他特殊字符
            formula = formula.replace(/\\\\/g, function() { return 'LYJ_LATEX_NEWLINE_LYJ'; });
            formula = formula.replace(/\\begin\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_START_LYJ'; });
            formula = formula.replace(/\\end\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_END_LYJ'; });
            formula = formula.replace(/\\begin\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_START_LYJ'; });
            formula = formula.replace(/\\end\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_END_LYJ'; });
            formula = formula.replace(/&=/g, function() { return 'LYJ_LATEX_ALIGNMENT_LYJ'; });
            // 添加对\[和\]符号的处理
            formula = formula.replace(/\\\[/g, function() { return 'LYJ_LATEX_DISPLAY_START_LYJ'; });
            formula = formula.replace(/\\\]/g, function() { return 'LYJ_LATEX_DISPLAY_END_LYJ'; });
            
            return '\n\n\\[' + formula.trim() + '\\]\n\n';
        });
        
        // 处理单行公式，确保使用明确的捕获组引用
        content = content.replace(/\n?\$\$([\s\S]+?)\$\$\n?/g, (match, formula) => {
            return '\n\n$$' + formula + '$$\n\n';
        });
        content = content.replace(/\n?\\\[([\s\S]+?)\\\]\n?/g, (match, formula) => {
            // 保护LaTeX特殊字符
            let processedFormula = formula.replace(/\\\\/g, function() { return 'LYJ_LATEX_NEWLINE_LYJ'; });
            processedFormula = processedFormula.replace(/\\begin\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_START_LYJ'; });
            processedFormula = processedFormula.replace(/\\end\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_END_LYJ'; });
            processedFormula = processedFormula.replace(/\\begin\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_START_LYJ'; });
            processedFormula = processedFormula.replace(/\\end\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_END_LYJ'; });
            processedFormula = processedFormula.replace(/&=/g, function() { return 'LYJ_LATEX_ALIGNMENT_LYJ'; });
            processedFormula = processedFormula.replace(/\\\[/g, function() { return 'LYJ_LATEX_DISPLAY_START_LYJ'; });
            processedFormula = processedFormula.replace(/\\\]/g, function() { return 'LYJ_LATEX_DISPLAY_END_LYJ'; });
            
            return '\n\n\\[' + processedFormula.trim() + '\\]\n\n';
        });
        
        // 添加对没有被上面正则表达式匹配到的\[...\]格式公式的处理
        // 这个正则表达式更宽松，可以匹配各种情况下的\[...\]公式
        if (/^\\\[[\s\S]*?\\\]$/m.test(content)) {
            content = content.replace(/^\\\[([\s\S]*?)\\\]$/m, (match, formula) => {
                // 保护LaTeX特殊字符
                let processedFormula = formula.replace(/\\\\/g, function() { return 'LYJ_LATEX_NEWLINE_LYJ'; });
                processedFormula = processedFormula.replace(/\\begin\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_START_LYJ'; });
                processedFormula = processedFormula.replace(/\\end\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_END_LYJ'; });
                processedFormula = processedFormula.replace(/\\begin\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_START_LYJ'; });
                processedFormula = processedFormula.replace(/\\end\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_END_LYJ'; });
                processedFormula = processedFormula.replace(/&=/g, function() { return 'LYJ_LATEX_ALIGNMENT_LYJ'; });
                processedFormula = processedFormula.replace(/\\\[/g, function() { return 'LYJ_LATEX_DISPLAY_START_LYJ'; });
                processedFormula = processedFormula.replace(/\\\]/g, function() { return 'LYJ_LATEX_DISPLAY_END_LYJ'; });
                
                return '\n\n\\[' + processedFormula.trim() + '\\]\n\n';
            });
        }
        
        // 预处理行内公式 \(...\)，转换为 $...$ 格式以便更容易处理
        content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$');
        
        // 更新预览内容
        const parsedContent = marked.parse(content);
        
        // 在设置HTML前，将特殊标记替换回原始LaTeX语法
        let processedHtml = parsedContent
            .replace(/LYJ_LATEX_NEWLINE_LYJ/g, '\\\\')
            .replace(/LYJ_LATEX_ALIGN_START_LYJ/g, '\\begin{align}')
            .replace(/LYJ_LATEX_ALIGN_END_LYJ/g, '\\end{align}')
            .replace(/LYJ_LATEX_ALIGNED_START_LYJ/g, '\\begin{aligned}')
            .replace(/LYJ_LATEX_ALIGNED_END_LYJ/g, '\\end{aligned}')
            .replace(/LYJ_LATEX_ALIGNMENT_LYJ/g, '&=')
            .replace(/LYJ_LATEX_DISPLAY_START_LYJ/g, '\\[')
            .replace(/LYJ_LATEX_DISPLAY_END_LYJ/g, '\\]');
        
        this.previewElement.innerHTML = processedHtml;

        // 高亮代码块
        this.previewElement.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });

        // 渲染LaTeX公式
        if (window.renderMathInElement) {
            renderMathInElement(this.previewElement, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false,
                output: 'html',
                displayMode: true,
                strict: false,
                trust: true,  // 添加trust选项以允许更多LaTeX命令
                fleqn: false, // 允许公式左对齐
                maxExpand: 1000, // 增加maxExpand值，避免"Too many expansions"错误
                macros: {
                    "\\eqalign": "\\begin{align}", // 支持对齐环境宏
                    "\\endeqalign": "\\end{align}",
                    "\\allowbreak": "",  // 允许换行
                    "\\aligned": "\\begin{aligned}",
                    "\\endaligned": "\\end{aligned}",
                    "\\alignedat": "\\begin{alignedat}",
                    "\\endalignedat": "\\end{alignedat}"
                }
            });
        }

        // 绑定待办项行号
        const lines = content.split('\n');
        let todoLines = [];
        
        // 先收集所有待办行
        lines.forEach((line, idx) => {
            if (/^\s*-\s*\[[ x]\]/.test(line)) {
                todoLines.push({
                    lineNumber: idx,
                    text: line,
                    checked: line.includes('[x]')
                });
            }
        });
        
        // 为每个待办项绑定行号
        const taskItems = this.previewElement.querySelectorAll('.task-item');
        
        taskItems.forEach((li, idx) => {
            if (idx < todoLines.length) {
                li.setAttribute('data-line', todoLines[idx].lineNumber);
                
                // 设置初始状态
                const checkbox = li.querySelector('.custom-checkbox');
                if (checkbox) {
                    if (todoLines[idx].checked) {
                        checkbox.classList.add('checked');
                    } else {
                        checkbox.classList.remove('checked');
                    }
                }
            }
        });
    }

    /**
     * 修复常见的JSON代码问题
     */
    fixJsonCode(jsonCode) {
        // 替换单引号为双引号
        let fixed = jsonCode.replace(/'/g, '"');
        
        // 处理没有引号的键名
        fixed = fixed.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        
        // 处理末尾多余的逗号
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        
        return fixed;
    }

    /**
     * 简单的jsonPath实现，支持常见的jsonPath表达式
     * @param {Object} obj 要处理的JSON对象
     * @param {string} path jsonPath表达式
     * @returns {*} 处理后的结果
     */
    applyJsonPath(obj, path) {
        if (!path || !obj) return obj;
        
        // 剥离开头的$符号
        if (path.startsWith('$')) {
            path = path.substring(1);
        }
        
        // 空路径直接返回对象本身
        if (!path || path === '.') {
            return obj;
        }
        
        // 处理数组展开 [*]
        path = path.replace(/\[\*\]/g, '.[*]');
        
        // 区分不同的分隔符
        const segments = path.split('.')
            .filter(seg => seg.length > 0)
            .map(seg => seg.trim());
        
        let current = obj;
        
        for (let i = 0; i < segments.length; i++) {
            let segment = segments[i];
            
            // 处理数组索引访问 [0], [1], 等
            if (segment.match(/^\[\d+\]$/)) {
                const index = parseInt(segment.substring(1, segment.length - 1));
                if (Array.isArray(current) && index >= 0 && index < current.length) {
                    current = current[index];
                } else {
                    return undefined; // 索引越界或不是数组
                }
                continue;
            }
            
            // 处理数组通配符 [*]
            if (segment === '[*]') {
                if (!Array.isArray(current)) {
                    return undefined; // 不是数组
                }
                
                // 如果是最后一个段，直接返回整个数组
                if (i === segments.length - 1) {
                    return current;
                }
                
                // 否则，对数组中的每个元素应用后续的路径
                const remainingPath = segments.slice(i + 1).join('.');
                return current.map(item => this.applyJsonPath(item, remainingPath))
                    .filter(item => item !== undefined);
            }
            
            // 处理对象属性访问
            if (current && typeof current === 'object' && !Array.isArray(current)) {
                current = current[segment];
                if (current === undefined) {
                    return undefined; // 属性不存在
                }
            } else if (Array.isArray(current) && !isNaN(segment)) {
                // 支持数字作为数组索引
                const index = parseInt(segment);
                if (index >= 0 && index < current.length) {
                    current = current[index];
                } else {
                    return undefined; // 索引越界
                }
            } else {
                return undefined; // 不是对象也不是数组
            }
        }
        
        return current;
    }

    /**
     * 导出预览为图片
     */
    exportAsImage() {
        return new Promise((resolve, reject) => {
            if (!window.html2canvas) {
                const script = DOMUtils.create('script', {
                    src: 'js/lib/html2canvas.min.js'
                });
                
                script.onload = () => this.doExportImage(resolve);
                script.onerror = reject;
                
                document.body.appendChild(script);
            } else {
                this.doExportImage(resolve);
            }
        });
    }

    /**
     * 执行图片导出
     * @param {Function} resolve 
     */
    doExportImage(resolve) {
        html2canvas(this.previewElement, {
            backgroundColor: '#fff'
        }).then(canvas => {
            resolve(canvas.toDataURL('image/png'));
        });
    }
} 