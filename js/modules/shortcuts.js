import { DEFAULT_SHORTCUTS, STORAGE_KEYS } from '../core/config.js';
import { StorageUtils } from '../utils/storage.js';
import { DOMUtils } from '../utils/dom.js';

/**
 * 快捷键管理器类
 */
export class ShortcutManager {
    constructor() {
        this.shortcuts = {};
        this.handlers = {};
        
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.loadShortcuts();
        this.bindEvents();
    }

    /**
     * 加载快捷键配置
     */
    loadShortcuts() {
        try {
            const savedShortcuts = StorageUtils.get(STORAGE_KEYS.SHORTCUTS);
            this.shortcuts = savedShortcuts || { ...DEFAULT_SHORTCUTS };

            // 确保所有默认快捷键都存在
            for (const [key, value] of Object.entries(DEFAULT_SHORTCUTS)) {
                if (!this.shortcuts[key]) {
                    this.shortcuts[key] = { ...value };
                }
                // 确保每个快捷键都有必要的属性
                this.shortcuts[key].description = this.shortcuts[key].description || value.description;
                this.shortcuts[key].modifiers = this.shortcuts[key].modifiers || [...value.modifiers];
                this.shortcuts[key].key = this.shortcuts[key].key || value.key;
            }
        } catch (error) {
            console.error('加载快捷键配置失败:', error);
            this.shortcuts = { ...DEFAULT_SHORTCUTS };
        }
    }

    /**
     * 保存快捷键配置
     */
    saveShortcuts() {
        StorageUtils.set(STORAGE_KEYS.SHORTCUTS, this.shortcuts);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 全局快捷键处理
        DOMUtils.on(document, 'keydown', this.handleKeydown.bind(this));
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} e 
     */
    handleKeydown(e) {
        // 调试信息
        console.log('按键事件:', {
            key: e.key,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
        });
        
        // 检查当前按键组合
        const pressedModifiers = [];
        if (e.altKey) pressedModifiers.push('alt');
        if (e.shiftKey) pressedModifiers.push('shift');
        if (e.ctrlKey) pressedModifiers.push('ctrl');
        if (e.metaKey) pressedModifiers.push('meta');

        // 调试信息
        console.log('按下的修饰键:', pressedModifiers);

        // 检查是否匹配任何快捷键
        for (const [action, config] of Object.entries(this.shortcuts)) {
            console.log(`检查快捷键 ${action}:`, config);
            
            if (e.key.toLowerCase() === config.key.toLowerCase() &&
                config.modifiers.length === pressedModifiers.length &&
                config.modifiers.every(mod => pressedModifiers.includes(mod))) {
                
                console.log('匹配到快捷键:', action);
                e.preventDefault();
                const handler = this.handlers[action];
                if (handler) {
                    handler();
                } else {
                    console.warn('没有找到快捷键处理器:', action);
                }
                break;
            }
        }
    }

    /**
     * 注册快捷键处理函数
     * @param {string} action 动作名称
     * @param {Function} handler 处理函数
     */
    register(action, handler) {
        this.handlers[action] = handler;
    }

    /**
     * 重置所有快捷键为默认值
     */
    resetAll() {
        this.shortcuts = { ...DEFAULT_SHORTCUTS };
        this.saveShortcuts();
    }

    /**
     * 重置指定快捷键为默认值
     * @param {string} action 动作名称
     */
    reset(action) {
        if (DEFAULT_SHORTCUTS[action]) {
            this.shortcuts[action] = { ...DEFAULT_SHORTCUTS[action] };
            this.saveShortcuts();
        }
    }

    /**
     * 更新快捷键配置
     * @param {string} action 动作名称
     * @param {Object} config 配置对象
     */
    update(action, config) {
        if (this.shortcuts[action]) {
            this.shortcuts[action] = { ...this.shortcuts[action], ...config };
            this.saveShortcuts();
        }
    }

    /**
     * 格式化快捷键显示文本
     * @param {Object} config 快捷键配置
     * @returns {string}
     */
    static formatShortcut(config) {
        const modifierSymbols = {
            alt: '⌥',
            shift: '⇧',
            ctrl: '⌃',
            meta: '⌘'
        };

        const modifiers = config.modifiers.map(mod => modifierSymbols[mod] || mod);
        const key = config.key.toUpperCase();
        
        return [...modifiers, key].join(' + ');
    }

    /**
     * 获取所有快捷键配置
     * @returns {Object}
     */
    getAll() {
        return { ...this.shortcuts };
    }

    /**
     * 获取指定快捷键配置
     * @param {string} action 动作名称
     * @returns {Object}
     */
    get(action) {
        return this.shortcuts[action];
    }
} 