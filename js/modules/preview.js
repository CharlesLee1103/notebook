import { DOMUtils } from '../utils/dom.js';

/**
 * 预览管理器类
 */
export class PreviewManager {
    constructor(previewElementId) {
        this.previewElement = DOMUtils.get(`#${previewElementId}`);
        this.todoIndex = 0;
        this.onTaskItemClickCallback = null;
        
        console.log('PreviewManager 初始化', previewElementId, '找到预览元素:', !!this.previewElement);
        
        // 添加全局回调函数用于待办项点击
        window.toggleTodoItem = this.toggleTodoItem.bind(this);
        
        // 加载自定义字体
        const fontFace = new FontFace('新叶念体', 'url(../../font/新叶念体.otf)');
        fontFace.load().then((loadedFace) => {
            document.fonts.add(loadedFace);
            console.log('字体加载成功：新叶念体');
            // 添加字体样式到预览元素
            if (this.previewElement) {
                this.previewElement.style.fontFamily = "'新叶念体', sans-serif";
            }
        }).catch((error) => {
            console.error('字体加载失败：', error);
        });
        
        this.setupMarked();
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
     * 配置marked
     */
    setupMarked() {
        console.log('设置Marked解析器');
        const renderer = new marked.Renderer();
        
        // 保存原始的list和listitem渲染函数
        const originalList = renderer.list;
        const originalListitem = renderer.listitem;
        const originalParagraph = renderer.paragraph;

        // 处理独立公式
        const processMathBlock = (text) => {
            console.log('处理数学块:', text);
            // 移除开头和结尾的$符号或\[\]符号
            let processedText = text;
            processedText = processedText.replace(/^\$\$|\$\$$/g, '');
            processedText = processedText.replace(/^\\\[|\\\]$/g, '');
            console.log('处理后的数学块内容:', processedText);
            
            // 特殊处理 - 保护LaTeX换行符和其他特殊字符
            // 在经过marked处理前，先将LaTeX的特殊字符替换为特殊标记
            // 使用String.prototype.replace的函数形式，确保替换正确进行
            processedText = processedText.replace(/\\\\/g, function() { return 'LYJ_LATEX_NEWLINE_LYJ'; });
            processedText = processedText.replace(/\\begin\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_START_LYJ'; });
            processedText = processedText.replace(/\\end\{align\}/g, function() { return 'LYJ_LATEX_ALIGN_END_LYJ'; });
            processedText = processedText.replace(/\\begin\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_START_LYJ'; });
            processedText = processedText.replace(/\\end\{aligned\}/g, function() { return 'LYJ_LATEX_ALIGNED_END_LYJ'; });
            processedText = processedText.replace(/&=/g, function() { return 'LYJ_LATEX_ALIGNMENT_LYJ'; });
            // 添加对\[和\]符号的处理
            processedText = processedText.replace(/\\\[/g, function() { return 'LYJ_LATEX_DISPLAY_START_LYJ'; });
            processedText = processedText.replace(/\\\]/g, function() { return 'LYJ_LATEX_DISPLAY_END_LYJ'; });
            
            // 最终输出时，不在这里替换回，而是等到marked处理完毕后再替换
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
            console.log('处理段落文本:', text);
            
            // 检查是否是独立公式（$$ ... $$ 或 \[ ... \]）
            if (text.startsWith('$$') && text.endsWith('$$')) {
                console.log('识别为$$公式:', text);
                return processMathBlock(text);
            }
            
            if (text.startsWith('\\[') && text.endsWith('\\]')) {
                console.log('识别为\\[公式:', text);
                return processMathBlock(text);
            }
            
            // 检查是否包含$$...$$ 格式的独立公式 (在段落内)
            const displayMathRegex = /\$\$(.*?)\$\$/g;
            if (displayMathRegex.test(text)) {
                console.log('段落中包含$$公式:', text);
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
                console.log('处理了行内公式:', processedText);
                return '<p>' + processedText + '</p>';
            }
            
            console.log('使用原始段落渲染');
            return originalParagraph.call(this, text);
        };
        
        // 自定义代码块渲染
        renderer.code = function(code, language) {
            console.log('处理代码块:', { code, language });
            // 检查是否是数学公式代码块
            if (language === 'math' || language === 'latex') {
                console.log('识别为数学公式代码块');
                return processMathBlock(`$$${code}$$`);
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
        
        // 自定义待办项渲染，使用自定义的元素替代原生checkbox
        renderer.listitem = (text) => {
            const taskRegex = /^\[([ x])\] /;
            const match = text.match(taskRegex);
            
            if (match) {
                const isChecked = match[1] === 'x';
                this.todoIndex++;
                console.log('渲染待办项', this.todoIndex, text, isChecked);
                
                // 使用自定义元素代替checkbox，更容易控制样式和点击效果
                return `
                    <li class="task-item" data-todo-index="${this.todoIndex - 1}">
                        <div class="custom-checkbox ${isChecked ? 'checked' : ''}" 
                             onclick="window.toggleTodoItem(this.closest('.task-item').getAttribute('data-line'), !this.classList.contains('checked')); this.classList.toggle('checked'); return false;">
                            <div class="checkbox-inner"></div>
                        </div>
                        <span class="task-text" onclick="var checkbox = this.previousElementSibling; checkbox.click();">${text.replace(taskRegex, '')}</span>
                    </li>`;
            }
            return originalListitem.call(renderer, text);
        };

        // 自定义文本渲染，处理行内公式
        renderer.text = function(text) {
            return text;
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
        
        console.log('Marked 设置完成');
    }

    /**
     * 更新预览内容
     * @param {string} content markdown内容
     * @param {Function} onTaskItemClick 待办项点击回调
     */
    update(content, onTaskItemClick) {
        content=content.replace(/\\\[/g, '$$$').replace(/\\\]/g, '$$$');
        console.log('更新预览内容开始', '回调函数存在:', !!onTaskItemClick);
        
        // 保存回调函数
        this.onTaskItemClickCallback = onTaskItemClick;
        
        // 重置待办项索引
        this.todoIndex = 0;
        
        // 预处理内容，处理多行公式
        console.log('原始内容:', content);
        
        // 修复多行公式处理逻辑，使用更宽松的匹配条件
        content = content.replace(/(\n|^)\$\$\s*\n([\s\S]+?)\n\s*\$\$(\n|$)/g, (match, startNewline, formula, endNewline) => {
            console.log('匹配到多行公式:', match);
            console.log('公式内容:', formula);
            
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
            console.log('匹配到多行\\[公式:', match);
            console.log('公式内容:', formula);
            
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
            console.log('匹配到单行\\[公式:', match);
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
            console.log('检测到整个内容是\\[...\\]公式');
            content = content.replace(/^\\\[([\s\S]*?)\\\]$/m, (match, formula) => {
                console.log('处理整个内容是\\[公式:', formula);
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
        
        console.log('预处理后的内容:', content);
        // 更新预览内容
        console.log('解析Markdown内容');
        console.log('预处理后的内容:', content);
        
        // 不再提前替换回原始LaTeX语法，而是保留特殊标记，让marked解析
        const parsedContent = marked.parse(content);
        console.log('解析后的HTML:', parsedContent);
        
        // 在设置HTML前，将特殊标记替换回原始LaTeX语法
        let processedHtml = parsedContent
            .replace(/LYJ_LATEX_NEWLINE_LYJ/g, '\\\\')  // 这里仍然用双反斜杠，但确保它们被视为HTML字符串
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
            console.log('开始渲染数学公式');
            console.log('预览元素中的数学公式元素:', this.previewElement.querySelectorAll('.math-block, .math-inline'));
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
            console.log('数学公式渲染完成');
        } else {
            console.warn('KaTeX渲染函数不可用');
        }

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