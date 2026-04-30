import {createI18n} from 'vue-i18n'

// 准备翻译的语言环境信息
const messages = {
    en: {
        common: {
            comingSoon: 'Coming soon...',
        },
        home: {
            read: 'Recent Readings',
            note: 'Personal Notes',
        },
        settings: {
            general: {
                language: "Language",
                clearBookshelf: "Clear Bookshelf",
                warning: "Warning",
                confirmClear: "Are you sure you want to clear the bookshelf?",
                confirm: "Confirm",
                cancel: "Cancel",
                cleared: "Cleared",
                cancelled: "Cancelled"
            },
            shortcuts: {
                unset: 'Not set',
                record: 'Record',
                rerecord: 'Re-record',
                cancelRecord: 'Cancel',
                clear: 'Clear',
                recordPlaceholder: 'Record shortcut',
                recordingHint: 'Press shortcut',
                saved: 'Shortcut saved',
                cleared: 'Shortcut cleared',
                duplicate: 'Shortcut already in use',
                requireModifier: 'Use at least one modifier key',
                unsupportedKey: 'This key is not supported',
                saveFailed: 'Failed to save shortcut'
            },
            preferences: {
                name: 'Preferences',
                children: [
                    {
                        name: "General",
                        children: []
                    },
                    {
                        name: "Appearance",
                    },
                    {
                        name: "Shortcuts",
                        items: {
                            setting: "Settings",
                            openBook: "Open Book",
                            show: "Show",
                            exit: "Exit",
                        }
                    },
                    {
                        name: "WebDav",
                    },
                    {
                        name: "Plugins",
                    },
                    {
                        name: "About"
                    }
                ]
            },
        },
        route: {},
    },
    zh: {
        common: {
            comingSoon: '敬请期待...',
        },
        home: {
            read: '最近阅读',
            note: '我的笔记'
        },
        settings: {
            general: {
                language: "语言",
                clearBookshelf: "清空书架",
                warning: "警告",
                confirmClear: "是否要清空书架内容？",
                confirm: "确定",
                cancel: "取消",
                cleared: "已清空",
                cancelled: "已取消"
            },
            shortcuts: {
                unset: '未设置',
                record: '录制',
                rerecord: '重新录制',
                cancelRecord: '取消',
                clear: '清空',
                recordPlaceholder: '录制快捷键',
                recordingHint: '请按下快捷键',
                saved: '快捷键已保存',
                cleared: '快捷键已清空',
                duplicate: '该快捷键已被占用',
                requireModifier: '请至少包含一个修饰键',
                unsupportedKey: '当前按键不支持录制',
                saveFailed: '快捷键保存失败'
            },
            preferences: {
                name: '偏好设置',
                children: [
                    {name: "通用设置",},
                    {name: "外观",},
                    {
                        name: "快捷键",
                        items: {
                            setting: "设置",
                            openBook: "打开书籍",
                            show: "显示",
                            exit: "退出",
                        }
                    },
                    {name: "WebDav",},
                    {name: "插件",},
                    {name: "关于"},
                ]
            }

        },
        route: {},
    }
}

// 创建 i18n 实例
const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: 'en', // 默认语言
    fallbackLocale: 'en', // 备用语言
    messages // 语言包
})

export default i18n
