import { STORAGE_KEYS } from '../core/config.js';
import { StorageUtils } from '../utils/storage.js';
import { DOMUtils } from '../utils/dom.js';

/**
 * 待办事项管理器类
 */
export class TodoManager {
    constructor() {
        this.todos = [];
        this.draggedItem = null;
        this.todoPanel = DOMUtils.get('#todoPanel');
        this.todoList = DOMUtils.get('#todoList');
        this.todoInput = DOMUtils.get('#todoInput');
        this.todoBadge = DOMUtils.get('#todoBadge');
        
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        // 加载待办事项
        this.todos = StorageUtils.get(STORAGE_KEYS.TODOS, []);
        
        // 渲染待办列表
        this.render();
        
        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 输入框回车事件
        DOMUtils.on(this.todoInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.add();
            }
        });

        // ESC关闭面板
        DOMUtils.on(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.isPanelVisible()) {
                this.closePanel();
            }
        });

        // 点击面板外关闭
        DOMUtils.on(document, 'click', (e) => {
            if (!this.todoPanel.contains(e.target) && 
                !e.target.matches('#todoBtn') && 
                this.isPanelVisible()) {
                this.closePanel();
            }
        });
    }

    /**
     * 添加待办事项
     * @param {string} text 待办内容
     */
    add(text = '') {
        text = text || this.todoInput.value.trim();
        if (text) {
            const todo = {
                id: Date.now(),
                text,
                completed: false,
                timestamp: new Date().toISOString(),
                order: this.todos.length
            };
            
            this.todos.push(todo);
            this.save();
            this.render();
            this.todoInput.value = '';
        }
    }

    /**
     * 切换待办状态
     * @param {number} id 待办ID
     */
    toggle(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.save();
            this.render();
        }
    }

    /**
     * 删除待办事项
     * @param {number} id 待办ID
     */
    delete(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.save();
        this.render();
    }

    /**
     * 保存待办列表
     */
    save() {
        StorageUtils.set(STORAGE_KEYS.TODOS, this.todos);
        this.updateBadge();
    }

    /**
     * 更新徽章
     */
    updateBadge() {
        const count = this.todos.filter(t => !t.completed).length;
        this.todoBadge.textContent = count;
        this.todoBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    /**
     * 渲染待办列表
     */
    render() {
        this.todoList.innerHTML = '';

        this.todos
            .sort((a, b) => {
                if (a.completed === b.completed) {
                    if (a.order !== undefined && b.order !== undefined) {
                        return a.order - b.order;
                    }
                    return new Date(b.timestamp) - new Date(a.timestamp);
                }
                return a.completed ? 1 : -1;
            })
            .forEach((todo, index) => {
                const item = DOMUtils.create('div', {
                    className: `todo-item ${todo.completed ? 'completed' : ''}`,
                    draggable: true,
                    'data-id': todo.id,
                    'data-index': index,
                    innerHTML: `
                        <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                        <span>${todo.text}</span>
                        <span class="delete-btn">×</span>
                    `
                });

                // 绑定事件
                const checkbox = item.querySelector('input[type="checkbox"]');
                const deleteBtn = item.querySelector('.delete-btn');

                DOMUtils.on(checkbox, 'change', () => this.toggle(todo.id));
                DOMUtils.on(deleteBtn, 'click', () => this.delete(todo.id));

                // 拖拽事件
                this.bindDragEvents(item);

                this.todoList.appendChild(item);
            });

        this.updateBadge();
    }

    /**
     * 绑定拖拽事件
     * @param {Element} item 
     */
    bindDragEvents(item) {
        DOMUtils.on(item, 'dragstart', (e) => {
            this.draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.id);
        });

        DOMUtils.on(item, 'dragend', () => {
            item.classList.remove('dragging');
            this.draggedItem = null;
            DOMUtils.getAll('.todo-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        DOMUtils.on(item, 'dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        DOMUtils.on(item, 'dragenter', () => {
            item.classList.add('drag-over');
        });

        DOMUtils.on(item, 'dragleave', () => {
            item.classList.remove('drag-over');
        });

        DOMUtils.on(item, 'drop', (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (this.draggedItem !== item) {
                const fromIndex = parseInt(this.draggedItem.dataset.index);
                const toIndex = parseInt(item.dataset.index);

                const [movedItem] = this.todos.splice(fromIndex, 1);
                this.todos.splice(toIndex, 0, movedItem);

                this.todos.forEach((todo, index) => {
                    todo.order = index;
                });

                this.save();
                this.render();
            }
        });
    }

    /**
     * 切换面板显示状态
     */
    togglePanel() {
        if (this.isPanelVisible()) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    /**
     * 打开面板
     */
    openPanel() {
        this.todoPanel.style.display = 'block';
        this.todoPanel.offsetHeight; // 强制重排
        DOMUtils.addClass(this.todoPanel, 'show');
        this.todoInput.focus();
    }

    /**
     * 关闭面板
     */
    closePanel() {
        DOMUtils.removeClass(this.todoPanel, 'show');
        setTimeout(() => {
            this.todoPanel.style.display = 'none';
        }, 300);
    }

    /**
     * 判断面板是否可见
     */
    isPanelVisible() {
        return this.todoPanel.style.display !== 'none' && this.todoPanel.style.display !== '';
    }

    /**
     * 获取待办列表Markdown文本
     */
    getMarkdown() {
        return this.todos
            .map(todo => `- [${todo.completed ? 'x' : ' '}] ${todo.text}`)
            .join('\n');
    }
} 