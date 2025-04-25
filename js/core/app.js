import { Editor } from './editor.js';
import { PreviewManager } from '../modules/preview.js';
import { TodoManager } from '../modules/todo.js';
import { ShortcutManager } from '../modules/shortcuts.js';
import { SettingsManager } from '../modules/settings.js';
import { HistoryManager } from '../modules/history.js';
import { DOMUtils } from '../utils/dom.js';
import { CSS_CLASSES, DOM_IDS, STORAGE_KEYS } from './config.js';
import { StorageUtils } from '../utils/storage.js';

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
        
        // 缓存常用DOM元素
        this.domCache = {
            container: DOMUtils.get('.container'),
            fullscreenToolbar: DOMUtils.get('.fullscreen-toolbar'),
            togglePreviewBtn: DOMUtils.get('#togglePreviewBtn'),
            onlyPreviewBtn: DOMUtils.get('#onlyPreviewBtn'),
            historyDotsContainer: DOMUtils.get('#historyDots'),
            helpPanel: DOMUtils.get('#' + DOM_IDS.HELP_PANEL)
        };
        
        // 移除初始加载类
        document.body.classList.remove('initial-load');
        
        // 从本地存储恢复视图模式
        const savedViewMode = StorageUtils.get(STORAGE_KEYS.VIEW_MODE);
        
        // 如果没有保存的视图模式，默认进入编辑全屏模式
        if (!savedViewMode) {
            if (this.domCache.container && !this.domCache.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
                this.domCache.container.classList.add(CSS_CLASSES.FULLSCREEN);
                this.domCache.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
                document.body.classList.add('fullscreen-mode');
            }
        }
        
        // 预览更新防抖计时器
        this.previewUpdateTimeout = null;
        
        // 创建绑定方法的引用，避免重复创建函数
        this.boundTodoCallback = this.todoCallback.bind(this);
        this.boundCloseHelpPanel = this.closeHelpPanel.bind(this);
        
        this.init();
    }

    /**
     * 待办项回调函数
     */
    todoCallback(lineIndex, checked) {
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
    }

    /**
     * 初始化应用
     */
    init() {
        // 显示全屏工具栏
        this.showFullscreenToolbar();
        if (this.domCache.togglePreviewBtn) {
            this.domCache.togglePreviewBtn.innerText = '显示预览';
        }
        
        // 首先初始化核心功能：编辑器和预览
        this.editor = new Editor(DOM_IDS.EDITOR);
        this.preview = new PreviewManager(DOM_IDS.PREVIEW);
        
        // 恢复视图模式
        this.restoreViewMode();
        
        // 绑定事件
        this.bindEvents();
        
        // 延迟加载非核心功能
        setTimeout(() => {
            this.todo = new TodoManager();
            this.settings = new SettingsManager(this.editor);
            this.history = new HistoryManager();
            this.shortcuts = new ShortcutManager();
            
            // 注册快捷键
            this.registerShortcuts();
            
            // 渲染历史记录点
            this.renderHistoryDots();
        }, 100);
    }

    /**
     * 恢复视图模式
     */
    restoreViewMode() {
        const savedViewMode = StorageUtils.get(STORAGE_KEYS.VIEW_MODE);
        if (!savedViewMode) return;
        
        // 清除所有视图相关的类
        this.domCache.container.classList.remove(CSS_CLASSES.FULLSCREEN);
        this.domCache.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
        this.domCache.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
        document.body.classList.remove('fullscreen-mode');
        
        // 根据保存的模式设置视图
        if (savedViewMode.isFullscreen) {
            this.domCache.container.classList.add(CSS_CLASSES.FULLSCREEN);
            document.body.classList.add('fullscreen-mode');
            this.showFullscreenToolbar();
            
            if (savedViewMode.hidePreview) {
                this.domCache.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
                this.updateFullscreenButtons('循环视图模式', '显示预览');
            } else if (savedViewMode.onlyPreview) {
                this.domCache.container.classList.add(CSS_CLASSES.ONLY_PREVIEW);
                this.updateFullscreenButtons('循环视图模式', '显示编辑器');
            } else {
                this.updateFullscreenButtons('循环视图模式', '隐藏预览');
            }
        } else {
            this.removeFullscreenToolbar();
        }
    }

    /**
     * 渲染历史记录点
     */
    renderHistoryDots() {
        if (!this.history) return;
        
        const historyDotsContainer = this.domCache.historyDotsContainer;
        if (!historyDotsContainer) return;

        const count = this.history.getHistoryCount();
        const currentIndex = this.history.getCurrentIndex();
        const existingDots = historyDotsContainer.children.length;
        
        // 优化DOM操作：只更新变化的部分
        if (existingDots > count) {
            // 移除多余的点
            while (historyDotsContainer.children.length > count) {
                historyDotsContainer.removeChild(historyDotsContainer.lastChild);
            }
        } else if (existingDots < count) {
            // 只添加新的点
            const fragment = document.createDocumentFragment();
            for (let i = existingDots; i < count; i++) {
                const dot = DOMUtils.create('span', {
                    className: `history-dot${i === currentIndex ? ' active' : ''}`,
                    title: `历史记录 ${i + 1}`
                });
                
                // 绑定点击事件
                dot.addEventListener('click', () => this.loadHistory(i));
                
                fragment.appendChild(dot);
            }
            historyDotsContainer.appendChild(fragment);
        }
        
        // 更新活动状态
        Array.from(historyDotsContainer.children).forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    /**
     * 加载指定索引的历史记录
     * @param {number} index 
     */
    loadHistory(index) {
        if (!this.history) return;
        
        // 先保存当前内容
        const currentContent = this.editor.getContent();
        if (currentContent.trim()) {
            this.history.addHistory(currentContent);
        }
        
        // 获取并加载历史记录
        const history = this.history.getHistory(index);
        if (history) {
            this.editor.editor.setValue(history.content);
            this.editor.save();
            
            // 更新历史记录点的显示
            this.renderHistoryDots();
        }
    }

    /**
     * 创建新文档
     */
    createNewNote() {
        // 保存当前内容到历史记录
        const currentContent = this.editor.getContent();
        
        if (currentContent.trim() && this.history) {
            this.history.addHistory(currentContent);
        }

        // 清空编辑器
        this.editor.editor.setValue('');
        this.editor.save();
        
        // 更新历史记录点
        if (this.history) {
            this.renderHistoryDots();
        }
    }

    /**
     * 注册快捷键
     */
    registerShortcuts() {
        if (!this.shortcuts) return;
        
        this.shortcuts.register('toggleTodoPanel', () => this.todo && this.todo.togglePanel());
        this.shortcuts.register('quickAddTodo', () => {
            if (this.todo) {
                this.todo.openPanel();
                DOMUtils.get('#todoInput')?.focus();
            }
        });
        this.shortcuts.register('insertTodoList', () => {
            if (this.todo) {
                const todoMarkdown = this.todo.getMarkdown();
                this.editor.insertContent('\n' + todoMarkdown + '\n');
            }
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
        if (!this.domCache.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
            // 如果不在全屏模式，先进入全屏模式
            this.enterFullscreen();
            return;
        }

        // 保存编辑器位置
        if (!this.domCache.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)) {
            this.editor.lastCursor = this.editor.editor.getCursor();
        }

        // 三种模式之间循环切换
        if (!this.domCache.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW) && 
            !this.domCache.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)) {
            // 当前是双栏模式，切换到仅编辑模式
            this.domCache.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
            this.domCache.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
            this.updateFullscreenButtons('循环视图模式', '显示预览');
            setTimeout(() => this.editor.editor.focus(), 30);
        } else if (this.domCache.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW)) {
            // 当前是仅编辑模式，切换到仅预览模式
            this.domCache.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
            this.domCache.container.classList.add(CSS_CLASSES.ONLY_PREVIEW);
            this.updateFullscreenButtons('循环视图模式', '显示编辑器');
            
            // 更新预览内容
            this.updatePreviewContent();
        } else {
            // 当前是仅预览模式，切换回双栏模式
            this.domCache.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
            this.updateFullscreenButtons('循环视图模式', '隐藏预览');
            
            // 恢复编辑器光标位置
            if (this.editor.lastCursor) {
                setTimeout(() => {
                    this.editor.editor.setCursor(this.editor.lastCursor);
                    this.editor.editor.focus();
                }, 30);
            }
        }
        
        // 保存当前视图模式
        this.saveViewMode();
    }
    
    /**
     * 更新预览内容，确保待办项可点击
     */
    updatePreviewContent() {
        const content = this.editor.getContent();
        if (content) {
            this.preview.update(content, this.boundTodoCallback);
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
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
            if (this.todo) this.todo.togglePanel();
        });
        
        DOMUtils.on(DOMUtils.get('#fullscreenBtn'), 'click', () => {
            this.toggleFullscreen();
        });
        
        // 帮助按钮点击事件
        DOMUtils.on(DOMUtils.get('#helpBtn'), 'click', () => {
            this.toggleHelpPanel();
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
        
        // 编辑器内容变化时更新预览（添加防抖）
        this.editor.editor.on('change', () => {
            clearTimeout(this.previewUpdateTimeout);
            this.previewUpdateTimeout = setTimeout(() => {
                const content = this.editor.getContent();
                this.preview.update(content, this.boundTodoCallback);
            }, 300);
        });

        // 手动添加编辑器 Cmd+Enter 事件处理
        this.editor.editor.on('keydown', (cm, e) => {
            if (e.key === 'Enter' && e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
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
                this.toggleViewMode();
                e.preventDefault();
                return false;
            }
            
            // 处理Ctrl+Enter全局/非全局切换
            if (e.key === 'Enter' && e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                this.toggleFullscreen();
                e.preventDefault();
                return false;
            }
            
            // ESC键处理
            if (e.key === 'Escape' && !this.editor.isVimMode) {
                if (this.domCache.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
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
        const content = this.editor.getContent();
        if (content) {
            this.preview.update(content, this.boundTodoCallback);
        }
        
        // 绑定全屏工具栏按钮事件
        DOMUtils.on(this.domCache.togglePreviewBtn, 'click', () => {
            this.togglePreview();
        });
        
        DOMUtils.on(this.domCache.onlyPreviewBtn, 'click', () => {
            this.toggleViewMode();
        });
        
        DOMUtils.on(DOMUtils.get('#exitFullscreenBtn'), 'click', () => {
            this.exitFullscreen();
        });
    }

    /**
     * 切换全屏模式
     */
    toggleFullscreen() {
        if (!this.domCache.container.classList.contains(CSS_CLASSES.FULLSCREEN)) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    /**
     * 进入全屏模式
     */
    enterFullscreen() {
        this.domCache.container.classList.add(CSS_CLASSES.FULLSCREEN);
        document.body.classList.add('fullscreen-mode');
        this.showFullscreenToolbar();
        
        // 保存当前视图模式
        this.saveViewMode();
        
        // 进入全屏时，更新一次预览内容以确保待办项可点击
        const content = this.editor.getContent();
        if (content) {
            setTimeout(() => {
                this.preview.update(content, this.boundTodoCallback);
            }, 300);
        }
    }

    /**
     * 退出全屏模式
     */
    exitFullscreen() {
        this.domCache.container.classList.remove(CSS_CLASSES.FULLSCREEN);
        this.domCache.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
        this.domCache.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
        document.body.classList.remove('fullscreen-mode');
        this.removeFullscreenToolbar();
        
        // 保存当前视图模式
        this.saveViewMode();
        
        // 退出全屏时，更新一次预览内容以确保待办项可点击
        const content = this.editor.getContent();
        if (content) {
            setTimeout(() => {
                this.preview.update(content, this.boundTodoCallback);
            }, 300);
        }
    }

    /**
     * 保存当前视图模式
     */
    saveViewMode() {
        const viewMode = {
            isFullscreen: this.domCache.container.classList.contains(CSS_CLASSES.FULLSCREEN),
            hidePreview: this.domCache.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW),
            onlyPreview: this.domCache.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)
        };
        
        StorageUtils.set(STORAGE_KEYS.VIEW_MODE, viewMode);
    }

    /**
     * 显示全屏工具栏
     */
    showFullscreenToolbar() {
        if (this.domCache.fullscreenToolbar) {
            this.domCache.fullscreenToolbar.style.display = 'flex';
        }
    }

    /**
     * 移除全屏工具栏
     */
    removeFullscreenToolbar() {
        if (this.domCache.fullscreenToolbar) {
            this.domCache.fullscreenToolbar.style.display = 'none';
        }
    }

    /**
     * 切换预览显示
     */
    togglePreview() {
        if (this.domCache.container.classList.contains(CSS_CLASSES.ONLY_PREVIEW)) {
            // 如果当前是仅预览模式，切换到双栏模式
            this.domCache.container.classList.remove(CSS_CLASSES.ONLY_PREVIEW);
            if (this.domCache.togglePreviewBtn) {
                this.domCache.togglePreviewBtn.innerText = '隐藏预览';
            }
            
            // 保存当前视图模式
            this.saveViewMode();
            
            // 恢复焦点到编辑器
            setTimeout(() => {
                this.editor.editor.focus();
                if (this.editor.lastCursor) {
                    this.editor.editor.setCursor(this.editor.lastCursor);
                }
            }, 30);
        } else if (this.domCache.container.classList.contains(CSS_CLASSES.HIDE_PREVIEW)) {
            // 如果当前是仅编辑模式，显示预览（切换到双栏模式）
            this.domCache.container.classList.remove(CSS_CLASSES.HIDE_PREVIEW);
            if (this.domCache.togglePreviewBtn) {
                this.domCache.togglePreviewBtn.innerText = '隐藏预览';
            }
            
            // 保存当前视图模式
            this.saveViewMode();
        } else {
            // 当前是双栏模式，隐藏预览（切换到仅编辑模式）
            this.domCache.container.classList.add(CSS_CLASSES.HIDE_PREVIEW);
            if (this.domCache.togglePreviewBtn) {
                this.domCache.togglePreviewBtn.innerText = '显示预览';
            }
            
            // 保存当前视图模式
            this.saveViewMode();
            
            // 聚焦到编辑器
            setTimeout(() => this.editor.editor.focus(), 30);
        }
    }

    /**
     * 更新全屏按钮文本
     * @param {string} onlyBtnText 
     * @param {string} toggleBtnText 
     */
    updateFullscreenButtons(onlyBtnText, toggleBtnText) {
        if (this.domCache.onlyPreviewBtn) {
            this.domCache.onlyPreviewBtn.innerText = onlyBtnText;
        }
        if (this.domCache.togglePreviewBtn) {
            this.domCache.togglePreviewBtn.innerText = toggleBtnText;
        }
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

    /**
     * 切换帮助面板显示/隐藏
     */
    toggleHelpPanel() {
        const helpPanel = this.domCache.helpPanel;
        if (!helpPanel) return;
        
        if (helpPanel.style.display === 'block') {
            // 关闭帮助面板
            this.closeHelpPanel();
        } else {
            // 打开帮助面板
            this.openHelpPanel();
        }
    }
    
    /**
     * 打开帮助面板
     */
    openHelpPanel() {
        const helpPanel = this.domCache.helpPanel;
        if (!helpPanel) return;
        
        helpPanel.style.display = 'block';
        // 强制重排
        helpPanel.offsetHeight;
        helpPanel.classList.add(CSS_CLASSES.SHOW);
        
        // 绑定关闭按钮事件
        const closeBtn = DOMUtils.get('#closeHelpBtn');
        if (closeBtn) {
            // 先移除旧的事件监听，避免重复绑定
            closeBtn.removeEventListener('click', this.boundCloseHelpPanel);
            // 添加新的事件监听
            closeBtn.addEventListener('click', this.boundCloseHelpPanel);
        }
        
        // 添加ESC键监听
        document.addEventListener('keydown', this.handleHelpPanelKeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeHelpPanel();
            }
        });
        
        // 点击面板外关闭
        document.addEventListener('click', this.handleOutsideClick = (e) => {
            if (helpPanel.style.display === 'block' && 
                !helpPanel.contains(e.target) && 
                !DOMUtils.get('#helpBtn').contains(e.target)) {
                this.closeHelpPanel();
            }
        }, true);
    }
    
    /**
     * 关闭帮助面板
     */
    closeHelpPanel() {
        const helpPanel = this.domCache.helpPanel;
        if (!helpPanel) return;
        
        helpPanel.classList.remove(CSS_CLASSES.SHOW);
        setTimeout(() => {
            helpPanel.style.display = 'none';
        }, 300);
        
        // 移除事件监听
        document.removeEventListener('keydown', this.handleHelpPanelKeydown);
        document.removeEventListener('click', this.handleOutsideClick, true);
    }
} 