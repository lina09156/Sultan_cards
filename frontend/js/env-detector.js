// frontend/js/env-detector.js

/**
 * Определение окружения запуска приложения
 */

export const EnvType = {
    STANDALONE: 'standalone',
    VK_MINI_APP: 'vk_mini_app',
    VK_IFRAME: 'vk_iframe',
    UNKNOWN: 'unknown'
};

export class EnvironmentDetector {
    constructor() {
        this.env = EnvType.UNKNOWN;
        this.vkData = null;
        this.isVkBridgeAvailable = false;
    }

    /**
     * Определение текущего окружения
     */
    detect() {
        // Проверка через URL параметры
        const urlParams = new URLSearchParams(window.location.search);
        const hasVkUserId = urlParams.has('vk_user_id');
        const hasVkAccessToken = urlParams.has('vk_access_token_settings');
        
        // Проверка через User Agent
        const userAgent = navigator.userAgent;
        const isVkUserAgent = userAgent.includes('VK');
        
        // Проверка через iframe
        const isInIframe = window !== window.top;
        const isVkReferer = document.referrer.includes('vk.com');
        
        // Проверка наличия VK Bridge
        const hasVkBridge = typeof window.vkBridge !== 'undefined' || 
                           typeof window.vkBridge !== 'undefined';
        
        if (hasVkUserId || hasVkAccessToken || (isVkUserAgent && isInIframe)) {
            this.env = EnvType.VK_MINI_APP;
            this.vkData = { userId: urlParams.get('vk_user_id') };
            return this.env;
        }
        
        if (isVkReferer && isInIframe) {
            this.env = EnvType.VK_IFRAME;
            return this.env;
        }
        
        this.env = EnvType.STANDALONE;
        return this.env;
    }

    /**
     * Является ли VK окружением
     */
    isVkEnvironment() {
        return this.env === EnvType.VK_MINI_APP || this.env === EnvType.VK_IFRAME;
    }

    /**
     * Получить VK ID пользователя (если доступен)
     */
    getVkUserId() {
        if (this.vkData?.userId) return this.vkData.userId;
        
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('vk_user_id');
    }

    /**
     * Показать сообщение в зависимости от окружения
     */
    getEnvironmentMessage() {
        switch (this.env) {
            case EnvType.VK_MINI_APP:
                return '🎮 Игра запущена в VK Mini App';
            case EnvType.VK_IFRAME:
                return '🎮 Игра запущена на VK';
            case EnvType.STANDALONE:
                return '🎮 Автономный режим';
            default:
                return '🎮 Режим не определен';
        }
    }
}

// Создаем глобальный экземпляр
window.envDetector = new EnvironmentDetector();
window.envDetector.detect();

console.log(window.envDetector.getEnvironmentMessage());