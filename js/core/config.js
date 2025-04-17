// 编辑器配置
export const EDITOR_CONFIG = {
    mode: 'markdown',
    theme: 'monokai',
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    indentUnit: 4,
    tabSize: 4,
    autoCloseBrackets: true,
    matchBrackets: true,
    showCursorWhenSelecting: true,
    viewportMargin: Infinity,
    dragDrop: true,
    keyMap: 'default',
    extraKeys: {
        "Enter": "newlineAndIndentContinueMarkdownList"
    },
    foldOptions: {
        widget: (from, to) => {
            // 计算折叠区域的行数
            const count = to.line - from.line;
            let text = '...';
            if (count) {
                text += count + ' 行';
            }
            return text;
        }
    }
};

// 自动保存配置
export const AUTO_SAVE_CONFIG = {
    delay: 3000, // 3秒
    storageKey: 'noteContent'
};

// 默认快捷键配置
export const DEFAULT_SHORTCUTS = {
    toggleTodoPanel: { key: 't', modifiers: ['alt', 'shift'], description: '显示/隐藏待办面板' },
    quickAddTodo: { key: 'n', modifiers: ['alt', 'shift'], description: '快速添加待办' },
    insertTodoList: { key: 'l', modifiers: ['alt', 'shift'], description: '插入待办列表' },
    saveNote: { key: 's', modifiers: ['ctrl'], description: '保存笔记' },
    exportNote: { key: 'e', modifiers: ['ctrl'], description: '导出笔记' },
    foldCode: { key: 'q', modifiers: ['ctrl'], description: '折叠/展开代码块' },
    toggleFullscreen: { key: 'enter', modifiers: ['ctrl'], description: '切换全屏/非全屏模式' },
    editorToPreview: { key: 'enter', modifiers: ['meta'], description: '在三种视图模式间循环切换' }
};

// 本地存储键名
export const STORAGE_KEYS = {
    SHORTCUTS: 'shortcuts',
    TODOS: 'todos',
    NOTE_CONTENT: 'noteContent',
    VIM_MODE: 'vimMode'
};

// CSS类名常量
export const CSS_CLASSES = {
    FULLSCREEN: 'fullscreen',
    HIDE_PREVIEW: 'hide-preview',
    ONLY_PREVIEW: 'only-preview',
    SHOW: 'show',
    ACTIVE: 'active'
};

// DOM元素ID常量
export const DOM_IDS = {
    EDITOR: 'editor',
    PREVIEW: 'preview',
    TODO_PANEL: 'todoPanel',
    TODO_INPUT: 'todoInput',
    TODO_LIST: 'todoList',
    HELP_PANEL: 'helpPanel'
}; 