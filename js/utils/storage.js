/**
 * 本地存储工具类
 */
export class StorageUtils {
    /**
     * 获取存储的值
     * @param {string} key 键名
     * @param {*} defaultValue 默认值
     * @returns {*}
     */
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('获取本地存储失败:', error);
            return defaultValue;
        }
    }

    /**
     * 设置存储的值
     * @param {string} key 键名
     * @param {*} value 值
     * @returns {boolean} 是否成功
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('设置本地存储失败:', error);
            return false;
        }
    }

    /**
     * 移除存储的值
     * @param {string} key 键名
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('移除本地存储失败:', error);
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