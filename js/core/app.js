import { Editor } from './editor.js';
import { PreviewManager } from '../modules/preview.js';
import { TodoManager } from '../modules/todo.js';
import { ShortcutManager } from '../modules/shortcuts.js';
import { SettingsManager } from '../modules/settings.js';
import { HistoryManager } from '../modules/history.js';
import { DOMUtils } from '../utils/dom.js';
import { CSS_CLASSES, DOM_IDS } from './config.js';

/**
 * 应用主类
 */
export class App {
    constructor() {
        this.editor = null;
        this.preview = null;
        this.todo = null;
        this.shortcuts = null;
        this.settings = null;
        this.history = null;
        this.container = DOMUtils.get('.container');
        
        // 移除初始加载类
        document.body.classList.remove('initial-load');
        
        // 立即进入编辑全屏模式
        if (this.container && !this.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
            this.container.classList.add(CSS_CLASSES.FULLSCREEN);
            this.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
            document.body.classList.add('fullscreen-mode');
        }
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 显示全屏工具栏
        this.showFullscreenToolbar();
        if (DOMUtils.get('#togglePreviewBtn')) {
            DOMUtils.get('#togglePreviewBtn').innerText = '显示预览';
        }
        // 初始化各个模块
        this.editor = new Editor(DOM_IDS.EDITOR);
        this.preview = new PreviewManager(DOM_IDS.PREVIEW);
        this.todo = new TodoManager();
        this.shortcuts = new ShortcutManager();
        this.settings = new SettingsManager(this.editor);
        this.history = new HistoryManager();


        // 注册快捷键
        this.registerShortcuts();
        
        // 绑定事件
        this.bindEvents();
        
        // 渲染历史记录点
        this.renderHistoryDots();
        
    }

    /**
     * 渲染历史记录点
     */
    renderHistoryDots() {
        const historyDotsContainer = DOMUtils.get('#historyDots');
        console.log('历史记录容器元素:', historyDotsContainer);
        
        if (!historyDotsContainer) {
            console.error('找不到历史记录点容器');
            return;
        }

        historyDotsContainer.innerHTML = '';
        const count = this.history.getHistoryCount();
        const currentIndex = this.history.getCurrentIndex();

        console.log('渲染历史记录点:', {
            count,
            currentIndex,
            containerExists: !!historyDotsContainer,
            containerChildren: historyDotsContainer.children.length
        });

        for (let i = 0; i < count; i++) {
            console.log(`创建第 ${i + 1} 个历史记录点`);
            const dot = DOMUtils.create('span', {
                className: `history-dot${i === currentIndex ? ' active' : ''}`,
                title: `历史记录 ${i + 1}`
            });
            
            // 单独绑定点击事件
            dot.addEventListener('click', (e) => {
                console.log('历史记录点被点击11:', {
                    index: i,
                    event: e,
                    target: e.target
                });
                this.loadHistory(i);
            });
            
            historyDotsContainer.appendChild(dot);
            console.log(`第 ${i + 1} 个历史记录点已添加到容器`);
        }
        
        console.log('历史记录点渲染完成，当前容器子元素数量:', historyDotsContainer.children.length);
    }

    /**
     * 加载指定索引的历史记录
     * @param {number} index 
     */
    loadHistory(index) {
        console.log('开始加载历史记录:', index);
        
        // 先保存当前内容
        const currentContent = this.editor.getContent();
        if (currentContent.trim()) {
            console.log('保存当前内容到历史记录');
            this.history.addHistory(currentContent);
        }
        
        // 获取并加载历史记录
        const history = this.history.getHistory(index);
        if (history) {
            console.log('成功获取历史记录:', history);
            console.log('历史记录内容长度:', history.content.length);
            console.log('历史记录内容预览:', history.content.substring(0, 100));
            
            this.editor.editor.setValue(history.content);
            this.editor.save();
            
            // 更新历史记录点的显示
            const dots = document.querySelectorAll('.history-dot');
            dots.forEach((dot, i) => {
                if (i === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
            
            // 重新渲染历史记录点
            this.renderHistoryDots();
            
            console.log('历史记录加载完成');
        } else {
            console.error('获取历史记录失败:', index);
        }
    }

    /**
     * 创建新文档
     */
    createNewNote() {
        // 保存当前内容到历史记录
        const currentContent = this.editor.getContent();
        console.log('创建新文档，当前内容长度:', currentContent.length);
        
        if (currentContent.trim()) {
            console.log('保存当前内容到历史记录');
            this.history.addHistory(currentContent);
        }

        // 清空编辑器
        this.editor.editor.setValue('');
        this.editor.save();
        
        // 移除所有点的active状态
        const dots = document.querySelectorAll('.history-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        
        // 更新历史记录点
        this.renderHistoryDots();
        
        console.log('新文档创建完成');
    }

    /**
     * 注册快捷键
     */
    registerShortcuts() {
        this.shortcuts.register('toggleTodoPanel', () => this.todo.togglePanel());
        this.shortcuts.register('quickAddTodo', () => {
            this.todo.openPanel();
            DOMUtils.get('#todoInput').focus();
        });
        this.shortcuts.register('insertTodoList', () => {
            const todoMarkdown = this.todo.getMarkdown();
            this.editor.insertContent('\n' + todoMarkdown + '\n');
        });
        this.shortcuts.register('saveNote', () => this.editor.save());
        this.shortcuts.register('exportNote', () => this.exportNote());
        this.shortcuts.register('foldCode', () => {
            this.editor.editor.foldCode(this.editor.editor.getCursor());
        });
        this.shortcuts.register('toggleFullscreen', () => this.toggleFullscreen());
        this.shortcuts.register('editorToPreview', () => this.toggleViewMode());
    }

    /**
     * 循环切换显示模式: 双栏 -> 仅编辑 -> 仅预览 -> 双栏
     */
    toggleViewMode() {
        if (!this.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
            // 如果不在全屏模式，先进入全屏模式
            this.enterFullscreen();
            return;
        }

        // 保存编辑器位置
        if (!this.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)) {
            this.editor.lastCursor = this.editor.editor.getCursor();
        }

        // 三种模式之间循环切换
        if (!this.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW) && 
            !this.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)) {
            // 当前是双栏模式，切换到仅编辑模式
            this.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
            this.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
            this.updateFullscreenButtons('仅预览全屏', '显示预览');
            setTimeout(() => this.editor.editor.focus(), 30);
        } else if (this.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW)) {
            // 当前是仅编辑模式，切换到仅预览模式
            this.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
            this.container.classList.add(CSS_CLASSES.ONLY_PREVIEW);
            this.updateFullscreenButtons('恢复双栏', '隐藏预览');
            
            // 更新预览并确保待办项可点击
            this.updatePreviewContent();
        } else {
            // 当前是仅预览模式，切换到双栏模式
            this.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
            this.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
            this.updateFullscreenButtons('仅预览全屏', '隐藏预览');
            
            // 更新预览并确保待办项可点击
            this.updatePreviewContent();
            
            setTimeout(() => {
                this.editor.editor.focus();
                if (this.editor.lastCursor) {
                    this.editor.setCursor(this.editor.lastCursor);
                }
            }, 30);
        }
    }
    
    /**
     * 更新预览内容，确保待办项可点击
     */
    updatePreviewContent() {
        const content = this.editor.getContent();
        if (content) {
            console.log('视图模式变化：更新预览内容');
            this.preview.update(content, (lineIndex, checked) => {
                console.log('视图模式变化：待办项回调被调用', lineIndex, checked);
                const doc = this.editor.editor.getDoc();
                const line = doc.getLine(lineIndex);
                if (/^\s*-\s*\[[ x]\]/.test(line)) {
                    const newLine = line.replace(
                        /(-\s*\[)[ x](\])/, 
                        `$1${checked ? 'x' : ' '}$2`
                    );
                    doc.replaceRange(newLine, 
                        {line: lineIndex, ch: 0},
                        {line: lineIndex, ch: line.length}
                    );
                }
            });
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        console.log('App - 开始绑定事件');
        
        // 绑定工具栏按钮事件
        DOMUtils.on(DOMUtils.get('#newNoteBtn'), 'click', () => {
            this.createNewNote();
        });
        
        DOMUtils.on(DOMUtils.get('#saveBtn'), 'click', () => {
            this.editor.save();
        });
        
        DOMUtils.on(DOMUtils.get('#exportBtn'), 'click', () => {
            this.exportNote();
        });
        
        DOMUtils.on(DOMUtils.get('#todoBtn'), 'click', () => {
            this.todo.togglePanel();
        });
        
        DOMUtils.on(DOMUtils.get('#fullscreenBtn'), 'click', () => {
            this.toggleFullscreen();
        });
        
        // 文件导入处理
        const fileInput = DOMUtils.get('#fileInput');
        if (fileInput) {
            DOMUtils.on(fileInput, 'change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.editor.editor.setValue(e.target.result);
                        this.editor.save();
                    };
                    reader.readAsText(file);
                }
            });
        }
        
        // 编辑器内容变化时更新预览
        this.editor.editor.on('change', () => {
            console.log('App - 编辑器内容变化事件触发');
            const content = this.editor.getContent();
            
            console.log('App - 准备更新预览内容', '内容长度:', content.length);
            this.preview.update(content, (lineIndex, checked) => {
                console.log('App - 待办项回调被调用:', lineIndex, checked);
                const doc = this.editor.editor.getDoc();
                const line = doc.getLine(lineIndex);
                console.log('App - 获取到行内容:', line);
                
                // 确保匹配到待办项格式并替换
                if (/^\s*-\s*\[[ x]\]/.test(line)) {
                    const newLine = line.replace(
                        /(-\s*\[)[ x](\])/, 
                        `$1${checked ? 'x' : ' '}$2`
                    );
                    console.log('App - 替换行内容:', '从', line, '到', newLine);
                    
                    doc.replaceRange(newLine, 
                        {line: lineIndex, ch: 0},
                        {line: lineIndex, ch: line.length}
                    );
                    console.log('App - 完成编辑器内容更新');
                } else {
                    console.warn('App - 无法匹配待办项格式:', line);
                }
            });
        });

        // 手动添加编辑器 Cmd+Enter 事件处理
        this.editor.editor.on('keydown', (cm, e) => {
            if (e.key === 'Enter' && e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                console.log('CodeMirror内部捕获到 Cmd+Enter');
                this.toggleViewMode();
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });

        // ESC键处理
        DOMUtils.on(document, 'keydown', (e) => {
            // 处理Cmd+Enter全局快捷键
            if (e.key === 'Enter' && e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                console.log('全局捕获到 Cmd+Enter');
                this.toggleViewMode();
                e.preventDefault();
                return false;
            }
            
            // 处理Ctrl+Enter全局/非全局切换
            if (e.key === 'Enter' && e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                console.log('全局捕获到 Ctrl+Enter');
                this.toggleFullscreen();
                e.preventDefault();
                return false;
            }
            
            // ESC键处理
            if (e.key === 'Escape' && !this.editor.isVimMode) {
                const container = this.container;
                if (container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
                    this.exitFullscreen();
                }
            }
        });

        // Vim模式切换按钮
        const vimToggle = DOMUtils.get('#vimToggle');
        if (vimToggle) {
            DOMUtils.on(vimToggle, 'click', () => {
                const isVimMode = this.editor.toggleVimMode();
                vimToggle.innerText = isVimMode ? 'Vim: On' : 'Vim: Off';
                vimToggle.classList.toggle(CSS_CLASSES.ACTIVE, isVimMode);
            });
            
            // 初始化按钮状态
            if (this.editor.isVimMode) {
                vimToggle.innerText = 'Vim: On';
                vimToggle.classList.add(CSS_CLASSES.ACTIVE);
            }
        }
        
        // 初始化时也要更新一次预览
        console.log('App - 初始化时触发预览更新');
        const content = this.editor.getContent();
        if (content) {
            console.log('App - 首次更新预览内容');
            this.preview.update(content, (lineIndex, checked) => {
                console.log('App - 首次更新中的待办项回调被调用:', lineIndex, checked);
                const doc = this.editor.editor.getDoc();
                const line = doc.getLine(lineIndex);
                if (/^\s*-\s*\[[ x]\]/.test(line)) {
                    const newLine = line.replace(
                        /(-\s*\[)[ x](\])/, 
                        `$1${checked ? 'x' : ' '}$2`
                    );
                    doc.replaceRange(newLine, 
                        {line: lineIndex, ch: 0},
                        {line: lineIndex, ch: line.length}
                    );
                    console.log('App - 首次更新完成待办项状态更新');
                }
            });
        }
        
        // 绑定全屏工具栏按钮事件
        DOMUtils.on(DOMUtils.get('#togglePreviewBtn'), 'click', () => {
            this.togglePreview();
        });
        
        DOMUtils.on(DOMUtils.get('#onlyPreviewBtn'), 'click', () => {
            this.toggleViewMode();
        });
        
        DOMUtils.on(DOMUtils.get('#exitFullscreenBtn'), 'click', () => {
            this.exitFullscreen();
        });
        
        console.log('App - 事件绑定完成');
    }

    /**
     * 切换全屏模式
     */
    toggleFullscreen() {
        if (!this.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    /**
     * 进入全屏模式
     */
    enterFullscreen() {
        this.container.classList.add(CSS_CLASSES.FULLSCREEN);
        document.body.classList.add('fullscreen-mode');
        this.showFullscreenToolbar();
        
        // 进入全屏时，更新一次预览内容以确保待办项可点击
        const content = this.editor.getContent();
        if (content) {
            setTimeout(() => {
                console.log('全屏模式：更新预览内容');
                this.preview.update(content, (lineIndex, checked) => {
                    console.log('全屏模式：待办项回调被调用', lineIndex, checked);
                    const doc = this.editor.editor.getDoc();
                    const line = doc.getLine(lineIndex);
                    if (/^\s*-\s*\[[ x]\]/.test(line)) {
                        const newLine = line.replace(
                            /(-\s*\[)[ x](\])/, 
                            `$1${checked ? 'x' : ' '}$2`
                        );
                        doc.replaceRange(newLine, 
                            {line: lineIndex, ch: 0},
                            {line: lineIndex, ch: line.length}
                        );
                    }
                });
            }, 300);
        }
    }

    /**
     * 退出全屏模式
     */
    exitFullscreen() {
        this.container.classList.remove(CSS_CLASSES.FULLSCREEN);
        this.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
        this.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
        document.body.classList.remove('fullscreen-mode');
        this.removeFullscreenToolbar();
        
        // 退出全屏时，更新一次预览内容以确保待办项可点击
        const content = this.editor.getContent();
        if (content) {
            setTimeout(() => {
                console.log('退出全屏模式：更新预览内容');
                this.preview.update(content, (lineIndex, checked) => {
                    console.log('退出全屏模式：待办项回调被调用', lineIndex, checked);
                    const doc = this.editor.editor.getDoc();
                    const line = doc.getLine(lineIndex);
                    if (/^\s*-\s*\[[ x]\]/.test(line)) {
                        const newLine = line.replace(
                            /(-\s*\[)[ x](\])/, 
                            `$1${checked ? 'x' : ' '}$2`
                        );
                        doc.replaceRange(newLine, 
                            {line: lineIndex, ch: 0},
                            {line: lineIndex, ch: line.length}
                        );
                    }
                });
            }, 300);
        }
    }

    /**
     * 显示全屏工具栏
     */
    showFullscreenToolbar() {
        const toolbar = DOMUtils.get('.fullscreen-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
        }
    }

    /**
     * 移除全屏工具栏
     */
    removeFullscreenToolbar() {
        const toolbar = DOMUtils.get('.fullscreen-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }

    /**
     * 切换预览显示
     */
    togglePreview() {
        const toggleBtn = DOMUtils.get('#togglePreviewBtn');
        if (this.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW)) {
            this.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
            if (toggleBtn) toggleBtn.innerText = '隐藏预览';
        } else if (!this.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)) {
            this.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
            if (toggleBtn) toggleBtn.innerText = '显示预览';
        }
    }

    /**
     * 更新全屏按钮文本
     * @param {string} onlyBtnText 
     * @param {string} toggleBtnText 
     */
    updateFullscreenButtons(onlyBtnText, toggleBtnText) {
        const onlyBtn = DOMUtils.get('#onlyPreviewBtn');
        const toggleBtn = DOMUtils.get('#togglePreviewBtn');
        if (onlyBtn) onlyBtn.innerText = onlyBtnText;
        if (toggleBtn) toggleBtn.innerText = toggleBtnText;
    }

    /**
     * 导出笔记
     */
    exportNote() {
        const content = this.editor.getContent();
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = DOMUtils.create('a', {
            href: url,
            download: `notebook_${new Date().toISOString().slice(0,10)}.md`
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
} 