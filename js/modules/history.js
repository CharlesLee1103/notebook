import { StorageUtils } from '../utils/storage.js';

/**
 * 历史记录管理器类
 */
export class HistoryManager {
    constructor() {
        this.MAX_HISTORY = 5;
        this.histories = [];
        this.currentIndex = -1;
        this.loadHistories();
    }

    /**
     * 加载历史记录
     */
    loadHistories() {
        try {
            const savedHistories = StorageUtils.get('notebook_histories', []);
            this.histories = Array.isArray(savedHistories) ? savedHistories : [];
            this.currentIndex = -1;
            console.log('加载历史记录:', this.histories);
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.histories = [];
            this.currentIndex = -1;
        }
    }

    /**
     * 保存历史记录
     */
    saveHistories() {
        try {
            StorageUtils.set('notebook_histories', this.histories);
            console.log('保存历史记录:', this.histories);
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }

    /**
     * 添加新的历史记录
     * @param {string} content 文档内容
     */
    addHistory(content) {
        if (!content || !content.trim()) {
            console.log('内容为空，不添加历史记录');
            return;
        }
        
        // 检查是否与最新的历史记录内容相同
        if (this.histories.length > 0 && this.histories[0].content === content) {
            console.log('内容与最新记录相同，不添加历史记录');
            return;
        }

        const history = {
            content: content,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };

        console.log('添加新的历史记录:', history);
        this.histories.unshift(history);
        
        // 保持最大数量限制
        if (this.histories.length > this.MAX_HISTORY) {
            this.histories = this.histories.slice(0, this.MAX_HISTORY);
        }

        this.currentIndex = -1;
        this.saveHistories();
    }

    /**
     * 获取指定索引的历史记录
     * @param {number} index 索引
     * @returns {Object|null} 历史记录对象
     */
    getHistory(index) {
        console.log('尝试获取历史记录:', {
            requestedIndex: index,
            historiesLength: this.histories.length,
            currentIndex: this.currentIndex
        });
        
        if (index >= 0 && index < this.histories.length) {
            const history = this.histories[index];
            console.log('成功获取历史记录:', {
                index,
                historyId: history.id,
                timestamp: history.timestamp,
                contentLength: history.content.length
            });
            this.currentIndex = index;
            return history;
        }
        console.error('获取历史记录失败:', {
            requestedIndex: index,
            historiesLength: this.histories.length,
            currentIndex: this.currentIndex
        });
        return null;
    }

    /**
     * 清除所有历史记录
     */
    clearHistories() {
        this.histories = [];
        this.currentIndex = -1;
        this.saveHistories();
        console.log('清除所有历史记录');
    }

    /**
     * 获取当前选中的索引
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * 获取历史记录数量
     */
    getHistoryCount() {
        return this.histories.length;
    }
} 