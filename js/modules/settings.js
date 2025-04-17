import { DOMUtils } from '../utils/dom.js';
import { StorageUtils } from '../utils/storage.js';
import { CSS_CLASSES, STORAGE_KEYS } from '../core/config.js';

/**
 * 设置管理器
 */
export class SettingsManager {
    constructor(editor) {
        this.editor = editor;
        this.settingsPanel = DOMUtils.get('#settingsPanel');
        this.settingsBtn = DOMUtils.get('#settingsBtn');
        this.closeSettingsBtn = DOMUtils.get('#closeSettingsBtn');
        this.saveSettingsBtn = DOMUtils.get('#saveSettingsBtn');
        this.resetSettingsBtn = DOMUtils.get('#resetSettingsBtn');
        this.autoSaveToggle = DOMUtils.get('#autoSaveToggle');
        this.vimModeToggle = DOMUtils.get('#vimModeToggle');
        this.fontSizeInput = DOMUtils.get('#fontSizeInput');
        
        this.bindEvents();
        this.loadSettings();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 打开设置面板
        DOMUtils.on(this.settingsBtn, 'click', () => this.openPanel());
        
        // 关闭设置面板
        DOMUtils.on(this.closeSettingsBtn, 'click', () => this.closePanel());
        
        // 保存设置
        DOMUtils.on(this.saveSettingsBtn, 'click', () => this.saveSettings());
        
        // 重置设置
        DOMUtils.on(this.resetSettingsBtn, 'click', () => this.resetSettings());
        
        // 按ESC键关闭面板
        DOMUtils.on(document, 'keydown', (e) => {
            if (e.key === 'Escape' && 
                this.settingsPanel.style.display === 'block') {
                this.closePanel();
            }
        });
    }
    
    /**
     * 打开设置面板
     */
    openPanel() {
        this.settingsPanel.style.display = 'block';
        setTimeout(() => {
            this.settingsPanel.classList.add(CSS_CLASSES.SHOW);
        }, 10);
    }
    
    /**
     * 关闭设置面板
     */
    closePanel() {
        this.settingsPanel.classList.remove(CSS_CLASSES.SHOW);
        setTimeout(() => {
            this.settingsPanel.style.display = 'none';
        }, 300);
    }
    
    /**
     * 加载设置
     */
    loadSettings() {
        // 加载Vim模式设置
        const vimMode = StorageUtils.get(STORAGE_KEYS.VIM_MODE);
        this.vimModeToggle.checked = vimMode || false;
        
        // 加载自动保存设置
        const autoSave = StorageUtils.get('autoSave');
        this.autoSaveToggle.checked = autoSave !== false; // 默认开启
        
        // 加载字体大小设置
        const fontSize = StorageUtils.get('fontSize') || 15;
        this.fontSizeInput.value = fontSize;
        this.applyFontSize(fontSize);
    }
    
    /**
     * 保存设置
     */
    saveSettings() {
        // 保存Vim模式设置
        const vimMode = this.vimModeToggle.checked;
        StorageUtils.set(STORAGE_KEYS.VIM_MODE, vimMode);
        
        // 更新Vim模式
        if (vimMode !== this.editor.isVimMode) {
            const newVimMode = this.editor.toggleVimMode();
            // 更新Vim开关按钮状态
            const vimToggle = DOMUtils.get('#vimToggle');
            if (vimToggle) {
                vimToggle.innerText = newVimMode ? 'Vim: On' : 'Vim: Off';
                vimToggle.classList.toggle(CSS_CLASSES.ACTIVE, newVimMode);
            }
        }
        
        // 保存自动保存设置
        StorageUtils.set('autoSave', this.autoSaveToggle.checked);
        
        // 保存字体大小设置
        const fontSize = parseInt(this.fontSizeInput.value) || 15;
        StorageUtils.set('fontSize', fontSize);
        this.applyFontSize(fontSize);
        
        // 关闭设置面板
        this.closePanel();
        
        // 显示保存成功提示
        this.editor.showMessage('设置已保存', 'success');
    }
    
    /**
     * 重置设置
     */
    resetSettings() {
        // 重置Vim模式
        this.vimModeToggle.checked = false;
        
        // 重置自动保存
        this.autoSaveToggle.checked = true;
        
        // 重置字体大小
        this.fontSizeInput.value = 15;
        this.applyFontSize(15);
        
        // 保存设置
        this.saveSettings();
    }
    
    /**
     * 应用字体大小
     * @param {number} size 字体大小
     */
    applyFontSize(size) {
        // 应用到编辑器
        const cm = this.editor.editor;
        cm.getWrapperElement().style.fontSize = `${size}px`;
        cm.refresh();
        
        // 应用到预览区域
        DOMUtils.get('#preview').style.fontSize = `${size}px`;
    }
} 