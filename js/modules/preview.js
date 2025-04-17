import { DOMUtils } from '../utils/dom.js';

/**
 * 预览管理器类
 */
export class PreviewManager {
    constructor(previewElementId) {
        this.previewElement = DOMUtils.get(`#${previewElementId}`);
        this.markedLoaded = false;
        this.todoIndex = 0;
        this.onTaskItemClickCallback = null;
        
        console.log('PreviewManager 初始化', previewElementId, '找到预览元素:', !!this.previewElement);
        
        // 添加全局回调函数用于待办项点击
        window.toggleTodoItem = this.toggleTodoItem.bind(this);
        
        this.init();
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
     * 初始化预览管理器
     */
    init() {
        console.log('PreviewManager 开始初始化');
        this.loadDependencies(() => {
            console.log('依赖加载完成，设置Marked');
            this.setupMarked();
        });
    }

    /**
     * 加载依赖
     * @param {Function} callback 
     */
    loadDependencies(callback) {
        console.log('开始加载依赖');
        if (this.markedLoaded) {
            console.log('依赖已加载，直接调用回调');
            callback();
            return;
        }

        // 加载marked.js
        const markedScript = DOMUtils.create('script', {
            src: 'https://cdn.bootcdn.net/ajax/libs/marked/4.0.2/marked.min.js'
        });

        markedScript.onload = () => {
            console.log('Marked.js 加载完成');
            // 加载highlight.js
            const hljsScript = DOMUtils.create('script', {
                src: 'https://cdn.bootcdn.net/ajax/libs/highlight.js/11.7.0/highlight.min.js'
            });

            hljsScript.onload = () => {
                console.log('Highlight.js 加载完成');
                this.markedLoaded = true;
                callback();
            };

            document.body.appendChild(hljsScript);
        };

        document.body.appendChild(markedScript);
    }

    /**
     * 配置marked
     */
    setupMarked() {
        console.log('设置Marked解析器');
        const renderer = new marked.Renderer();
        
        // 保存原始的listitem渲染函数
        const originalListitem = renderer.listitem;
        
        // 自定义待办项渲染，使用自定义的元素替代原生checkbox
        renderer.listitem = (text, task, checked) => {
            if (text.includes('[ ]') || text.includes('[x]')) {
                const isChecked = text.includes('[x]');
                this.todoIndex++;
                console.log('渲染待办项', this.todoIndex, text, isChecked);
                
                // 使用自定义元素代替checkbox，更容易控制样式和点击效果
                return `
                    <li class="task-item" data-todo-index="${this.todoIndex - 1}">
                        <div class="custom-checkbox ${isChecked ? 'checked' : ''}" 
                             onclick="window.toggleTodoItem(this.closest('.task-item').getAttribute('data-line'), !this.classList.contains('checked')); this.classList.toggle('checked'); return false;">
                            <div class="checkbox-inner"></div>
                        </div>
                        <span class="task-text" onclick="var checkbox = this.previousElementSibling; checkbox.click();">${text.replace(/\[([ x])\]/, '')}</span>
                    </li>`;
            }
            return originalListitem.call(renderer, text);
        };

        // 设置marked选项
        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            highlight: (code, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {}
                }
                return code;
            }
        });
        
        console.log('Marked 设置完成');
    }

    /**
     * 更新预览内容
     * @param {string} content markdown内容
     * @param {Function} onTaskItemClick 待办项点击回调
     */
    update(content, onTaskItemClick) {
        console.log('更新预览内容开始', '回调函数存在:', !!onTaskItemClick);
        
        // 保存回调函数
        this.onTaskItemClickCallback = onTaskItemClick;
        
        // 重置待办项索引
        this.todoIndex = 0;
        
        // 更新预览内容
        console.log('解析Markdown内容');
        this.previewElement.innerHTML = marked.parse(content);

        // 高亮代码块
        this.previewElement.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });

        // 绑定待办项行号
        console.log('开始绑定待办项行号');
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
        console.log('找到待办行:', todoLines.length, todoLines);
        
        // 为每个待办项绑定行号
        const taskItems = this.previewElement.querySelectorAll('.task-item');
        console.log('找到DOM中待办项元素:', taskItems.length);
        
        taskItems.forEach((li, idx) => {
            if (idx < todoLines.length) {
                li.setAttribute('data-line', todoLines[idx].lineNumber);
                console.log('设置待办项行号:', idx, todoLines[idx].lineNumber);
                
                // 设置初始状态
                const checkbox = li.querySelector('.custom-checkbox');
                if (checkbox) {
                    if (todoLines[idx].checked) {
                        checkbox.classList.add('checked');
                    } else {
                        checkbox.classList.remove('checked');
                    }
                }
            } else {
                console.warn('待办项数量不匹配，DOM元素多于待办行');
            }
        });
    }

    /**
     * 导出预览为图片
     */
    exportAsImage() {
        return new Promise((resolve, reject) => {
            if (!window.html2canvas) {
                const script = DOMUtils.create('script', {
                    src: 'https://cdn.bootcdn.net/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
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