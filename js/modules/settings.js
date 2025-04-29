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
        this.fontFamilySelect = DOMUtils.get('#fontFamilySelect');
        this.syncFontToggle = DOMUtils.get('#syncFontToggle');
        
        this.bindEvents();
        
        // 确保编辑器完全初始化后再加载设置
        setTimeout(() => {
            this.loadSettings();
        }, 100);
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
        
        // 当页面完全加载后，再次应用字体设置，确保编辑器已初始化
        if (document.readyState === 'loading') {
            DOMUtils.on(document, 'DOMContentLoaded', () => {
                console.log('DOM加载完成，重新应用字体设置');
                // 延迟执行，确保编辑器完全初始化
                setTimeout(() => {
                    const fontFamily = this.fontFamilySelect ? this.fontFamilySelect.value : StorageUtils.get('fontFamily') || '新叶念体';
                    const syncFont = this.syncFontToggle ? this.syncFontToggle.checked : StorageUtils.get('syncFont') || false;
                    this.applyFontFamily(fontFamily, syncFont);
                }, 500);
            });
        } else {
            // 如果DOM已加载完成，则直接延迟执行
            setTimeout(() => {
                console.log('DOM已加载，直接应用字体设置');
                const fontFamily = this.fontFamilySelect ? this.fontFamilySelect.value : StorageUtils.get('fontFamily') || '新叶念体';
                const syncFont = this.syncFontToggle ? this.syncFontToggle.checked : StorageUtils.get('syncFont') || false;
                this.applyFontFamily(fontFamily, syncFont);
            }, 500);
        }
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
        
        // 加载字体设置
        const fontFamily = StorageUtils.get('fontFamily') || '新叶念体';
        if (this.fontFamilySelect) {
            this.fontFamilySelect.value = fontFamily;
        }
        
        // 加载同步字体设置
        const syncFont = StorageUtils.get('syncFont') || false;
        if (this.syncFontToggle) {
            this.syncFontToggle.checked = syncFont;
        }
        
        // 应用字体设置，传递同步标志
        this.applyFontFamily(fontFamily, syncFont);
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
        
        // 保存字体设置
        if (this.fontFamilySelect) {
            const fontFamily = this.fontFamilySelect.value;
            StorageUtils.set('fontFamily', fontFamily);
            
            // 保存同步字体设置
            const syncFont = this.syncFontToggle ? this.syncFontToggle.checked : false;
            StorageUtils.set('syncFont', syncFont);
            
            this.applyFontFamily(fontFamily, syncFont);
        }
        
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
        
        // 重置字体
        if (this.fontFamilySelect) {
            this.fontFamilySelect.value = '新叶念体';
        }
        
        // 重置同步字体设置
        if (this.syncFontToggle) {
            this.syncFontToggle.checked = false;
        }
        
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
        
        // 应用到预览区域 - 预览区域字体比编辑器大1px
        const previewElement = DOMUtils.get('#preview');
        if (previewElement) {
            previewElement.style.fontSize = `${size + 1}px`;
        }
    }
    
    /**
     * 应用字体
     * @param {string} fontFamily 字体名称
     * @param {boolean} syncToEditor 是否同步到编辑区
     */
    applyFontFamily(fontFamily, syncToEditor) {
        console.log(`应用字体 ${fontFamily}，同步到编辑区: ${syncToEditor}`);
        
        // 应用到预览区域
        const previewElement = DOMUtils.get('#preview');
        if (previewElement) {
            if (fontFamily === 'default') {
                // 使用系统默认字体
                previewElement.style.fontFamily = `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
            } else {
                // 使用自定义字体
                previewElement.style.fontFamily = `'${fontFamily}', sans-serif`;
            }
            
            // 如果需要同步到编辑区
            if (this.editor && this.editor.editor) {
                const cm = this.editor.editor;
                const wrapper = cm.getWrapperElement();
                
                if (syncToEditor) {
                    console.log(`正在同步字体 ${fontFamily} 到编辑区`);
                    // 添加自定义字体类
                    wrapper.classList.add('custom-font');
                    
                    if (fontFamily === 'default') {
                        wrapper.style.fontFamily = `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", monospace`;
                    } else {
                        wrapper.style.fontFamily = `'${fontFamily}', monospace`;
                    }
                } else {
                    // 恢复默认字体
                    wrapper.classList.remove('custom-font');
                    wrapper.style.fontFamily = `"JetBrains Mono", monospace`;
                }
                
                cm.refresh();
            } else {
                console.log('编辑器未准备好，无法应用字体');
            }
            
            // 触发自定义事件，通知PreviewManager字体已更改
            const event = new CustomEvent('fontFamilyChanged', { 
                detail: { fontFamily } 
            });
            document.dispatchEvent(event);
        }
    }
} 