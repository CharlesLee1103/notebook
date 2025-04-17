/**
 * DOM操作工具类
 */
export class DOMUtils {
    /**
     * 获取DOM元素
     * @param {string} selector 选择器
     * @returns {Element}
     */
    static get(selector) {
        return document.querySelector(selector);
    }

    /**
     * 获取多个DOM元素
     * @param {string} selector 选择器
     * @returns {NodeList}
     */
    static getAll(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * 创建DOM元素
     * @param {string} tag 标签名
     * @param {Object} props 属性对象
     * @returns {Element}
     */
    static create(tag, props = {}) {
        const element = document.createElement(tag);
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        return element;
    }

    /**
     * 添加事件监听
     * @param {Element} element DOM元素
     * @param {string} event 事件名
     * @param {Function} handler 处理函数
     * @param {Object} options 配置项
     */
    static on(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
    }

    /**
     * 移除事件监听
     * @param {Element} element DOM元素
     * @param {string} event 事件名
     * @param {Function} handler 处理函数
     */
    static off(element, event, handler) {
        element.removeEventListener(event, handler);
    }

    /**
     * 添加样式类
     * @param {Element} element DOM元素
     * @param {...string} classNames 样式类名
     */
    static addClass(element, ...classNames) {
        element.classList.add(...classNames);
    }

    /**
     * 移除样式类
     * @param {Element} element DOM元素
     * @param {...string} classNames 样式类名
     */
    static removeClass(element, ...classNames) {
        element.classList.remove(...classNames);
    }

    /**
     * 切换样式类
     * @param {Element} element DOM元素
     * @param {string} className 样式类名
     */
    static toggleClass(element, className) {
        element.classList.toggle(className);
    }
} 