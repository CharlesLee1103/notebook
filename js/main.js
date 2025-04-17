import { App } from './core/app.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化应用
    window.app = new App();
}); 