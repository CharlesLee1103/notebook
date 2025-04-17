import { EDITOR_CONFIG, AUTO_SAVE_CONFIG, STORAGE_KEYS } from './config.js';
import { StorageUtils } from '../utils/storage.js';
import { DOMUtils } from '../utils/dom.js';

/**
 * 编辑器核心类
 */
export class Editor {
    constructor(elementId) {
        this.elementId = elementId;
        this.editor = null;
        this.autoSaveTimeout = null;
        this.lastSaveTime = Date.now();
        this.lastCursor = null;
        this.isVimMode = false;
        
        this.init();
    }

    /**
     * 初始化编辑器
     */
    init() {
        // 初始化CodeMirror编辑器
        this.editor = CodeMirror.fromTextArea(
            DOMUtils.get(`#${this.elementId}`),
            EDITOR_CONFIG
        );

        // 加载保存的内容
        const savedContent = StorageUtils.get(STORAGE_KEYS.NOTE_CONTENT);
        if (savedContent) {
            this.editor.setValue(savedContent);
        }

        // 恢复vim模式状态
        const savedVimMode = StorageUtils.get(STORAGE_KEYS.VIM_MODE);
        if (savedVimMode) {
            this.toggleVimMode();
        }

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 内容变化事件
        this.editor.on('change', () => {
            this.triggerAutoSave();
            this.updatePreview();
        });

        // 光标活动事件
        this.editor.on('cursorActivity', () => {
            this.lastCursor = this.editor.getCursor();
        });
    }

    /**
     * 触发自动保存
     */
    triggerAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(() => {
            const currentTime = Date.now();
            if (currentTime - this.lastSaveTime >= AUTO_SAVE_CONFIG.delay) {
                this.save();
                this.lastSaveTime = currentTime;
            }
        }, AUTO_SAVE_CONFIG.delay);
    }

    /**
     * 保存内容
     */
    save() {
        const content = this.editor.getValue();
        if (StorageUtils.set(STORAGE_KEYS.NOTE_CONTENT, content)) {
            this.showMessage('已保存');
        }
    }

    /**
     * 更新预览
     */
    updatePreview() {
        const content = this.editor.getValue();
        // 这里需要实现预览更新逻辑
        // 将在PreviewManager类中实现
    }

    /**
     * 切换vim模式
     */
    toggleVimMode() {
        this.isVimMode = !this.isVimMode;
        this.editor.setOption('keyMap', this.isVimMode ? 'vim' : 'default');
        StorageUtils.set(STORAGE_KEYS.VIM_MODE, this.isVimMode);
        return this.isVimMode;
    }

    /**
     * 获取编辑器内容
     */
    getContent() {
        return this.editor.getValue();
    }

    /**
     * 设置编辑器内容
     * @param {string} content 
     */
    setContent(content) {
        this.editor.setValue(content);
    }

    /**
     * 在当前光标位置插入内容
     * @param {string} content 
     */
    insertContent(content) {
        const cursor = this.editor.getCursor();
        this.editor.replaceRange(content, cursor);
    }

    /**
     * 获取当前光标位置
     */
    getCursor() {
        return this.editor.getCursor();
    }

    /**
     * 设置光标位置
     * @param {Object} pos 位置对象 {line, ch}
     */
    setCursor(pos) {
        this.editor.setCursor(pos);
    }

    /**
     * 显示消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型
     */
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = DOMUtils.create('div', {
            className: `message message-${type}`,
            innerHTML: message,
            style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                padding: '8px 16px',
                borderRadius: '4px',
                zIndex: '1000',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            }
        });

        document.body.appendChild(messageEl);

        // 显示消息
        setTimeout(() => {
            messageEl.style.opacity = '1';
        }, 0);

        // 2秒后隐藏
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => messageEl.remove(), 300);
        }, 2000);
    }
} 