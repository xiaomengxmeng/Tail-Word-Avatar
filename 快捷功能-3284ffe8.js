// ==UserScript==
// @name         鱼派快捷功能
// @version      1.7
// @description  快捷操作
// @author       Kirito
// @match        https://fishpi.cn/cr
// @grant        GM_addStyle
// @grant        GM_notification
// ==/UserScript==
// 2025-12-1 muli 优化按钮布局，三个自动换行，并添加回到顶部按钮
// 2025-12-2 muli 按钮支持配置子级按钮（目前只支持到第二层），Alt + Enter将才触发发送按钮，保留Enter换行的行为

(function() {
    'use strict';

    // 找到发送按钮
    const sendButton = document.querySelector('.green');

    // 检查是否找到了发送按钮
    if (sendButton) {
        // 给文本框添加事件监听器
        document.addEventListener('keydown', function(event) {
            // 检查是否按下了 Enter 键
            // 如果按下的是 Alt + Enter，再做干预，单独Enter 键允许默认行为（换行）
            if (event.key === 'Enter' && event.altKey) {
                event.preventDefault();  // 阻止默认行为（避免换行）

                // 调用发送按钮的点击事件
                sendButton.click();
            }
        });
    }

    // 样式增强 - 所有子按钮向上显示
    GM_addStyle(`
    #quick-actions {
        position: fixed !important;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* 每行3个，等宽按钮自动换行 */
        gap: 8px;
        background: rgba(255,255,255,0.95);
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: 1px solid #eee;
        max-width: 400px; /* 限制最大宽度 */
    }

    .cr-btn {
        position: relative !important;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        color: white !important;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 100px;
        text-align: center;
        white-space: nowrap;
        overflow: visible !important;
        text-overflow: ellipsis;
    }

    .cr-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        z-index: 10002 !important;
    }

    /* 有子按钮的父按钮悬停时，设置更高z-index */
    .cr-btn.has-sub-buttons:hover {
        z-index: 10005 !important;
    }

    /* 冷却中的按钮样式 */
    .cr-btn.cooldown,
    .sub-btn.cooldown {
        opacity: 0.7 !important;
        filter: grayscale(0.5) !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
    }

    .btn-blue { background: linear-gradient(45deg, #4dabf7, #339af0) }
    .btn-red { background: linear-gradient(45deg, #ff6b6b, #ff8787) }
    .btn-warn { background: linear-gradient(45deg, #ff922b, #ff7676) }

    /* 子按钮浮窗样式 - 全部向上显示 */
    .sub-buttons-container {
        position: absolute !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        display: none !important;
        flex-direction: column !important;
        gap: 4px !important;
        z-index: 10006 !important; /* 更高z-index确保在最上层 */
        background: rgba(255,255,255,0.95) !important;
        padding: 8px !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        border: 1px solid #ddd !important;
        min-width: 120px !important;
        pointer-events: auto !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease !important;

        /* 全部向上显示 */
        bottom: 100% !important;
        top: auto !important;
        margin-bottom: 8px !important;
        margin-top: 0 !important;
    }

    /* 三角形指示器 - 向上显示 */
    .sub-buttons-container::after {
        content: '' !important;
        position: absolute !important;
        top: 100% !important;
        bottom: auto !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        border-width: 6px !important;
        border-style: solid !important;
        border-color: rgba(255,255,255,0.95) transparent transparent transparent !important;
        filter: drop-shadow(0 2px 1px rgba(0,0,0,0.1)) !important;
    }

    .sub-buttons-container.show {
        display: flex !important;
        opacity: 1 !important;
    }

    /* 添加子按钮安全区域，防止鼠标移动到间隙时触发其他按钮 */
    .sub-buttons-container::before {
        content: '';
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        z-index: -1;
        pointer-events: auto;
    }

    .sub-btn {
        background: linear-gradient(45deg, #5c7cfa, #4263eb) !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 6px 12px !important;
        color: white !important;
        font-size: 13px !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        text-align: center !important;
        white-space: nowrap !important;
        pointer-events: auto !important;
        position: relative;
        z-index: 10007;
    }

    .sub-btn:hover {
        background: linear-gradient(45deg, #4263eb, #364fc7) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    }

    /* 被屏蔽的按钮样式 */
    .cr-btn.disabled-temp {
        pointer-events: none !important;
        opacity: 0.7;
        filter: grayscale(0.5);
    }

    #goToTopMuLi {
        position: absolute !important;
        top: -10px !important;
        left: -10px !important;
        width: 25px !important;
        height: 25px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
        border: 3px solid white !important;
        z-index: 10000 !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        animation: pulse 2s infinite !important;
    }

    #goToTopMuLi:hover {
        transform: scale(1.15) rotate(360deg) !important;
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
    }

    /* 脉冲动画 */
    @keyframes pulse {
        0% {
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        50% {
            box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6);
        }
        100% {
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
    }

    /* 添加连接线效果 */
    #quick-actions::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 5px;
        width: 2px;
        height: 10px;
        background: linear-gradient(to top, #667eea, transparent);
        z-index: 9998;
    }
`);

    // 按钮工厂 - 改进版本 可支持子按钮配置（muli）
    // 因为一些子按钮显示问题，所以很多事件都转移到js中添加了
    const buttonFactory = {
        create: (config, index) => {
            const btn = document.createElement('button');
            btn.className = `cr-btn ${config.color}`;
            btn.textContent = config.text;
            btn.dataset.index = index; // 存储索引

            let hideTimer = null;
            let showTimer = null;
            let subButtonsContainer = null;
            let disabledAboveBtn = null; // 记录被临时禁用的上方按钮

            // 如果有子按钮
            if (config.children && config.children.length > 0) {
                btn.classList.add('has-sub-buttons');

                // 创建子按钮容器
                subButtonsContainer = document.createElement('div');
                subButtonsContainer.className = 'sub-buttons-container';
                subButtonsContainer.dataset.parentIndex = index; // 存储父按钮索引

                // 添加子按钮
                config.children.forEach(childConfig => {
                    const subBtn = document.createElement('button');
                    subBtn.className = 'sub-btn';
                    subBtn.textContent = childConfig.text;
                    subBtn.onclick = async (e) => {
                        e.stopPropagation();
                        try {
                            await childConfig.action();
                            // 只冷却被点击的子按钮
                            if (childConfig.cooldown) startCooldown(subBtn, childConfig.cooldown);
                        } catch (err) {
                            subBtn.style.background = '#ff4757';
                            setTimeout(() => subBtn.style.background = '', 1000);
                        }
                    };
                    subButtonsContainer.appendChild(subBtn);
                });

                btn.appendChild(subButtonsContainer);

                // 获取上方按钮
                const getAboveButton = () => {
                    const container = document.getElementById('quick-actions');
                    if (!container) return null;

                    const currentIndex = parseInt(btn.dataset.index);
                    const aboveIndex = currentIndex - 3; // 每行3个按钮

                    if (aboveIndex >= 0) {
                        const aboveBtn = container.querySelector(`.cr-btn[data-index="${aboveIndex}"]`);
                        return aboveBtn;
                    }
                    return null;
                };

                // 临时禁用上方按钮
                const disableAboveButton = () => {
                    const aboveBtn = getAboveButton();
                    if (aboveBtn && !aboveBtn.classList.contains('disabled-temp')) {
                        aboveBtn.classList.add('disabled-temp');
                        disabledAboveBtn = aboveBtn;
                    }
                };

                // 恢复上方按钮
                const enableAboveButton = () => {
                    if (disabledAboveBtn) {
                        disabledAboveBtn.classList.remove('disabled-temp');
                        disabledAboveBtn = null;
                    }
                };

                // 鼠标事件处理 - 简化版本
                btn.addEventListener('mouseenter', (e) => {
                    clearTimeout(hideTimer);
                    clearTimeout(showTimer);

                    // 显示前先禁用上方按钮
                    disableAboveButton();

                    // 显示子按钮
                    showTimer = setTimeout(() => {
                        if (subButtonsContainer) {
                            subButtonsContainer.classList.add('show');
                        }
                    }, 100);
                });

                btn.addEventListener('mouseleave', (e) => {
                    clearTimeout(showTimer);

                    // 检查鼠标是否移动到子按钮上
                    const relatedTarget = e.relatedTarget;
                    if (!subButtonsContainer || !subButtonsContainer.contains(relatedTarget)) {
                        hideTimer = setTimeout(() => {
                            if (subButtonsContainer) {
                                subButtonsContainer.classList.remove('show');
                                enableAboveButton();
                            }
                        }, 200);
                    }
                });

                // 子按钮容器的鼠标事件
                subButtonsContainer.addEventListener('mouseenter', (e) => {
                    clearTimeout(hideTimer);
                    clearTimeout(showTimer);

                    // 确保上方按钮保持禁用状态
                    if (!disabledAboveBtn) {
                        disableAboveButton();
                    }
                });

                subButtonsContainer.addEventListener('mouseleave', (e) => {
                    const relatedTarget = e.relatedTarget;

                    // 如果鼠标移到了父按钮上，不清除禁用状态
                    if (!btn.contains(relatedTarget)) {
                        hideTimer = setTimeout(() => {
                            if (subButtonsContainer) {
                                subButtonsContainer.classList.remove('show');
                                enableAboveButton();
                            }
                        }, 150);
                    }
                });

                // 主按钮点击事件 - 只冷却父按钮
                btn.onclick = async () => {
                    try {
                        await config.action();
                        // 只冷却被点击的父按钮
                        if (config.cooldown) startCooldown(btn, config.cooldown);
                    } catch (err) {
                        btn.style.background = '#ff4757';
                        setTimeout(() => btn.style.background = '', 1000);
                    }
                };
            } else {
                // 没有子按钮的普通按钮
                btn.onclick = async () => {
                    try {
                        await config.action();
                        // 只冷却被点击的按钮
                        if (config.cooldown) startCooldown(btn, config.cooldown);
                    } catch (err) {
                        btn.style.background = '#ff4757';
                        setTimeout(() => btn.style.background = '', 1000);
                    }
                };
            }

            return btn;
        }
    };

    // 冷却系统 - 优化版本，只冷却被点击的按钮
    function startCooldown(btn, seconds) {
        const originalText = btn.textContent;
        let remaining = seconds;

        // 添加冷却样式
        btn.classList.add('cooldown');

        // 保存原始文本
        btn.dataset.originalText = originalText;

        // 开始冷却
        btn.textContent = `${originalText} (${remaining}s)`;

        const timer = setInterval(() => {
            remaining--;
            btn.textContent = `${originalText} (${remaining}s)`;

            if (remaining <= 0) {
                clearInterval(timer);
                // 恢复原始状态
                btn.textContent = originalText;
                btn.classList.remove('cooldown');
                delete btn.dataset.originalText;
            }
        }, 1000);
    }

    // 功能按钮配置
    // children 可配置第二级子按钮，目前只能支持一级按钮不支持一直嵌套（muli）
    const BUTTONS_CONFIG = [
        {
            text: "冰冰指令",
            color: "btn-blue",
            action: () => Promise.all([
                sendMsg("冰冰 去打劫"),
            ]),
            cooldown: 60,
            children: [
                {
                    text: "打劫",
                    action: () => sendMsg("冰冰 去打劫"),
                    cooldown: 60
                },
                {
                    text: "探索",
                    action: () => sendMsg("凌 去探索"),
                    cooldown: 60
                },
                {
                    text: "行行好",
                    action: () => sendMsg("鸽 行行好吧"),
                    cooldown: 60
                },
                {
                    text: "红包",
                    action: () => sendMsg(`冰冰 来个红包 ${Math.floor(Math.random()*90 + 10)}`),
                    cooldown: 60
                },
            ]
        },
        {
            text: "小斗士指令",
            color: "btn-blue",
            action: () => sendMsg("小斗士 签到"),
            cooldown: 30,
            children: [
                {
                    text: "查询积分",
                    action: () => sendMsg("小斗士 查询积分"),
                    cooldown: 60
                },
                {
                    text: "积分榜",
                    action: () => sendMsg("小斗士 查询积分榜"),
                    cooldown: 60
                },
                {
                    text: "签到",
                    action: () => sendMsg("小斗士 签到"),
                    cooldown: 60
                },
                {
                    text: "交易列表",
                    action: () => sendMsg("小斗士 交易列表"),
                    cooldown: 60
                },
                {
                    text: "爆了！",
                    action: () => {
                        var name = prompt("输入要爆的人","");
                        if (name==null) return;
                        sendMsg(`小斗士 ${name}我和你爆了`)
                    }
                }
            ]
        },
        {
            text: "清空私信",
            color: "btn-blue",
            action: () => Promise.all([
                fetchPrivate("/chat/mark-all-as-read"),
                fetchPrivate("/notifications/all-read")
            ])
        },
        {
            text: "使用免签卡",
            color: "btn-warn",
            action: () => {
                var day = prompt("输入天数","");
                if (day==null) return;
                sendMsg(`小冰 使用 免签卡_${day}`)
            },
            children: [
                {
                    text: "使用1天",
                    action: () => sendMsg("小冰 使用 免签卡_1")
                },
                {
                    text: "使用7天",
                    action: () => sendMsg("小冰 使用 免签卡_7")
                },
                {
                    text: "使用30天",
                    action: () => sendMsg("小冰 使用 免签卡_30")
                }
            ]
        },
        {
            text: "小管家指令",
            color: "btn-blue",
            action: () => Promise.all([
                sendMsg("/ 来一杯"),
                sendMsg("/ 烟花雨"),
            ]),
            cooldown: 60,
            children: [
                {
                    text: "来一杯",
                    action: () => sendMsg("/ 来一杯"),
                    cooldown: 60
                },
                {
                    text: "烟花雨",
                    action: () => sendMsg("/ 烟花雨"),
                    cooldown: 60
                },
                {
                    text: "存钱",
                    action: () => {
                        var num = prompt("输入存入金额","");
                        if (num==null) return;
                        sendMsg(`/ 存${num}`)
                    }
                },
                {
                    text: "取钱",
                    action: () => {
                        var num = prompt("输入取出金额","");
                        if (num==null) return;
                        sendMsg(`/ 取${num}`)
                    }
                }
            ]
        },
        {
            text: "快捷发言",
            color: "btn-blue",
            action: () => {
                return Promise.resolve();
            },
            children: [
                {
                    text: "颗秒",
                    action: () => sendMsg("# 颗秒！！！"),
                    cooldown: 5
                },
                {
                    text: "交税",
                    action: () => sendMsg("# 交税！！！"),
                    cooldown: 5
                },
                {
                    text: "说话",
                    action: () => sendMsg("# 说话！"),
                    cooldown: 5
                },
                {
                    text: "桀桀桀",
                    action: () => sendMsg("### 桀桀桀"),
                    cooldown: 5
                }
            ]
        }
    ];

    // 初始化
    function init() {
        const container = document.createElement("div");
        container.id = "quick-actions";
        container.align = "right";

        // 传入索引给buttonFactory
        BUTTONS_CONFIG.forEach((config, index) => {
            container.appendChild(buttonFactory.create(config, index));
        });

        document.body.appendChild(container);

        // 创建返回顶部按钮
        const goToTopBtn = document.createElement("div");
        goToTopBtn.id = "goToTopMuLi";
        goToTopBtn.title = "返回顶部";
        goToTopBtn.innerHTML = "↑";
        goToTopBtn.onclick = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };
        container.appendChild(goToTopBtn);
    }

    // 消息发送
    function sendMsg(msg) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/chat-room/send",
                type: "POST",
                data: JSON.stringify({ content: msg, client:"Web/没有午安"}),
                success: resolve,
                error: reject
            });
        });
    }

    // 私信接口
    function fetchPrivate(endpoint) {
        return fetch(`${location.origin}${endpoint}?apiKey=${Label.node.apiKey}`);
    }

    // 初始化执行
    init();
})();