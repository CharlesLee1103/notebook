/**
 * 本地存储工具类
 */
export class StorageUtils {
    /**
     * 获取存储的值
     * @param {string} key 键
     * @param {any} defaultValue 默认值
     * @returns {any}
     */
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return JSON.parse(value);
        } catch (error) {
            console.error('从本地存储获取数据失败:', error);
            return defaultValue;
        }
    }

    /**
     * 设置存储的值
     * @param {string} key 键
     * @param {any} value 值
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('保存数据到本地存储失败:', error);
        }
    }

    /**
     * 删除存储的值
     * @param {string} key 键
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('从本地存储删除数据失败:', error);
        }
    }

    /**
     * 清空所有存储
     */
    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('清空本地存储失败:', error);
        }
    }
} 