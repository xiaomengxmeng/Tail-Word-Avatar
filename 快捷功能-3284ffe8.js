// ==UserScript==
// @name         鱼派快捷功能cr1
// @version      2.0
// @description  快捷操作，支持拖拽和记忆位置，支持配置编辑
// @author       Kirito + muli + 18
// @match        https://fishpi.cn/cr
// @grant        GM_addStyle
// @grant        GM_notification
// ==/UserScript==
// 2025-12-1 muli 优化按钮布局，三个自动换行，并添加回到顶部按钮
// 2025-12-2 muli 按钮支持配置子级按钮（目前只支持到第二层），Alt + Enter才触发发送按钮，保留Enter换行的行为，添加muliRefresh配置，可控制触发按钮后是否刷新页面
// 2025-12-2 muli 修复：1.修复父按钮冷却文本显示问题 2.父按钮冷却时可以展开子按钮 3.提高子按钮浮窗权限级别
// 2025-12-3 muli 添加：1.拖拽功能 2.位置记忆功能 3.双击复位功能
// 2025-12-3 muli 优化：子按钮智能弹出方向，根据父按钮在屏幕位置自动调整
// 2025-12-5 muli 新增双击头像可快捷艾特，新增双击消息体可快捷引用，重构按钮工厂，支持按钮配置在线编辑
// 2025-12-5 18 优化 promptAndSend 函数 允许多占位符, 并支持默认值
// 2025-12-5 18 新增 移除小贴士功能
// 2025-12-5 18 新增 停靠按钮, 允许用户自定义停靠位置或贴边用户信息. !!! 注意, 贴靠时如果边栏消失则插件无法渲染!!!
// 2025-12-5 18 优化样式, 贴边情况下, 动态排列按钮, 在极窄边框下自动换行
// 2025-12-12 muli 新增父按钮可联动子按钮冷却功能，新增消息体右上角可快捷复读

(function () {
    'use strict';

    // ================== 配置存储键名 ==================
    const COOLDOWN_STORAGE_PREFIX = 'fishpi_cooldown_';
    const POSITION_STORAGE_KEY = 'fishpi_quick_actions_position';
    const CONFIG_STORAGE_KEY = 'fishpi_quick_actions_config';
    const DEFAULT_POSITION = { x: 20, y: 20 };

    // ================== 动作执行器 ==================
    const ActionExecutor = {
        functions: {
            sendMsg: (params) => {
                if (typeof params === 'string') {
                    return sendMsg(params);
                } else if (Array.isArray(params)) {
                    return sendMsg(params);
                }
                return Promise.reject('sendMsg参数错误');
            },
            muliRefreshPage: (params) => {
                if (typeof params === 'string') {
                    return muliRefreshPage(params);
                } else if (Array.isArray(params)) {
                    return muliRefreshPage(...params);
                } else {
                    return muliRefreshPage();
                }
            },
            fetchPrivate: (params) => {
                if (typeof params === 'string') {
                    return fetchPrivate(params);
                } else if (Array.isArray(params)) {
                    params.forEach(param => {
                        fetchPrivate(param);
                    });
                    return true;
                }
                return Promise.reject('fetchPrivate参数错误');
            },
            promptAndSend: (params) => {
                new Promise((resolve) => {
                    const input = prompt(params.promptText || '请输入', params.defaultValue || '');
                    if (input === null) {
                        resolve();
                        return;
                    }
                    try {
                        const parts = String(input).split(',').map(s => s.trim());
                        let seqIndex = 0;
                        const actionCodeFilled = params.actionCode.replace(/\${input(\d+)?}/g, (_m, n) => {
                            if (n) {
                                const pos = Number(n) - 1;
                                return (parts[pos] !== undefined) ? parts[pos] : '';
                            } else {
                                const val = (parts[seqIndex] !== undefined) ? parts[seqIndex] : '';
                                seqIndex++;
                                return val;
                            }
                        });
                        return sendMsg(actionCodeFilled);
                    } catch (err) {
                        console.error('输入+发送异常:', err);
                        resolve();
                    }
                });
            }
        },

        execute: async function (actionConfig) {
            if (!actionConfig) return;

            try {
                if (typeof actionConfig === 'function') {
                    return await actionConfig();
                }

                if (actionConfig.type && this.functions[actionConfig.type]) {
                    return await this.functions[actionConfig.type](actionConfig.params);
                }

                console.warn('未知的动作类型:', actionConfig);
                return true;
            } catch (error) {
                console.error('动作执行失败:', error);
                return Promise.reject(error);
            }
        },

        configToFunction: function (actionConfig) {
            if (typeof actionConfig === 'function') return actionConfig;

            if (!actionConfig || !actionConfig.type) {
                return () => Promise.resolve();
            }

            switch (actionConfig.type) {
                case 'sendMsg':
                    return () => sendMsg(actionConfig.params);
                case 'muliRefreshPage':
                    return () => muliRefreshPage(actionConfig.params);
                case 'fetchPrivate':
                    return () => fetchPrivate(actionConfig.params);
                case 'promptAndSend':
                    return () => this.execute(actionConfig);
                case 'customCode':
                    try {
                        return new Function('return ' + actionConfig.params)();
                    } catch (e) {
                        return () => Promise.resolve();
                    }
                default:
                    return () => Promise.resolve();
            }
        }
    };

    function saveAllCooldownStates() {
        const container = document.getElementById('quick-actions');
        if (!container) return;

        const coolingButtons = container.querySelectorAll('.cr-btn.cooldown, .sub-btn.cooldown');

        coolingButtons.forEach(btn => {
            const buttonId = btn.dataset.buttonId;
            if (!buttonId) return;

            const match = btn.textContent.match(/\((\d+)s\)/);
            if (match && match[1]) {
                const remainingSeconds = parseInt(match[1]);
                if (remainingSeconds > 0) {
                    const endTime = Date.now() + (remainingSeconds * 1000);
                    const cooldownKey = `${COOLDOWN_STORAGE_PREFIX}${buttonId}`;
                    localStorage.setItem(cooldownKey, endTime.toString());
                }
            }
        });
    }

    // ================== 序列化/反序列化工具 ==================
    const ConfigSerializer = {
        serialize: function (config) {
            return JSON.stringify(config, function (key, value) {
                if (typeof value === 'function') {
                    return ActionExecutor.functionToConfig(value);
                }

                if (value && typeof value === 'object' && value.type === 'function') {
                    return ActionExecutor.functionToConfig(value);
                }

                return value;
            }, 2);
        },

        deserialize: function (jsonString) {
            return JSON.parse(jsonString, function (key, value) {
                if (value && typeof value === 'object' && value.type) {
                    return value;
                }

                return value;
            });
        },

        migrateOldConfig: function (oldConfig) {
            return oldConfig.map(button => ({
                ...button,
                action: ActionExecutor.functionToConfig(button.action),
                children: button.children ? button.children.map(child => ({
                    ...child,
                    action: ActionExecutor.functionToConfig(child.action)
                })) : undefined
            }));
        }
    };

  // 为所有已存在的 chats__content 添加按钮
  document.querySelectorAll('.chats__content').forEach(addRepeatButton);

  // 使用 MutationObserver 监听新出现的 chats__content
  const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
          // 检查新增的节点
          mutation.addedNodes.forEach((node) => {
              
              // 如果新增的节点包含 chats__content 子元素
              if (node.nodeType === Node.ELEMENT_NODE && node.querySelectorAll) {
                  node.querySelectorAll('.chats__content').forEach(addRepeatButton);
              }
          });
      });
  });

  // 开始观察整个文档的变化
  observer.observe(document.body, {
      childList: true,
      subtree: true
  });

  // 添加复读按钮
  function addRepeatButton(contentDiv) {
      // 如果已经添加过按钮，跳过
      if (contentDiv.classList.contains('repeat-btn-added')) {
          return;
      }

      // 创建复读按钮
      const repeatBtn = document.createElement('button');
      repeatBtn.className = 'repeat-btn';
      repeatBtn.innerHTML = '↲↲';
      repeatBtn.title = '复读';
      repeatBtn.style.cssText = `
          position: absolute;
          top: 3px;
          right: 2px;
          background: rgba(191,185,185,0.5);
          border: none;
          border-radius: 3px;
          padding: 2px 6px;
          cursor: pointer;
          font-size: 12px;
          opacity: 0.7;
          transition: opacity 0.2s;
          z-index: 10;
      `;

        repeatBtn.addEventListener('mouseenter', () => {
            repeatBtn.style.opacity = '1';
        });

        repeatBtn.addEventListener('mouseleave', () => {
            repeatBtn.style.opacity = '0.7';
        });

        // 点击事件 - 提取p标签内容
        repeatBtn.addEventListener('click', function(e) {
            e.stopPropagation();

            // 找到当前 chats__content 内的 p 标签
            const pTags = contentDiv.querySelector('.vditor-reset.ft__smaller p');

            if (pTags) {

                // 获取所有 p 标签的内容
                let content = '';

                // 如果是单个 p 标签
                if (pTags.length === undefined) {
                    content = pTags.textContent || pTags.innerText;
                } else {
                    // 如果是多个 p 标签
                    content = Array.from(pTags)
                        .map(p => p.textContent || p.innerText)
                        .join('\n');
                }

                // 发送消息
                sendMsg(content.trim());

                // 推送右上角提示
                // 提取消息信息
                const messageInfo = extractMessageInfo(contentDiv);
                if (!messageInfo || !messageInfo.username || !messageInfo.messageId) {

                    return;
                }
                // 显示成功提示
                showTemporaryHint(`已复读 ${messageInfo.displayName || messageInfo.username} 的消息`);

            }
        });

        // 将按钮添加到 chats__content 中
        contentDiv.style.position = 'relative';
        contentDiv.appendChild(repeatBtn);
    }

    // ================== 默认配置 ==================
    const ORIGINAL_BUTTONS_CONFIG = [
        {
            text: "冰冰指令",
            color: "btn-blue",
            action: { type: 'sendMsg', params: '冰冰 去打劫' },
            cooldown: 60,
            children: [
                {
                    text: "打劫",
                    action: { type: 'sendMsg', params: '冰冰 去打劫' },
                    muliRefresh: true,
                    cooldown: 60
                },
                {
                    text: "行行好",
                    action: { type: 'sendMsg', params: '鸽 行行好吧' },
                    muliRefresh: true,
                    cooldown: 60
                },
                {
                    text: "红包",
                    action: {
                        type: 'promptAndSend',
                        params: {
                            promptText: '输入红包金额',
                            defaultValue: '10',
                            actionCode: '冰冰 来个红包 ${input}'
                        }
                    },
                    muliRefresh: true,
                    cooldown: 60
                },
            ]
        },
        {
            text: "小斗士指令",
            color: "btn-blue",
            action: { type: 'sendMsg', params: '小斗士 签到' },
            cooldown: 30,
            muliRefresh: true,
            children: [
                {
                    text: "查询积分",
                    action: { type: 'sendMsg', params: '小斗士 查询积分' },
                    muliRefresh: true,
                    cooldown: 30
                },
                {
                    text: "积分榜",
                    action: { type: 'sendMsg', params: '小斗士 查询积分榜' },
                    muliRefresh: true,
                    cooldown: 60
                },
                {
                    text: "负分榜",
                    action: { type: 'sendMsg', params: '小斗士 查询负分榜' },
                    muliRefresh: true,
                    cooldown: 60
                },
                {
                    text: "签到",
                    action: { type: 'sendMsg', params: '小斗士 签到' },
                    cooldown: 60
                },
                {
                    text: "交易列表",
                    action: { type: 'sendMsg', params: '小斗士 交易列表' },
                    muliRefresh: true,
                    cooldown: 60
                },
                {
                    text: "爆了！",
                    muliRefresh: true,
                    action: {
                        type: 'promptAndSend',
                        params: {
                            promptText: '输入要爆的人',
                            defaultValue: '',
                            actionCode: '小斗士 ${input}我和你爆了'
                        }
                    }
                },
                {
                    text: "桃",
                    action: { type: 'sendMsg', params: '小斗士 桃' },
                    muliRefresh: true
                },
                {
                    text: "酒",
                    action: { type: 'sendMsg', params: '小斗士 酒' },
                    muliRefresh: true
                },
            ]
        },
    	  {
            "text": "好感度",
            "color": "btn-red",
            "action": {
                "type": "promptAndSend",
                "params": {
                    "promptText": "输入 名称,好感度",
                    "defaultValue": "muli,100",
                    "actionCode": "【${input}】好感度：${input}"
                }
            },
            "cooldown": 120,
            "children": [
                {
                    "text": "还需努力",
                    "action": {
                        "type": "sendMsg",
                        "params": "*还需努力哦*"
                    },
                    "cooldown": 120
                }
            ]
        },
        {
            text: "清空私信",
            color: "btn-blue",
            action: {
                type: 'fetchPrivate',
                params: ['/chat/mark-all-as-read', '/notifications/all-read']
            }
        },

        {
            text: "小管家指令",
            color: "btn-blue",
            action: {
                type: 'sendMsg',
                params: ['/ 来一杯', '/ 烟花雨']
            },
            cooldown: 300,
            children: [
                {
                    text: "来一杯",
                    action: { type: 'sendMsg', params: '/ 来一杯' },
                    cooldown: 300
                },
                {
                    text: "烟花雨",
                    action: { type: 'sendMsg', params: '/ 烟花雨' },
                    cooldown: 300
                },
                {
                    text: "存钱",
                    action: {
                        type: 'promptAndSend',
                        params: {
                            promptText: '输入存入金额',
                            defaultValue: '',
                            actionCode: '/ 存 ${input}'
                        }
                    }
                },
                {
                    text: "取钱",
                    action: {
                        type: 'promptAndSend',
                        params: {
                            promptText: '输入取出金额',
                            defaultValue: '',
                            actionCode: '/ 取 ${input}'
                        }
                    }
                }
            ]
        },
        {
            text: "快捷发言",
            color: "btn-blue",
            action: { type: 'customCode', params: '() => Promise.resolve()' },
            children: [
                {
                    text: "慈善",
                    action: { type: 'sendMsg', params: '#### 慈善？' },
                    cooldown: 5
                },
                {
                    text: "颗秒",
                    action: { type: 'sendMsg', params: '# 颗秒！！！' },
                    cooldown: 5
                },
                {
                    text: "交税",
                    action: { type: 'sendMsg', params: '# 交税！！！' },
                    cooldown: 5
                },
                {
                    text: "说话",
                    action: { type: 'sendMsg', params: '# 说话！' },
                    cooldown: 5
                },
                {
                    text: "桀桀桀",
                    action: { type: 'sendMsg', params: '### 桀桀桀' },
                    cooldown: 5
                },
                {
                    text: "还我",
                    action: { type: 'sendMsg', params: '## 还我' },
                    cooldown: 5
                },
                {
                    text: "还有谁",
                    action: { type: 'sendMsg', params: '# 还有谁！！！' },
                    cooldown: 5
                },
                {
                    text: "分钱",
                    action: { type: 'sendMsg', params: '# 分钱！' },
                    cooldown: 5
                },
                {
                    text: "谢谢",
                    action: { type: 'sendMsg', params: '# 谢谢' },
                    cooldown: 5
                }
            ]
        },
    ];

    // 最终使用的配置
    let FINAL_BUTTONS_CONFIG = [];

    // 编辑器中的当前配置
    let activeConfig = [];

    // ================== API函数 ==================
    function sendMsg(msg) {
        if (Array.isArray(msg)) {
            var list = [];
            msg.forEach(param => {
                sendMsg(param);
            });
            return list;
        } else {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: "/chat-room/send",
                    type: "POST",
                    data: JSON.stringify({ content: msg, client: "Web/只有午安" }),
                    success: resolve,
                    error: reject
                });
            });
        }

    }

    function fetchPrivate(endpoint) {
        return fetch(`${location.origin}${endpoint}?apiKey=${Label.node.apiKey}`);
    }
    // 刷新页面
    async function muliRefreshPage(message = null, delay = 100) {
        try {
            if (message) {
                await muliShowToast(message);
            }
        } catch (err) {
            console.error("提示息失败:", err);
        }

        saveAllCooldownStates();

        const container = document.getElementById('quick-actions');
        if (container && container.dragManager) {
            container.dragManager.savePosition();
        }

        setTimeout(() => {
            location.reload();
        }, delay);
    }

    function muliShowToast(message, duration = 2000, type = 'info') {
        const oldToast = document.getElementById('muli-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'muli-toast';
        toast.innerHTML = message;

        Object.assign(toast.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '14px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '999999',
            textAlign: 'center',
            maxWidth: '80%',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'all 0.3s ease'
        });

        const typeColors = {
            success: '#51cf66',
            info: '#339af0',
            warning: '#ff922b',
            error: '#ff6b6b'
        };
        toast.style.borderLeft = `4px solid ${typeColors[type] || typeColors.info}`;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, -50%) scale(1.05)';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(0.95)';

            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, duration);
    }

    // ================== 辅助函数 ==================
    function loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
            return saved ? ConfigSerializer.deserialize(saved) : null;
        } catch (e) {
            console.error('加载配置失败:', e);
            return null;
        }
    }

    function loadUserConfig() {
        const saved = loadConfig();
        if (saved) {
            FINAL_BUTTONS_CONFIG = saved;
        } else {
            FINAL_BUTTONS_CONFIG = JSON.parse(JSON.stringify(ORIGINAL_BUTTONS_CONFIG));
        }
    }

    // 检查Alt+Enter发送消息
    const sendButton = document.querySelector('.green');
    if (sendButton) {
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && event.altKey) {
                event.preventDefault();
                sendButton.click();
            }
        });
    }

    // ================== 双击功能 ==================
    // 辅助函数：检查a标签是否包含头像
    function hasAvatar(link) {
        return link.querySelector('.avatar.tooltipped__user') !== null;
    }

    // 双击检测状态
    let lastClick = {
        element: null,
        time: 0
    };

    // 全局点击事件处理
    document.addEventListener('click', function (event) {
        //event.preventDefault();
        // 检查是否点击了a标签
        const link = event.target.closest('a');
        if (!link) return;

        // 检查a标签是否包含头像
        if (!hasAvatar(link)) return;

        // 获取头像元素
        const avatar = link.querySelector('.avatar.tooltipped__user');
        if (!avatar) return;

        // 获取当前时间
        const now = Date.now();
        event.preventDefault();
        // 检查是否为双击（300ms内点击同一a标签）
        if (lastClick.element === link && (now - lastClick.time) < 300) {
            // 双击事件：阻止跳转，插入@用户名
            event.preventDefault();
            event.stopPropagation();

            const username = avatar.getAttribute('aria-label');
            if (username) {
                // 插入到输入框
                insertToVditorInput(`@${username} `);
            }

            // 重置状态
            lastClick.element = null;
            lastClick.time = 0;
        } else {
            event.preventDefault();
            // 单击事件：记录状态
            lastClick.element = link;
            lastClick.time = now;

            // 设置超时，300ms后重置状态
            setTimeout(() => {
                if (lastClick.element === link) {
                    lastClick.element = null;
                    lastClick.time = 0;
                    window.location.href = link.href;
                }
            }, 400);
        }
    });

    // 获取活跃的输入框
    function getActiveInput() {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) return null;

        let activeInput = null;
        const irInput = chatContent.querySelector('.vditor-ir .vditor-reset[contenteditable="true"]');
        if (irInput && irInput.offsetParent) {
            activeInput = irInput;
        }

        if (!activeInput) {
            const wysiwygInput = chatContent.querySelector('.vditor-wysiwyg .vditor-reset[contenteditable="true"]');
            if (wysiwygInput && wysiwygInput.offsetParent) {
                activeInput = wysiwygInput;
            }
        }

        if (!activeInput) {
            const svInput = chatContent.querySelector('.vditor-sv .vditor-reset[contenteditable="true"]');
            if (svInput && svInput.offsetParent) {
                activeInput = svInput;
            }
        }

        return activeInput;
    }

    // 在输入框末尾插入文本，光标移动到最前面
    function insertAtEndOfVditorInput(text) {
        const activeInput = getActiveInput();
        if (!activeInput) return false;

        // 获取当前内容
        const currentContent = activeInput.textContent || '';

        // 在新内容后添加引用
        const newContent = currentContent + text;

        // 替换输入框内容
        activeInput.textContent = newContent;

        // 让输入框获得焦点
        activeInput.focus();

        // 将光标移动到最前面（第一行开头）
        const range = document.createRange();
        const selection = window.getSelection();

        // 移动到输入框的最开始位置
        range.setStart(activeInput, 0);
        range.setEnd(activeInput, 0);
        selection.removeAllRanges();
        selection.addRange(range);

        // 触发输入事件
        const inputEvent = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(inputEvent);

        return true;
    }

    // 提取消息的基本信息
    function extractMessageInfo(chatContent) {
        const chatItem = chatContent.closest('.chats__item');
        if (!chatItem) return null;

        // 获取消息ID
        const messageId = chatItem.id;

        // 获取用户名（从头像）
        const avatar = chatItem.querySelector('.avatar.tooltipped__user');
        const username = avatar ? avatar.getAttribute('aria-label') : null;

        // 获取显示名
        const userNameElement = chatContent.querySelector('#userName');
        let displayName = username; // 默认使用用户名
        if (userNameElement) {
            const userSpan = userNameElement.querySelector('span');
            if (userSpan && userSpan.textContent) {
                const match = userSpan.textContent.match(/([^(]+)\s*\(/);
                if (match && match[1]) {
                    displayName = match[1].trim();
                }
            }
        }

        return {
            messageId,
            username,
            displayName
        };
    }

    // 提取消息的HTML内容（包括嵌套引用）
    function extractMessageHTML(chatContent) {
        const vditorReset = chatContent.querySelector('.vditor-reset');
        if (!vditorReset) return null;

        // 返回内部的HTML，包括嵌套的引用
        return vditorReset.innerHTML;
    }

    // 将HTML转换为Markdown格式的引用
    function htmlToMarkdownQuote(html, currentLevel = 0) {
        // 创建一个临时元素来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 递归处理元素
        function processElement(element, level) {
            let markdown = '';
            const indent = '>'.repeat(level) + (level > 0 ? ' ' : '');

            // 遍历所有子节点
            for (let node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    // 文本节点
                    const text = node.textContent.trim();
                    if (text) {
                        markdown += indent + text + '\n';
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // 元素节点
                    const tagName = node.tagName.toLowerCase();

                    if (tagName === 'p') {
                        // 段落
                        const pContent = node.textContent.trim();
                        if (pContent) {
                            markdown += indent + pContent + '\n';
                        }
                    } else if (tagName === 'h5') {
                        // 引用标题 - 提取用户名和链接
                        const userLink = node.querySelector('a[href*="/member/"]');
                        const backLink = node.querySelector('a[href*="cr#"]');

                        let userText = '';
                        if (userLink) {
                            const ariaLabel = userLink.getAttribute('aria-label');
                            userText = ariaLabel || userLink.textContent;
                        }

                        let linkText = '';
                        if (backLink) {
                            const href = backLink.getAttribute('href');
                            const title = backLink.getAttribute('title') || '跳转至原消息';
                            linkText = `[↩](${href} "${title}")`;
                        }

                        markdown += indent + `##### 引用 @${userText} ${linkText}\n`;
                    } else if (tagName === 'blockquote') {
                        // 引用块 - 递归处理，增加层级
                        const blockquoteContent = processElement(node, level + 1);
                        markdown += blockquoteContent;
                    } else if (tagName === 'a' && node.closest('h5') === null) {
                        // 链接（不在h5中的）
                        const href = node.getAttribute('href');
                        const text = node.textContent;
                        markdown += indent + `[${text}](${href})`;
                    } else {
                        // 其他元素，递归处理
                        markdown += processElement(node, level);
                    }
                }
            }

            // 如果不是根元素，添加空行分隔
            if (level === 0 && markdown) {
                markdown += '\n';
            }

            return markdown;
        }

        return processElement(tempDiv, currentLevel);
    }

    // 生成新的引用层（在内容下方添加引用）
    function generateNewQuoteLayer(messageInfo, innerContent) {
        const { displayName, username, messageId } = messageInfo;
        const link = `https://fishpi.cn/cr#${messageId}`;
        const quotedUser = displayName || username;

        // 将内部内容每行前面添加 "> "
        const quotedContent = innerContent
            .split('\n')
            .map(line => line.trim() === '' ? '>' : `> ${line}`)
            .join('\n');

        // 引用内容添加在现有内容的后面，并在引用前加两个空行
        return `\n\n##### 引用 @${quotedUser} [↩](${link} "跳转至原消息")\n\n${quotedContent}\n`;
    }

    // 处理双击事件
    document.addEventListener('dblclick', function (event) {
        // 检查是否双击了.chats__content区域
        const chatContent = event.target.closest('.chats__content');
        if (!chatContent) return;

        // 阻止默认行为
        event.preventDefault();
        event.stopPropagation();

        // 提取消息信息
        const messageInfo = extractMessageInfo(chatContent);
        if (!messageInfo || !messageInfo.username || !messageInfo.messageId) {
            console.error('无法提取消息信息');
            return;
        }

        // 提取消息的HTML内容
        const messageHTML = extractMessageHTML(chatContent);
        if (!messageHTML) {
            console.error('无法提取消息内容');
            return;
        }

        // 将HTML转换为Markdown格式
        const markdownContent = htmlToMarkdownQuote(messageHTML);

        // 生成新的引用层
        const newQuote = generateNewQuoteLayer(messageInfo, markdownContent);

        // 在现有内容后插入引用，并将光标移动到最前面
        const success = insertAtEndOfVditorInput(newQuote);

        if (success) {
            console.log(`已添加对 ${messageInfo.displayName || messageInfo.username} 的引用`);

            // 显示成功提示
            showTemporaryHint(`已引用 ${messageInfo.displayName || messageInfo.username} 的消息`);
        }
    });

    // 显示临时提示
    function showTemporaryHint(message) {
        const hint = document.createElement('div');
        hint.textContent = message;
        hint.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            animation: fadeInOut 2s ease-in-out;
        `;

        // 添加动画
        if (!document.querySelector('#hint-animation-style')) {
            const style = document.createElement('style');
            style.id = 'hint-animation-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(hint);

        // 2秒后移除
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 2000);
    }

    // ================== 输入框操作函数 ==================
    function getActiveInput() {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) return null;

        let activeInput = null;
        const irInput = chatContent.querySelector('.vditor-ir .vditor-reset[contenteditable="true"]');
        if (irInput && irInput.offsetParent) {
            activeInput = irInput;
        }

        if (!activeInput) {
            const wysiwygInput = chatContent.querySelector('.vditor-wysiwyg .vditor-reset[contenteditable="true"]');
            if (wysiwygInput && wysiwygInput.offsetParent) {
                activeInput = wysiwygInput;
            }
        }

        if (!activeInput) {
            const svInput = chatContent.querySelector('.vditor-sv .vditor-reset[contenteditable="true"]');
            if (svInput && svInput.offsetParent) {
                activeInput = svInput;
            }
        }

        return activeInput;
    }

    function insertAtEndOfVditorInput(text) {
        const activeInput = getActiveInput();
        if (!activeInput) return false;

        const currentContent = activeInput.textContent || '';
        const newContent = currentContent + text;
        activeInput.textContent = newContent;
        activeInput.focus();

        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(activeInput, 0);
        range.setEnd(activeInput, 0);
        selection.removeAllRanges();
        selection.addRange(range);

        const inputEvent = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(inputEvent);
        return true;
    }

    function insertToVditorInput(text) {
        const activeInput = getActiveInput();
        if (!activeInput) return false;

        activeInput.focus();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(text);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        const inputEvent = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(inputEvent);
        return true;
    }

    // ================== 消息处理函数 ==================
    function extractMessageInfo(chatContent) {
        const chatItem = chatContent.closest('.chats__item');
        if (!chatItem) return null;

        const messageId = chatItem.id;
        const avatar = chatItem.querySelector('.avatar.tooltipped__user');
        const username = avatar ? avatar.getAttribute('aria-label') : null;

        let displayName = username;
        const userNameElement = chatContent.querySelector('#userName');
        if (userNameElement) {
            const userSpan = userNameElement.querySelector('span');
            if (userSpan && userSpan.textContent) {
                const match = userSpan.textContent.match(/([^(]+)\s*\(/);
                if (match && match[1]) {
                    displayName = match[1].trim();
                }
            }
        }

        return { messageId, username, displayName };
    }

    function extractMessageHTML(chatContent) {
        const vditorReset = chatContent.querySelector('.vditor-reset');
        return vditorReset ? vditorReset.innerHTML : null;
    }
    // 解析消息
    function htmlToMarkdownQuote(html, currentLevel = 0) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        function processElement(element, level) {
            let markdown = '';
            const indent = '>'.repeat(level) + (level > 0 ? ' ' : '');

            for (let node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (text) {
                        markdown += indent + text + '\n';
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.tagName.toLowerCase();

                    if (tagName === 'p') {
                        const pContent = node.textContent.trim();
                        if (pContent) {
                            markdown += indent + pContent + '\n';
                        } else if(node.childNodes[0] && node.childNodes[0].tagName.toLowerCase() === 'img') {
                            markdown += indent + node.innerHTML.trim() + '\n';
                        }
                    } else if (tagName === 'h5') {
                        const userLink = node.querySelector('a[href*="/member/"]');
                        const backLink = node.querySelector('a[href*="cr#"]');

                        let userText = '';
                        if (userLink) {
                            const ariaLabel = userLink.getAttribute('aria-label');
                            userText = ariaLabel || userLink.textContent;
                        }

                        let linkText = '';
                        if (backLink) {
                            const href = backLink.getAttribute('href');
                            const title = backLink.getAttribute('title') || '跳转至原消息';
                            linkText = `[↩](${href} "${title}")`;
                        }

                        markdown += indent + `##### 引用 @${userText} ${linkText}\n`;
                    } else if (tagName === 'blockquote') {
                        const blockquoteContent = processElement(node, level + 1);
                        markdown += blockquoteContent;
                    } else if (tagName === 'a' && node.closest('h5') === null) {
                        const href = node.getAttribute('href');
                        const text = node.textContent;
                        markdown += indent + `[${text}](${href})`;
                    } else {
                        markdown += processElement(node, level);
                    }
                }
            }

            if (level === 0 && markdown) {
                markdown += '\n';
            }

            return markdown;
        }

        return processElement(tempDiv, currentLevel);
    }

    function generateNewQuoteLayer(messageInfo, innerContent) {
        const { displayName, username, messageId } = messageInfo;
        const link = `https://fishpi.cn/cr#${messageId}`;
        const quotedUser = displayName || username;

        const quotedContent = innerContent
            .split('\n')
            .map(line => line.trim() === '' ? '>' : `> ${line}`)
            .join('\n');

        return `\n\n##### 引用 @${quotedUser} [↩](${link} "跳转至原消息")\n\n${quotedContent}\n`;
    }

    function showTemporaryHint(message) {
        const hint = document.createElement('div');
        hint.textContent = message;
        hint.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            animation: fadeInOut 2s ease-in-out;
        `;

        if (!document.querySelector('#hint-animation-style')) {
            const style = document.createElement('style');
            style.id = 'hint-animation-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(hint);

        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 2000);
    }

    // ================== 按钮工厂 ==================
    const buttonFactory = {
        create: (config, index, buttonId) => {
            const btn = document.createElement('button');
            btn.className = `cr-btn ${config.color}`;

            const textNode = document.createTextNode(config.text);
            btn.appendChild(textNode);

            btn.dataset.index = index;
            btn.dataset.buttonId = buttonId;
            btn.dataset.originalText = config.text;

            let hideTimer = null;
            let showTimer = null;
            let subButtonsContainer = null;
            let disabledAboveBtn = null;
            // 子按钮生成
            if (config.children && config.children.length > 0) {
                btn.classList.add('has-sub-buttons');

                subButtonsContainer = document.createElement('div');
                subButtonsContainer.className = 'sub-buttons-container popup-down';
                subButtonsContainer.dataset.parentIndex = index;

                config.children.forEach((childConfig, childIndex) => {
                    const subBtn = document.createElement('button');
                    subBtn.className = 'sub-btn';

                    const subTextNode = document.createTextNode(childConfig.text);
                    subBtn.appendChild(subTextNode);

                    subBtn.dataset.buttonId = `${buttonId}_child_${childIndex}`;
                    subBtn.dataset.originalText = childConfig.text;

                    subBtn.onclick = async (e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        if (subBtn.classList.contains('cooldown')) {
                            return;
                        }

                        try {
                            await ActionExecutor.execute(childConfig.action);
                            if (childConfig.cooldown) {
                                startCooldown(subBtn, childConfig.cooldown, `${buttonId}_child_${childIndex}`);
                            }
                            if (childConfig.muliRefresh) {
                                const refreshMessage = typeof childConfig.muliRefresh === 'string' ? childConfig.muliRefresh : null;
                                await muliRefreshPage(refreshMessage);
                            }
                        } catch (err) {
                            subBtn.style.background = '#ff4757';
                            setTimeout(() => subBtn.style.background = '', 1000);
                        }
                    };

                    subBtn.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    });

                    subButtonsContainer.appendChild(subBtn);
                });

                subButtonsContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                });

                subButtonsContainer.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                });

                btn.appendChild(subButtonsContainer);

                const getAboveButton = () => {
                    const container = document.getElementById('quick-actions');
                    if (!container) return null;

                    const currentIndex = parseInt(btn.dataset.index);
                    const aboveIndex = currentIndex - 3;

                    if (aboveIndex >= 0) {
                        const aboveBtn = container.querySelector(`.cr-btn[data-index="${aboveIndex}"]`);
                        return aboveBtn;
                    }
                    return null;
                };

                const disableAboveButton = () => {
                    const aboveBtn = getAboveButton();
                    if (aboveBtn && !aboveBtn.classList.contains('disabled-temp')) {
                        aboveBtn.classList.add('disabled-temp');
                        disabledAboveBtn = aboveBtn;
                    }
                };

                const enableAboveButton = () => {
                    if (disabledAboveBtn) {
                        disabledAboveBtn.classList.remove('disabled-temp');
                        disabledAboveBtn = null;
                    }
                };

                const adjustPopupDirection = () => {
                    if (!subButtonsContainer) return;

                    const btnRect = btn.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    const estimatedHeight = config.children.length * 30 + 16;
                    const spaceBelow = windowHeight - btnRect.bottom;

                    if (spaceBelow < estimatedHeight && btnRect.top > estimatedHeight) {
                        subButtonsContainer.classList.remove('popup-down');
                        subButtonsContainer.classList.add('popup-up');
                        disableAboveButton();
                    } else {
                        subButtonsContainer.classList.remove('popup-up');
                        subButtonsContainer.classList.add('popup-down');
                        enableAboveButton();
                    }
                };

                btn.addEventListener('mouseenter', (e) => {
                    clearTimeout(hideTimer);
                    clearTimeout(showTimer);
                    adjustPopupDirection();

                    showTimer = setTimeout(() => {
                        if (subButtonsContainer) {
                            subButtonsContainer.classList.add('show');
                        }
                    }, 100);
                });

                btn.addEventListener('mouseleave', (e) => {
                    clearTimeout(showTimer);

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

                subButtonsContainer.addEventListener('mouseenter', (e) => {
                    clearTimeout(hideTimer);
                    clearTimeout(showTimer);

                    if (subButtonsContainer.classList.contains('popup-up') && !disabledAboveBtn) {
                        disableAboveButton();
                    }
                });

                subButtonsContainer.addEventListener('mouseleave', (e) => {
                    const relatedTarget = e.relatedTarget;

                    if (!btn.contains(relatedTarget)) {
                        hideTimer = setTimeout(() => {
                            if (subButtonsContainer) {
                                subButtonsContainer.classList.remove('show');
                                enableAboveButton();
                            }
                        }, 150);
                    }
                });

                btn.onclick = async (e) => {
                    if (btn.classList.contains('cooldown')) {
                        return;
                    }

                    try {
                        await ActionExecutor.execute(config.action);
                        if (config.cooldown) {
                            startCooldown(btn, config.cooldown, buttonId);
                            //如果父按钮配置了，冷却跟从配置，则触发冷却时，同时触发子按钮的冷却
                            if (config.cooldownChildren) {
                                //获取子按钮节点列表
                                const subButtons = Array.from(
                                    btn.querySelectorAll('.sub-buttons-container .sub-btn')
                                );
                                //是否指定了只冷却部分子按钮（坐标 + 1）
                                if (config.cooldownChildren === true) {
                                    //全部子按钮冷却
                                    subButtons.forEach((button, index) => {
                                        const buttonChildrenId = button.dataset.buttonId;
                                        startCooldown(button, config.cooldown, buttonChildrenId);
                                    });
                                } else {
                                    //指定子按钮冷却
                                    const uniqueList = config.cooldownChildren.split(',');
                                    var childIndex = 1;
                                    subButtons.forEach((button, index) => {
                                        if (uniqueList.includes(childIndex.toString())) {
                                            const buttonChildrenId = button.dataset.buttonId;
                                            startCooldown(button, config.cooldown, buttonChildrenId);
                                        }
                                        childIndex++;

                                    });
                                }

                            }

                        }
                        if (config.muliRefresh) {
                            const refreshMessage = typeof config.muliRefresh === 'string' ? config.muliRefresh : null;
                            await muliRefreshPage(refreshMessage);
                        }
                    } catch (err) {
                        btn.style.background = '#ff4757';
                        setTimeout(() => btn.style.background = '', 1000);
                    }
                };
            } else {
                btn.onclick = async (e) => {
                    if (btn.classList.contains('cooldown')) {
                        return;
                    }

                    try {
                        await ActionExecutor.execute(config.action);
                        if (config.cooldown) startCooldown(btn, config.cooldown, buttonId);
                        if (config.muliRefresh) {
                            const refreshMessage = typeof config.muliRefresh === 'string' ? config.muliRefresh : null;
                            await muliRefreshPage(refreshMessage);
                        }
                    } catch (err) {
                        btn.style.background = '#ff4757';
                        setTimeout(() => btn.style.background = '', 1000);
                    }
                };
            }

            return btn;
        }
    };

    // ================== 冷却系统 ==================
    function startCooldown(btn, seconds, buttonId) {
        // 如果按钮已经在冷却中，不再重复启动冷却
        if (btn.classList.contains('cooldown')) {
            return;
        }

        // 使用保存的原始文本
        let originalText = btn.dataset.originalText || btn.textContent.replace(/ \(\d+s\)$/, '');
        let remaining = seconds;

        // 添加冷却样式
        btn.classList.add('cooldown');

        // 保存原始文本
        btn.dataset.originalText = originalText;

        // 开始冷却 - 确保格式为：原按钮文本 + (冷却时间)
        // 直接操作按钮的文本节点，避免包含子按钮文本
        const textNode = btn.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = `${originalText} (${remaining}s)`;
        } else {
            btn.textContent = `${originalText} (${remaining}s)`;
        }

        // 保存冷却开始时间到本地存储
        const cooldownKey = `${COOLDOWN_STORAGE_PREFIX}${buttonId}`;
        const endTime = Date.now() + (seconds * 1000);
        localStorage.setItem(cooldownKey, endTime.toString());

        const timer = setInterval(() => {
            remaining--;

            // 更新文本，确保格式正确
            const textNode = btn.childNodes[0];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = `${originalText} (${remaining}s)`;
            } else {
                btn.textContent = `${originalText} (${remaining}s)`;
            }

            if (remaining <= 0) {
                clearInterval(timer);
                // 恢复原始状态
                const textNode = btn.childNodes[0];
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                    textNode.textContent = originalText;
                } else {
                    btn.textContent = originalText;
                }
                btn.classList.remove('cooldown');
                // 从本地存储中移除冷却记录
                localStorage.removeItem(cooldownKey);
            }
        }, 1000);
    }
    // 刷新页面后 加载冷却状态
    function restoreCooldownStates() {
        const container = document.getElementById('quick-actions');
        if (!container) return;

        const buttons = container.querySelectorAll('.cr-btn, .sub-btn');

        buttons.forEach(btn => {
            const buttonId = btn.dataset.buttonId;
            if (!buttonId) return;

            const cooldownKey = `${COOLDOWN_STORAGE_PREFIX}${buttonId}`;
            const endTimeStr = localStorage.getItem(cooldownKey);

            if (endTimeStr) {
                const endTime = parseInt(endTimeStr);
                const now = Date.now();

                if (endTime > now) {
                    const remainingSeconds = Math.ceil((endTime - now) / 1000);
                    let originalText = btn.dataset.originalText || btn.textContent.replace(/ \(\d+s\)$/, '');

                    btn.classList.add('cooldown');
                    btn.dataset.originalText = originalText;

                    const textNode = btn.childNodes[0];
                    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                        textNode.textContent = `${originalText} (${remainingSeconds}s)`;
                    } else {
                        btn.textContent = `${originalText} (${remainingSeconds}s)`;
                    }

                    let remaining = remainingSeconds;
                    const timer = setInterval(() => {
                        remaining--;
                        if (remaining > 0) {
                            const textNode = btn.childNodes[0];
                            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                                textNode.textContent = `${originalText} (${remaining}s)`;
                            } else {
                                btn.textContent = `${originalText} (${remaining}s)`;
                            }
                        } else {
                            clearInterval(timer);
                            const textNode = btn.childNodes[0];
                            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                                textNode.textContent = originalText;
                            } else {
                                btn.textContent = originalText;
                            }
                            btn.classList.remove('cooldown');
                            localStorage.removeItem(cooldownKey);
                        }
                    }, 1000);
                } else {
                    localStorage.removeItem(cooldownKey);
                }
            }
        });
    }

    function saveAllCooldownStates() {
        const container = document.getElementById('quick-actions');
        if (!container) return;

        const coolingButtons = container.querySelectorAll('.cr-btn.cooldown, .sub-btn.cooldown');

        coolingButtons.forEach(btn => {
            const buttonId = btn.dataset.buttonId;
            if (!buttonId) return;

            const match = btn.textContent.match(/\((\d+)s\)/);
            if (match && match[1]) {
                const remainingSeconds = parseInt(match[1]);
                if (remainingSeconds > 0) {
                    const endTime = Date.now() + (remainingSeconds * 1000);
                    const cooldownKey = `${COOLDOWN_STORAGE_PREFIX}${buttonId}`;
                    localStorage.setItem(cooldownKey, endTime.toString());
                }
            }
        });
    }


    // ================== 样式 ==================
    GM_addStyle(`
    #quick-actions {
        position: fixed !important;
        z-index: 9999;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        background: rgba(255,255,255,0.95);
        padding: 12px;
        padding-top: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: 1px solid #eee;
        max-width: 420px;
        cursor: move;
        user-select: none;
        transition: box-shadow 0.2s ease;
    }

    /* 停靠在侧边栏模式（相对位置） */
    #quick-actions.docked {
        position: relative !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important; /* 将在运行时根据侧边元素宽度动态覆盖 */
        max-width: none !important;
        margin-top: 8px !important;
        box-sizing: border-box !important;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) !important; /* 自适应列数，最小列宽120px */
    }

    #quick-actions.docked .drag-handle {
        display: none !important;
    }

    /* 停靠模式下，按钮允许随容器变窄且不溢出 */
    #quick-actions.docked .cr-btn {
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: visible !important; /* 允许子菜单溢出显示 */
    }

    #quick-actions.docked .sub-btn {
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
    }

    .drag-handle {
        position: absolute;
        top: 0;
        left: 5%;
        right: 0;
        width: 90%;
        height: 18px;
        background: linear-gradient(to right, #667eea, #764ba2);
        border-radius: 8px 8px 0 0;
        cursor: move;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    #quick-actions:hover .drag-handle {
        opacity: 0.8;
    }

    #quick-actions.dragging {
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        opacity: 0.9;
        cursor: grabbing;
    }

    #quick-actions.dragging .drag-handle {
        opacity: 1;
    }

    .cr-btn, .sub-btn, #goToTopMuLi {
        cursor: pointer;
    }

    .cr-btn {
        position: relative !important;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        color: white !important;
        font-size: 14px;
        transition: all 0.2s;
        min-width: 110px;
        text-align: center;
        white-space: nowrap;
        overflow: visible !important;
        text-overflow: ellipsis;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
    }

    .cr-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        z-index: 10002 !important;
    }

    .cr-btn.has-sub-buttons:hover {
        z-index: 10010 !important;
    }

    .cr-btn.cooldown {
        opacity: 0.7 !important;
        filter: grayscale(0.2) !important;
        cursor: not-allowed !important;
    }

    .cr-btn.cooldown {
        white-space: normal !important;
        word-break: break-all !important;
        line-height: 1.2 !important;
        text-align: center;
    }

    .sub-btn.cooldown {
        opacity: 0.7 !important;
        filter: grayscale(0.1) !important;
        pointer-events: none !important;
        cursor: not-allowed !important;
    }

    .btn-blue { background: linear-gradient(45deg, #4dabf7, #339af0) }
    .btn-red { background: linear-gradient(45deg, #ff6b6b, #ff8787) }
    .btn-warn { background: linear-gradient(45deg, #ff922b, #ff7676) }
    .btn-green { background: linear-gradient(45deg, #51cf66, #37b24d) }

    .sub-buttons-container {
        position: absolute !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        display: none !important;
        flex-direction: column !important;
        gap: 4px !important;
        z-index: 10050 !important;
        background: rgba(255,255,255,0.95) !important;
        padding: 8px !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        border: 1px solid #ddd !important;
        min-width: 120px !important;
        pointer-events: auto !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease !important;
    }

    .sub-buttons-container.popup-down {
        top: 100% !important;
        bottom: auto !important;
        margin-top: 8px !important;
        margin-bottom: 0 !important;
    }

    .sub-buttons-container.popup-up {
        bottom: 100% !important;
        top: auto !important;
        margin-bottom: 8px !important;
        margin-top: 0 !important;
    }

    .sub-buttons-container::after {
        content: '' !important;
        position: absolute !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        border-width: 6px !important;
        border-style: solid !important;
        filter: drop-shadow(0 2px 1px rgba(0,0,0,0.1)) !important;
    }

    .sub-buttons-container.popup-down::after {
        top: -12px !important;
        bottom: auto !important;
        border-color: transparent transparent rgba(255,255,255,0.95) transparent !important;
    }

    .sub-buttons-container.popup-up::after {
        top: auto !important;
        bottom: -12px !important;
        border-color: rgba(255,255,255,0.95) transparent transparent transparent !important;
    }

    .sub-buttons-container.show {
        display: flex !important;
        opacity: 1 !important;
    }

    .sub-buttons-container::before {
        content: '';
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        z-index: 10049;
        pointer-events: auto;
        background: transparent;
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
        z-index: 10051;
        min-width: 100px !important;
        box-sizing: border-box;
    }

    .sub-btn:hover {
        background: linear-gradient(45deg, #4263eb, #364fc7) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    }

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

    @keyframes pulse {
        0% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6); }
        100% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
    }

    #dockToggleMuLi {
        position: absolute !important;
        top: -10px !important;
        right: -10px !important;
        width: 28px !important;
        height: 28px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #2b8a3e 0%, #20c997 100%) !important;
        color: white !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        box-shadow: 0 4px 15px rgba(32, 201, 151, 0.4) !important;
        border: 3px solid white !important;
        z-index: 10000 !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    #dockToggleMuLi:hover {
        transform: scale(1.08) !important;
        box-shadow: 0 6px 20px rgba(32, 201, 151, 0.6) !important;
        background: linear-gradient(135deg, #20c997 0%, #2b8a3e 100%) !important;
    }

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

    /* 编辑器样式 */
    #config-editor {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 1000px;
        height: 85vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 100001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    #editor-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 100000;
        backdrop-filter: blur(3px);
    }

    .editor-tabs {
        display: flex;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
    }

    .editor-tab {
        padding: 12px 24px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #6c757d;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
    }

    .editor-tab.active {
        color: #667eea;
        border-bottom-color: #667eea;
    }

    .editor-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .tab-pane {
        display: none;
        flex: 1;
        overflow: hidden;
        flex-direction: column;
    }

    .tab-pane.active {
        display: flex;
    }

    .editor-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .editor-footer {
        padding: 16px 20px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .editor-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 100px;
    }

    .editor-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    .json-editor-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 20px;
        gap: 15px;
    }

    #json-editor {
        flex: 1;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
        resize: none;
        outline: none;
    }

    .json-error {
        padding: 10px;
        border-radius: 4px;
        font-size: 12px;
        display: none;
    }

    .json-error.error {
        display: block;
        background: #ffe3e3;
        color: #c92a2a;
    }

    .json-error.success {
        display: block;
        background: #d3f9d8;
        color: #2b8a3e;
    }

    .visual-editor-area {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .buttons-list {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    }

    .muli-button-form {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid #e9ecef;
    }

    .button-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #dee2e6;
    }

    .fieldset {
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 15px;
    }

    .fieldset legend {
        padding: 0 10px;
        font-weight: 500;
        color: #495057;
        font-size: 14px;
    }

    .form-group {
        margin-bottom: 12px;
    }

    .form-label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #495057;
    }

    .form-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
    }

    .form-input:focus {
        border-color: #667eea;
        outline: none;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .preview-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 20px;
        overflow-y: auto;
    }

    .preview-container {
        flex: 1;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        min-height: 200px;
        border: 1px solid #e9ecef;
        overflow-y: auto;
    }

    .sub-buttons-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 10px;
        padding: 10px;
        background: rgba(255,255,255,0.8);
        border-radius: 6px;
        border: 1px dashed #ddd;
    }

    .sub-btn-preview {
        background: linear-gradient(45deg, #5c7cfa, #4263eb);
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        color: white;
        font-size: 11px;
        white-space: nowrap;
    }

    .add-child-btn {
        padding: 6px 12px;
        background: #e9ecef;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        color: #495057;
        font-size: 13px;
        cursor: pointer;
        margin-top: 10px;
    }

    .child-button-form {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 10px;
        position: relative;
    }

    .remove-child-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: #ff6b6b;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .remove-child-btn:hover {
        background: #ffe3e3;
    }

    .children-list {
        margin-top: 10px;
    }

    .no-children {
        text-align: center;
        color: #6c757d;
        font-size: 13px;
        padding: 20px;
        background: rgba(255,255,255,0.5);
        border-radius: 6px;
        border: 1px dashed #dee2e6;
    }

    .preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
    }

    .preview-info {
        margin-top: 20px;
        padding: 15px;
        background: white;
        border-radius: 6px;
        border: 1px solid #e9ecef;
        font-size: 12px;
        color: #6c757d;
    }

    /* 编辑按钮样式 */
    #edit-quick-actions {
        position: fixed;
        bottom: 10px;
        right: 10px;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
    }

    #edit-quick-actions:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }

    /* 提示动画 */
    #editor-toast-style {
        display: none;
    }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`);


    // ================== 拖拽功能 ==================
    // 自带记忆功能
    class DragManager {
        constructor(container) {
            this.container = container;
            this.isDragging = false;
            this.startX = 0;
            this.startY = 0;
            this.startLeft = 0;
            this.startTop = 0;

            this.init();
        }

        init() {
            // 创建拖拽手柄
            this.createDragHandle();

            // 加载保存的位置
            this.loadPosition();

            // 添加事件监听
            this.addEventListeners();
        }

        createDragHandle() {
            const handle = document.createElement('div');
            handle.className = 'drag-handle';
            handle.innerHTML = '☰ 拖拽 双击复位';
            this.container.appendChild(handle);

            // 双击手柄复位
            handle.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.resetPosition();
            });
        }

        addEventListeners() {
            // 手柄按下开始拖拽
            const handle = this.container.querySelector('.drag-handle');
            handle.addEventListener('mousedown', this.startDrag.bind(this));

            // 整个容器也可以拖拽（但优先响应内部按钮点击）
            this.container.addEventListener('mousedown', (e) => {
                // 如果点击的不是按钮或返回顶部按钮，开始拖拽
                if (!e.target.classList.contains('cr-btn') &&
                    !e.target.classList.contains('sub-btn') &&
                    e.target.id !== 'goToTopMuLi' &&
                    !e.target.closest('.cr-btn') &&
                    !e.target.closest('.sub-btn')) {
                    this.startDrag(e);
                }
            });

            // 文档级别的事件监听
            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));

            // 防止拖拽时选中文本
            document.addEventListener('selectstart', (e) => {
                if (this.isDragging) {
                    e.preventDefault();
                }
            });
        }

        startDrag(e) {
            // 停靠模式不允许拖拽
            if (this.container.classList.contains('docked')) return;
            this.isDragging = true;
            this.container.classList.add('dragging');

            // 获取当前位置
            const rect = this.container.getBoundingClientRect();
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.startLeft = rect.left;
            this.startTop = rect.top;

            // 防止默认行为
            e.preventDefault();
            e.stopPropagation();
        }

        drag(e) {
            // 停靠模式不允许拖拽
            if (this.container.classList.contains('docked')) return;
            if (!this.isDragging) return;

            // 计算移动距离
            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;

            // 应用新位置
            const newLeft = this.startLeft + dx;
            const newTop = this.startTop + dy;

            // 边界检查（确保不完全移出窗口）
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const containerWidth = this.container.offsetWidth;
            const containerHeight = this.container.offsetHeight;

            const boundedLeft = Math.max(0, Math.min(newLeft, windowWidth - containerWidth));
            const boundedTop = Math.max(0, Math.min(newTop, windowHeight - containerHeight));

            this.container.style.left = boundedLeft + 'px';
            this.container.style.top = boundedTop + 'px';

            // 防止默认行为
            e.preventDefault();
        }

        stopDrag() {
            // 停靠模式不保存位置
            if (this.container.classList.contains('docked')) return;
            if (!this.isDragging) return;

            this.isDragging = false;
            this.container.classList.remove('dragging');

            // 保存位置
            this.savePosition();
        }

        savePosition() {
            // 停靠模式不保存位置
            if (this.container.classList.contains('docked')) return;
            const rect = this.container.getBoundingClientRect();
            const position = {
                x: rect.left,
                y: rect.top,
                timestamp: Date.now()
            };

            try {
                localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
            } catch (e) {
                console.warn('无法保存位置到本地存储:', e);
            }
        }

        loadPosition() {
            try {
                // 停靠模式不加载位置
                if (this.container.classList.contains('docked')) return;
                const saved = localStorage.getItem(POSITION_STORAGE_KEY);
                if (saved) {
                    const position = JSON.parse(saved);

                    // 检查位置是否合理（在可视区域内）
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    const containerWidth = this.container.offsetWidth;
                    const containerHeight = this.container.offsetHeight;

                    // 如果位置有效且时间在24小时内，使用保存的位置
                    if (position &&
                        position.x !== undefined &&
                        position.y !== undefined &&
                        (!position.timestamp || Date.now() - position.timestamp < 24 * 60 * 60 * 1000) &&
                        position.x >= 0 && position.x <= windowWidth - containerWidth &&
                        position.y >= 0 && position.y <= windowHeight - containerHeight) {

                        this.container.style.left = position.x + 'px';
                        this.container.style.top = position.y + 'px';
                        return;
                    }
                }
            } catch (e) {
                console.warn('无法加载保存的位置:', e);
            }

            // 使用默认位置
            this.resetPosition();
        }

        resetPosition() {
            // 停靠模式不复位位置
            if (this.container.classList.contains('docked')) return;
            this.container.style.left = DEFAULT_POSITION.x + 'px';
            this.container.style.top = DEFAULT_POSITION.y + 'px';
            this.savePosition();

            // 显示提示
            muliShowToast('已复位到默认位置', 1500, 'success');
        }
    }

    // ================== 编辑器功能 ==================
    // 动作函数模板
    let ACTION_TEMPLATES = {
        sendMsg: {
            params: [
                { name: 'message', type: 'text', label: '消息内容（多条逗号隔开）', required: true }
            ]
        },
        muliRefreshPage: {
            params: [
                { name: 'message', type: 'text', label: '刷新提示消息', required: false },
                { name: 'delay', type: 'number', label: '延迟(ms)', defaultValue: 100 }
            ]
        },
        fetchPrivate: {
            params: [
                { name: 'endpoint', type: 'text', label: 'API路径（多条逗号隔开）', required: true }
            ]
        },
        promptAndSend: {
            params: [
                { name: 'promptText', type: 'text', label: '提示文本', defaultValue: '请输入' },
                { name: 'defaultValue', type: 'text', label: '默认值', required: false },
                { name: 'actionCode', type: 'code', label: '发送内容', placeholder: '消息 + ${input}', required: true }
            ]
        }
    };
    const COLOR_OPTIONS = [
        { value: 'btn-blue', label: '蓝色', color: '#339af0' },
        { value: 'btn-red', label: '红色', color: '#ff6b6b' },
        { value: 'btn-warn', label: '橙色', color: '#ff922b' },
        { value: 'btn-green', label: '绿色', color: '#51cf66' }
    ];

    function createEditButton() {
        const editBtn = document.createElement('div');
        editBtn.id = 'edit-quick-actions';
        editBtn.innerHTML = '✎';
        editBtn.title = '编辑按钮配置';

        editBtn.addEventListener('click', showEditor);
        document.body.appendChild(editBtn);
    }

    function showEditor() {
        const existingEditor = document.getElementById('config-editor');
        if (existingEditor) {
            existingEditor.remove();
            const overlay = document.getElementById('editor-overlay');
            if (overlay) overlay.remove();
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'editor-overlay';
        overlay.addEventListener('click', () => closeEditor());
        document.body.appendChild(overlay);

        const editor = document.createElement('div');
        editor.id = 'config-editor';

        activeConfig = JSON.parse(JSON.stringify(FINAL_BUTTONS_CONFIG));

        const header = document.createElement('div');
        header.className = 'editor-header';
        header.innerHTML = `
            <h2 style="margin: 0; font-size: 18px;">快捷按钮配置编辑器</h2>
            <button id="close-editor" style="
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            ">×</button>
        `;

        header.querySelector('#close-editor').addEventListener('click', closeEditor);
        header.querySelector('#close-editor').addEventListener('mouseenter', function () {
            this.style.background = 'rgba(255,255,255,0.2)';
        });
        header.querySelector('#close-editor').addEventListener('mouseleave', function () {
            this.style.background = 'none';
        });

        const tabs = document.createElement('div');
        tabs.className = 'editor-tabs';
        tabs.innerHTML = `
            <button class="editor-tab active" data-tab="json">JSON编辑</button>
            <button class="editor-tab" data-tab="visual">可视化编辑</button>
            <button class="editor-tab" data-tab="preview">预览</button>
        `;

        const content = document.createElement('div');
        content.className = 'editor-content';

        const jsonPane = createJsonPane();
        const visualPane = createVisualPane();
        const previewPane = createPreviewPane();

        content.appendChild(jsonPane);
        content.appendChild(visualPane);
        content.appendChild(previewPane);

        const footer = document.createElement('div');
        footer.className = 'editor-footer';
        footer.innerHTML = `
            <button class="editor-btn" id="save-config" style="background: #51cf66;">💾 保存配置</button>
            <button class="editor-btn" id="reset-config" style="background: #ff922b;">🔄 重置默认</button>
            <button class="editor-btn" id="cancel-config" style="background: #ff6b6b;">❌ 取消</button>
        `;

        editor.appendChild(header);
        editor.appendChild(tabs);
        editor.appendChild(content);
        editor.appendChild(footer);
        document.body.appendChild(editor);

        setupEventListeners();
    }

    function closeEditor() {
        const editor = document.getElementById('config-editor');
        const overlay = document.getElementById('editor-overlay');

        if (editor) editor.remove();
        if (overlay) overlay.remove();
    }

    function createJsonPane() {
        const pane = document.createElement('div');
        pane.className = 'tab-pane active';
        pane.id = 'json-pane';

        const area = document.createElement('div');
        area.className = 'json-editor-area';

        area.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #495057; font-size: 16px;">JSON配置编辑器</h3>
                <div style="display: flex; gap: 8px;">
                    <button id="format-json" style="
                        padding: 6px 12px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                        white-space: nowrap;
                    ">格式化JSON</button>
                    <button id="format-json-export" style="
                        padding: 6px 12px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                        white-space: nowrap;
                    ">导出配置</button>
                    <button id="format-json-import" style="
                        padding: 6px 12px;
                        background: #ff9800;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                        white-space: nowrap;
                    ">导入配置</button>
                </div>
            </div>
            <textarea id="json-editor">${ConfigSerializer.serialize(activeConfig)}</textarea>
            <div id="json-error" class="json-error"></div>
        `;

        pane.appendChild(area);
        return pane;
    }

    function createVisualPane() {
        const pane = document.createElement('div');
        pane.className = 'tab-pane';
        pane.id = 'visual-pane';

        const area = document.createElement('div');
        area.className = 'visual-editor-area';

        area.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #495057; font-size: 16px;">可视化编辑器</h3>
                    <button id="add-button" style="
                        padding: 8px 16px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 13px;
                        cursor: pointer;
                    ">+ 添加按钮</button>
                </div>
                <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 12px;">
                    点击按钮配置详细信息，可以添加子按钮（最多一级）
                </p>
            </div>
            <div class="buttons-list" id="buttons-list"></div>
        `;

        pane.appendChild(area);
        return pane;
    }

    function createPreviewPane() {
        const pane = document.createElement('div');
        pane.className = 'tab-pane';
        pane.id = 'preview-pane';

        const area = document.createElement('div');
        area.className = 'preview-area';

        area.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #495057; font-size: 16px;">按钮预览</h3>
            <div class="preview-container" id="preview-container"></div>
            <div class="preview-info" id="preview-info"></div>
        `;

        pane.appendChild(area);
        return pane;
    }
    // tab切换事件
    function setupEventListeners() {
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                document.querySelectorAll('.editor-tab').forEach(t => {
                    t.classList.remove('active');
                });
                tab.classList.add('active');

                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                document.getElementById(`${tabName}-pane`).classList.add('active');

                if (tabName === 'visual') {
                    updateVisualEditor();
                } else if (tabName === 'preview') {
                    updatePreview();
                }
            });
        });

        document.getElementById('format-json').addEventListener('click', formatJson);
        document.getElementById('json-editor').addEventListener('input', validateJson);
        document.getElementById('add-button').addEventListener('click', () => addButtonForm());
        document.getElementById('save-config').addEventListener('click', saveConfig);
        document.getElementById('reset-config').addEventListener('click', resetConfig);
        document.getElementById('cancel-config').addEventListener('click', closeEditor);

        document.getElementById('format-json-export').addEventListener('click', exportConfig);
        document.getElementById('format-json-import').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', handleImportConfig);
            input.click();
        });

        updateVisualEditor();
        updatePreview();
    }

    function formatJson() {
        const editor = document.getElementById('json-editor');
        const errorDiv = document.getElementById('json-error');

        try {
            const json = JSON.parse(editor.value);
            editor.value = JSON.stringify(json, null, 2);
            errorDiv.textContent = 'JSON格式正确';
            errorDiv.className = 'json-error success';

            activeConfig = ConfigSerializer.deserialize(editor.value);
        } catch (e) {
            errorDiv.textContent = 'JSON格式错误: ' + e.message;
            errorDiv.className = 'json-error error';
        }
    }

    function validateJson() {
        const editor = document.getElementById('json-editor');
        const errorDiv = document.getElementById('json-error');

        try {
            JSON.parse(editor.value);
            errorDiv.textContent = '';
            errorDiv.className = 'json-error';

            activeConfig = ConfigSerializer.deserialize(editor.value);
        } catch (e) {
            errorDiv.textContent = 'JSON格式错误: ' + e.message;
            errorDiv.className = 'json-error error';
        }
    }

    function updateVisualEditor() {
        const buttonsList = document.getElementById('buttons-list');
        if (!buttonsList) return;

        buttonsList.innerHTML = '';

        activeConfig.forEach((button, index) => {
            buttonsList.appendChild(createButtonForm(button, index));
        });

        if (activeConfig.length === 0) {
            buttonsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <p>还没有任何按钮配置</p>
                    <p>点击上方"添加按钮"开始创建</p>
                </div>
            `;
        }
    }
    //新增按钮
    function createButtonForm(button, index) {
        const form = document.createElement('div');
        form.className = 'muli-button-form';
        form.dataset.index = index;

        const header = document.createElement('div');
        header.className = 'button-header';
        header.innerHTML = `
            <h3 style="margin: 0; font-size: 14px;">按钮 ${index + 1}: ${button.text || '新按钮'}</h3>
            <div style="display: flex; gap: 5px;">
                <button class="move-up-btn" style="
                    padding: 4px 8px;
                    background: #e9ecef;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">↑</button>
                <button class="move-down-btn" style="
                    padding: 4px 8px;
                    background: #e9ecef;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">↓</button>
                <button class="delete-btn" style="
                    padding: 4px 8px;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">删除</button>
            </div>
        `;

        const basicSettings = document.createElement('fieldset');
        basicSettings.className = 'fieldset';
        basicSettings.innerHTML = '<legend>基本设置</legend>';

        const textGroup = document.createElement('div');
        textGroup.className = 'form-group';
        textGroup.innerHTML = `
            <label class="form-label">按钮文本 *</label>
            <input type="text" class="form-input" name="text" value="${button.text || ''}"
                   placeholder="例如: 冰冰指令" required>
        `;

        const colorGroup = document.createElement('div');
        colorGroup.className = 'form-group';
        colorGroup.innerHTML = `
            <label class="form-label">按钮颜色</label>
            <select class="form-input" name="color">
                ${COLOR_OPTIONS.map(opt => `
                    <option value="${opt.value}" ${button.color === opt.value ? 'selected' : ''}>
                        ${opt.label}
                    </option>
                `).join('')}
            </select>
        `;

        const cooldownGroup = document.createElement('div');
        cooldownGroup.className = 'form-group';
        cooldownGroup.innerHTML = `
            <label class="form-label">冷却时间(秒)</label>
            <input type="number" class="form-input" name="cooldown"
                   value="${button.cooldown || ''}" placeholder="0表示无冷却" min="0">
        `;

        const cooldownChildrenGroup = document.createElement('div');
        cooldownChildrenGroup.className = 'form-group';
        cooldownChildrenGroup.innerHTML = `
            <label class="form-label">子按钮是否联动冷却</label>
            <input type="text" class="form-input" name="cooldownChildren"
                   value="${typeof button.cooldownChildren === 'string' ? button.cooldownChildren : (button.cooldownChildren ? 'true' : '')}"
                   placeholder="不填为不联动，true或者数字逗号隔开为全部联动或指定联动">
        `;

        const refreshGroup = document.createElement('div');
        refreshGroup.className = 'form-group';
        refreshGroup.innerHTML = `
            <label class="form-label">刷新后提示消息</label>
            <input type="text" class="form-input" name="muliRefresh"
                   value="${typeof button.muliRefresh === 'string' ? button.muliRefresh : (button.muliRefresh ? 'true' : '')}"
                   placeholder="留空不刷新，填true或提示消息">
        `;

        basicSettings.appendChild(textGroup);
        basicSettings.appendChild(colorGroup);
        basicSettings.appendChild(cooldownGroup);
        basicSettings.appendChild(cooldownChildrenGroup);
        basicSettings.appendChild(refreshGroup);

        const actionSettings = document.createElement('fieldset');
        actionSettings.className = 'fieldset';
        actionSettings.innerHTML = '<legend>点击动作</legend>';

        const actionTypeGroup = document.createElement('div');
        actionTypeGroup.className = 'form-group';
        actionTypeGroup.innerHTML = `
            <label class="form-label">动作类型</label>
            <select class="form-input" name="actionType">
                <option value="">无</option>
                <option value="sendMsg" ${button.action?.type === 'sendMsg' ? 'selected' : ''}>发送消息</option>
                <option value="promptAndSend" ${button.action?.type === 'promptAndSend' ? 'selected' : ''}>输入框+发送</option>
                <option value="fetchPrivate" ${button.action?.type === 'fetchPrivate' ? 'selected' : ''}>调用私信API</option>

            </select>
        `;

        const actionParams = document.createElement('div');
        actionParams.className = 'action-params';
        actionParams.style.marginTop = '10px';

        actionSettings.appendChild(actionTypeGroup);
        actionSettings.appendChild(actionParams);

        const childrenSettings = document.createElement('fieldset');
        childrenSettings.className = 'fieldset';
        childrenSettings.innerHTML = '<legend>子按钮设置</legend>';

        const childrenList = document.createElement('div');
        childrenList.className = 'children-list';

        const addChildBtn = document.createElement('button');
        addChildBtn.type = 'button';
        addChildBtn.className = 'add-child-btn';
        addChildBtn.textContent = '+ 添加子按钮';

        childrenSettings.appendChild(childrenList);
        childrenSettings.appendChild(addChildBtn);

        form.appendChild(header);
        form.appendChild(basicSettings);
        form.appendChild(actionSettings);
        form.appendChild(childrenSettings);

        updateActionParams(actionParams, button.action?.type || 'sendMsg', button);

        if (button.children && button.children.length > 0) {
            button.children.forEach((child, childIndex) => {
                addChildButton(childrenList, child, childIndex);
            });
        } else {
            childrenList.innerHTML = '<div class="no-children">暂无子按钮，点击上方按钮添加</div>';
        }

        setupButtonFormEvents(form, index);

        return form;
    }

    function updateActionParams(container, type, button) {
        container.innerHTML = '';

        if (!type) return;

        const actionTemplates = ACTION_TEMPLATES;

        const template = actionTemplates[type];
        if (!template) return;

        const currentParams = button.action && button.action.params ? button.action.params : {};

        template.params.forEach(param => {
            const group = document.createElement('div');
            group.className = 'form-group';

            let value = '';
            if (param.type === 'code') {
                if (typeof currentParams === 'object' && currentParams[param.name]) {
                    value = currentParams[param.name];
                } else if (typeof currentParams === 'string' && param.name === 'code') {
                    value = currentParams;
                }

                group.innerHTML = `
                    <label class="form-label">${param.label}${param.required ? ' *' : ''}</label>
                    <textarea class="form-input" name="action_${param.name}"
                              rows="4" placeholder="${param.placeholder || ''}"
                              ${param.required ? 'required' : ''}>${value}</textarea>
                `;
            } else {
                if (Array.isArray(currentParams)) {
                    value = currentParams.join(',');
                } else if (typeof currentParams === 'object') {
                    value = currentParams[param.name] || param.defaultValue || '';
                } else if (param.name === 'message' && typeof currentParams === 'string') {
                    value = currentParams;
                } else {
                    value = param.defaultValue || '';
                }

                group.innerHTML = `
                    <label class="form-label">${param.label}${param.required ? ' *' : ''}</label>
                    <input type="${param.type}" class="form-input" name="action_${param.name}"
                           value="${value}"
                           placeholder="${param.placeholder || ''}"
                           ${param.required ? 'required' : ''}>
                `;
            }

            container.appendChild(group);
        });
    }
    // 添加子按钮
    function addChildButton(container, childData = {}, childIndex = 0) {
        const noChildren = container.querySelector('.no-children');
        if (noChildren) noChildren.remove();

        const childForm = document.createElement('div');
        childForm.className = 'child-button-form';

        childForm.innerHTML = `
            <button class="remove-child-btn" type="button">×</button>
            <div class="form-group">
                <label class="form-label">子按钮文本 *</label>
                <input type="text" class="form-input" name="text" value="${childData.text || ''}" placeholder="例如: 打劫" required>
            </div>
            <div class="form-group">
                <label class="form-label">动作类型</label>
                <select class="form-input" name="actionType">
                    <option value="">无</option>
                    <option value="sendMsg" ${childData.action?.type === 'sendMsg' ? 'selected' : ''}>发送消息</option>
                    <option value="promptAndSend" ${childData.action?.type === 'promptAndSend' ? 'selected' : ''}>输入框+发送</option>
                    <option value="fetchPrivate" ${childData.action?.type === 'fetchPrivate' ? 'selected' : ''}>调用私信API</option>
                </select>
            </div>
            <div class="form-group action-params"></div>
            <div class="form-group">
                <label class="form-label">冷却时间(秒)</label>
                <input type="number" class="form-input" name="cooldown" value="${childData.cooldown || ''}" placeholder="0表示无冷却" min="0">
            </div>
            <div class="form-group">
                <label class="form-label">刷新后提示消息</label>
                <input type="text" class="form-input" name="muliRefresh"
                       value="${typeof childData.muliRefresh === 'string' ? childData.muliRefresh : (childData.muliRefresh ? 'true' : '')}"
                       placeholder="留空不刷新，填true或提示消息">
            </div>
        `;

        const paramsContainer = childForm.querySelector('.action-params');
        updateChildActionParams(paramsContainer, childData.action?.type || 'sendMsg', childData);

        childForm.querySelector('[name="actionType"]').addEventListener('change', (e) => {
            updateChildActionParams(paramsContainer, e.target.value, childData);
        });

        childForm.querySelector('.remove-child-btn').addEventListener('click', () => {
            childForm.remove();
            if (container.children.length === 0) {
                container.innerHTML = '<div class="no-children">暂无子按钮，点击上方按钮添加</div>';
            }
        });

        container.appendChild(childForm);
    }

    function updateChildActionParams(container, type, childData) {
        container.innerHTML = '';

        const actionTemplates = ACTION_TEMPLATES;

        const template = actionTemplates[type];
        if (!template) return;

        const currentParams = childData.action && childData.action.params ? childData.action.params : {};

        template.params.forEach(param => {
            const group = document.createElement('div');
            group.className = 'form-group';

            let value = '';
            if (param.type === 'code') {
                if (typeof currentParams === 'object' && currentParams[param.name]) {
                    value = currentParams[param.name];
                } else if (typeof currentParams === 'string' && param.name === 'code') {
                    value = currentParams;
                }

                group.innerHTML = `
                    <label class="form-label">${param.label}${param.required ? ' *' : ''}</label>
                    <textarea class="form-input" name="action_${param.name}"
                              rows="3" placeholder="${param.placeholder || ''}"
                              ${param.required ? 'required' : ''}>${value}</textarea>
                `;
            } else {
                if (Array.isArray(currentParams)) {
                    value = currentParams.join(',');
                } else if (typeof currentParams === 'object') {
                    value = currentParams[param.name] || param.defaultValue || '';
                } else if (param.name === 'message' && typeof currentParams === 'string') {
                    value = currentParams;
                } else {
                    value = param.defaultValue || '';
                }

                group.innerHTML = `
                    <label class="form-label">${param.label}${param.required ? ' *' : ''}</label>
                    <input type="${param.type}" class="form-input" name="action_${param.name}"
                           value="${value}"
                           placeholder="${param.placeholder || ''}"
                           ${param.required ? 'required' : ''}>
                `;
            }

            container.appendChild(group);
        });
    }

    function setupButtonFormEvents(form, index) {
        form.querySelector('[name="actionType"]')?.addEventListener('change', (e) => {
            const paramsContainer = form.querySelector('.action-params');
            const buttonData = activeConfig[index] || {};
            updateActionParams(paramsContainer, e.target.value, buttonData);
        });

        form.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('确定删除这个按钮吗？')) {
                activeConfig.splice(index, 1);
                updateVisualEditor();
                updatePreview();
                updateJsonEditor();
            }
        });

        form.querySelector('.move-up-btn').addEventListener('click', () => {
            if (index > 0) {
                [activeConfig[index], activeConfig[index - 1]] = [activeConfig[index - 1], activeConfig[index]];
                updateVisualEditor();
                updatePreview();
                updateJsonEditor();
            }
        });

        form.querySelector('.move-down-btn').addEventListener('click', () => {
            if (index < activeConfig.length - 1) {
                [activeConfig[index], activeConfig[index + 1]] = [activeConfig[index + 1], activeConfig[index]];
                updateVisualEditor();
                updatePreview();
                updateJsonEditor();
            }
        });

        form.querySelector('.add-child-btn').addEventListener('click', () => {
            const childrenList = form.querySelector('.children-list');
            addChildButton(childrenList);
        });


    }

    function handleFormChange(form, index, changedElement) {
        // 实时更新 activeConfig
        if (!activeConfig[index]) return;

        const formData = new FormData(form);
        const buttonData = {};

        form.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.name) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    buttonData[element.name] = element.checked;
                } else {
                    buttonData[element.name] = element.value;
                }
            }
        });

        // 更新按钮数据
        activeConfig[index].text = buttonData.text || '';
        activeConfig[index].color = buttonData.color || 'btn-blue';

        if (buttonData.cooldown && !isNaN(buttonData.cooldown) && parseInt(buttonData.cooldown) > 0) {
            activeConfig[index].cooldown = parseInt(buttonData.cooldown);
        } else {
            delete activeConfig[index].cooldown;
        }

        if (buttonData.muliRefresh) {
            activeConfig[index].muliRefresh = buttonData.muliRefresh === 'true' ? true : buttonData.muliRefresh;
        } else {
            delete activeConfig[index].muliRefresh;
        }

        // 更新动作
        const actionType = buttonData.actionType;
        if (actionType) {
            activeConfig[index].action = { type: actionType };

            const params = {};
            form.querySelectorAll('.action-params input, .action-params textarea').forEach(element => {
                const name = element.name.replace('action_', '');
                params[name] = element.value;
            });

            if (actionType === 'sendMsg' && params.message) {
                activeConfig[index].action.params = params.message;
            } else if (actionType === 'muliRefreshPage') {
                activeConfig[index].action.params = params.message || null;
                if (params.delay) {
                    activeConfig[index].action.params = [params.message || null, parseInt(params.delay) || 100];
                }
            } else if (Object.keys(params).length > 0) {
                activeConfig[index].action.params = params;
            }
        }

        // 更新子按钮
        const childForms = form.querySelectorAll('.child-button-form');
        if (childForms.length > 0) {
            activeConfig[index].children = [];

            childForms.forEach(childForm => {
                const childData = {};
                const childText = childForm.querySelector('[name="text"]')?.value;
                if (!childText?.trim()) return;

                childData.text = childText;

                const childActionType = childForm.querySelector('[name="actionType"]')?.value || 'sendMsg';
                childData.action = { type: childActionType };

                const childCooldown = childForm.querySelector('[name="cooldown"]')?.value;
                if (childCooldown && !isNaN(childCooldown) && parseInt(childCooldown) > 0) {
                    childData.cooldown = parseInt(childCooldown);
                }

                const childRefresh = childForm.querySelector('[name="muliRefresh"]')?.value;
                if (childRefresh) {
                    childData.muliRefresh = childRefresh === 'true' ? true : childRefresh;
                }

                const childParams = {};
                childForm.querySelectorAll('.action-params input, .action-params textarea').forEach(element => {
                    const name = element.name.replace('action_', '');
                    childParams[name] = element.value;
                });

                if (childActionType === 'sendMsg' && childParams.message) {
                    childData.action.params = childParams.message;
                } else if (Object.keys(childParams).length > 0) {
                    childData.action.params = childParams;
                }

                activeConfig[index].children.push(childData);
            });
        } else {
            delete activeConfig[index].children;
        }

        // 更新JSON编辑器
        updateJsonEditor();
    }

    function addButtonForm() {
        const newButton = {
            text: '新按钮',
            color: 'btn-blue',
            action: { type: 'sendMsg', params: '新消息' }
        };

        activeConfig.push(newButton);
        updateVisualEditor();
        updatePreview();
        updateJsonEditor();
    }

    function updatePreview() {
        const container = document.getElementById('preview-container');
        const info = document.getElementById('preview-info');

        if (!container) return;

        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'preview-grid';

        activeConfig.forEach((button, index) => {
            const btn = document.createElement('div');
            btn.style.cssText = `
                position: relative;
                background: ${COLOR_OPTIONS.find(c => c.value === button.color)?.color || '#339af0'};
                border-radius: 6px;
                padding: 10px;
                color: white;
                text-align: center;
                font-size: 13px;
                cursor: default;
                user-select: none;
                overflow: hidden;
                min-height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            btn.innerHTML = `<span>${button.text || '未命名'}</span>`;

            if (button.children && button.children.length > 0) {
                const subButtons = document.createElement('div');
                subButtons.className = 'sub-buttons-preview';

                button.children.forEach(child => {
                    const subBtn = document.createElement('div');
                    subBtn.className = 'sub-btn-preview';
                    subBtn.textContent = child.text || '子按钮';
                    subButtons.appendChild(subBtn);
                });

                btn.appendChild(subButtons);
            }

            grid.appendChild(btn);
        });

        container.appendChild(grid);

        if (info) {
            const hasChildren = activeConfig.some(b => b.children && b.children.length > 0);
            const hasCooldown = activeConfig.some(b => b.cooldown);

            info.innerHTML = `
                <div>共 ${activeConfig.length} 个按钮</div>
                ${hasChildren ? `<div>其中 ${activeConfig.filter(b => b.children?.length).length} 个按钮有子菜单</div>` : ''}
                ${hasCooldown ? `<div>其中 ${activeConfig.filter(b => b.cooldown).length} 个按钮有冷却时间</div>` : ''}
            `;
        }
    }

    function updateJsonEditor() {
        const editor = document.getElementById('json-editor');
        if (editor) {
            editor.value = ConfigSerializer.serialize(activeConfig);
            validateJson();
        }
    }
    // 保存配置
    async function saveConfig() {
        try {
            // 验证配置
            if (!Array.isArray(activeConfig)) {
                throw new Error('配置必须是数组格式');
            }

            // 使用 ConfigSerializer 序列化配置
            const serializedConfig = ConfigSerializer.serialize(activeConfig);
            localStorage.setItem(CONFIG_STORAGE_KEY, serializedConfig);

            // 更新最终配置
            FINAL_BUTTONS_CONFIG = JSON.parse(JSON.stringify(activeConfig));

            showToast('配置已保存！请刷新页面生效', 'success');
            closeEditor();
            await muliRefreshPage(true);

        } catch (e) {
            showToast('保存失败: ' + e.message, 'error');
        }
    }

    function resetConfig() {
        if (confirm('确定重置为默认配置吗？当前配置将丢失。')) {
            activeConfig = JSON.parse(JSON.stringify(ORIGINAL_BUTTONS_CONFIG));
            localStorage.removeItem(CONFIG_STORAGE_KEY);

            updateVisualEditor();
            updatePreview();
            updateJsonEditor();

            showToast('已重置为默认配置', 'info');
        }
    }

    function exportConfig() {
        const jsonString = ConfigSerializer.serialize(activeConfig);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fishpi_按钮配置备份.json';
        a.click();
        URL.revokeObjectURL(url);

        showToast('配置已导出', 'success');
    }

    function handleImportConfig(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedConfig = ConfigSerializer.deserialize(e.target.result);
                activeConfig = importedConfig;

                updateVisualEditor();
                updatePreview();
                updateJsonEditor();

                showToast('配置导入成功！', 'success');
            } catch (error) {
                showToast('导入失败: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.textContent = message;

        const colors = {
            success: '#51cf66',
            error: '#ff6b6b',
            info: '#339af0'
        };

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 100002;
            animation: slideIn 0.3s ease;
            font-size: 14px;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // ================== 初始化 ==================
    const DOCK_PREF_KEY = 'fishpi_quick_actions_docked';

    function getDockPreference() {
        try {
            return localStorage.getItem(DOCK_PREF_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function setDockPreference(val) {
        try {
            localStorage.setItem(DOCK_PREF_KEY, val ? 'true' : 'false');
        } catch (e) {}
    }

    function undockContainer(container) {
        try {
            container.classList.remove('docked');
            document.body.appendChild(container);
            container.style.width = '';
            container.style.removeProperty('grid-template-columns');
            // 恢复到已保存的浮动位置（不强制复位默认值）
            if (container.dragManager) {
                container.dragManager.loadPosition();
            } else {
                // 没有拖拽管理器时，保底设置为默认位置
                container.style.left = DEFAULT_POSITION.x + 'px';
                container.style.top = DEFAULT_POSITION.y + 'px';
            }
            return true;
        } catch (e) {
            console.warn('取消停靠失败:', e);
            return false;
        }
    }

    function applyDockPreference(container) {
        const wantDock = getDockPreference();
        if (wantDock) {
            const ok = dockUnderPersonInfoIfPresent(container);
            if (!ok) {
                // 若无法停靠，回退为浮动
                undockContainer(container);
                setDockPreference(false);
            }
        } else {
            undockContainer(container);
        }
    }
    function dockUnderPersonInfoIfPresent(container) {
        try {
            const side = document.querySelector('div.side');
            if (!side) return false;
            const personInfo = side.querySelector('div.module.person-info');
            if (!personInfo) return false;

            // 将容器移动到 person-info 模块之后
            if (personInfo.parentNode) {
                const next = personInfo.nextSibling;
                if (next) {
                    personInfo.parentNode.insertBefore(container, next);
                } else {
                    personInfo.parentNode.appendChild(container);
                }
            }

            // 打上停靠标记并清理绝对定位痕迹
            container.classList.add('docked');
            container.style.left = '';
            container.style.top = '';
            syncDockedWidth(container, personInfo);
            applyDockedColumnLayout(container);
            return true;
        } catch (e) {
            console.warn('停靠到person-info失败:', e);
            return false;
        }
    }

    function syncDockedWidth(container, anchorEl = null) {
        try {
            const side = document.querySelector('div.side');
            let baseEl = anchorEl || (side ? side.querySelector('div.module') : null);
            if (!baseEl && side) baseEl = side;
            if (!baseEl) return;

            const rect = baseEl.getBoundingClientRect();
            const computed = window.getComputedStyle(baseEl);
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingRight = parseFloat(computed.paddingRight) || 0;
            const targetWidth = Math.max(0, rect.width - paddingLeft - paddingRight);
            container.style.width = `${Math.round(targetWidth)}px`;
        } catch (e) {
            console.warn('同步停靠宽度失败:', e);
        }
    }

    function applyDockedColumnLayout(container) {
        try {
            if (!container || !container.classList.contains('docked')) return;
            const width = container.getBoundingClientRect().width;
            const gap = 8; // 与CSS中的gap一致
            const minCell = 120; // 最小列宽，与CSS中的minmax一致
            if (width && width < (minCell * 2 + gap)) {
                // 极窄：强制两列
                container.style.setProperty('grid-template-columns', 'repeat(2, minmax(0, 1fr))', 'important');
            } else {
                // 恢复为CSS的自适应列数
                container.style.removeProperty('grid-template-columns');
            }
        } catch (e) {
            console.warn('应用停靠列数失败:', e);
        }
    }
    function removeTipsModule() {
        try {
            const side = document.querySelector('div.side');
            if (!side) return;
            const firstModule = side.querySelector('div.module');
            if (!firstModule) return;
            const titleEl = firstModule.querySelector('.module-header h2');
            const title = (titleEl && titleEl.textContent) ? titleEl.textContent.trim() : '';
            if (title === '小贴士') {
                firstModule.remove();
            }
        } catch (e) {
            console.warn('移除小贴士模块异常:', e);
        }
    }

    function init() {
        // 加载用户配置
        loadUserConfig();

        // 迁移旧配置格式
        if (FINAL_BUTTONS_CONFIG.some(btn => typeof btn.action === 'function')) {
            FINAL_BUTTONS_CONFIG = ConfigSerializer.migrateOldConfig(FINAL_BUTTONS_CONFIG);
            localStorage.setItem(CONFIG_STORAGE_KEY, ConfigSerializer.serialize(FINAL_BUTTONS_CONFIG));
        }

        // 创建按钮容器
        const container = document.createElement('div');
        container.id = 'quick-actions';
        container.align = 'right';

        // 创建按钮
        FINAL_BUTTONS_CONFIG.forEach((config, index) => {
            const buttonId = `button_${index}_${config.text.replace(/\s+/g, '_')}`;
            container.appendChild(buttonFactory.create(config, index, buttonId));
        });

        document.body.appendChild(container);

        // 创建返回顶部按钮
        const goToTopBtn = document.createElement('div');
        goToTopBtn.id = 'goToTopMuLi';
        goToTopBtn.title = '返回顶部';
        goToTopBtn.innerHTML = '↑';
        goToTopBtn.onclick = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };
        container.appendChild(goToTopBtn);

        // 创建停靠/浮动切换按钮
        const dockToggleBtn = document.createElement('div');
        dockToggleBtn.id = 'dockToggleMuLi';
        dockToggleBtn.title = '停靠/浮动切换';
        dockToggleBtn.innerHTML = '⇄';
        dockToggleBtn.onclick = () => {
            if (container.classList.contains('docked')) {
                if (undockContainer(container)) {
                    setDockPreference(false);
                    muliShowToast('已切换为浮动定位', 1200, 'info');
                }
            } else {
                const ok = dockUnderPersonInfoIfPresent(container);
                if (ok) {
                    setDockPreference(true);
                    muliShowToast('已停靠到侧边信息下方', 1200, 'success');
                    syncDockedWidth(container);
                    applyDockedColumnLayout(container);
                } else {
                    muliShowToast('未找到侧边个人信息模块', 1500, 'warning');
                }
            }
        };
        container.appendChild(dockToggleBtn);

        // 初始化拖拽管理器
        const dragManager = new DragManager(container);
        container.dragManager = dragManager;

        // 恢复冷却状态
        restoreCooldownStates();

        // 创建编辑按钮
        createEditButton();

        // 尝试移除侧边第一个“小贴士”模块（若存在）
        removeTipsModule();

        // 按配置应用停靠/浮动
        applyDockPreference(container);

        // 窗口尺寸变化时，同步停靠宽度
        window.addEventListener('resize', () => {
            if (container.classList.contains('docked')) {
                syncDockedWidth(container);
                applyDockedColumnLayout(container);
            }
        });
    }

    // 可视化编辑-为所有按钮表单建立统一的事件委托监听
    document.addEventListener('input', function (event) {
        const target = event.target;
        // 检查事件是否发生在 .muli-button-form 内的输入元素
        const buttonForm = target.closest('.muli-button-form');
        if (buttonForm) {
            //保存可视化编辑
            collectVisualEditorData();
        }
    });

    // 同样监听 change 事件（用于 select、checkbox 等）
    document.addEventListener('change', function (event) {
        const target = event.target;
        const buttonForm = target.closest('.muli-button-form');
        if (buttonForm) {
            //保存可视化编辑
            collectVisualEditorData();
        }
    });

    // 从可视化编辑器收集数据
    function collectVisualEditorData() {
        const forms = document.querySelectorAll('.muli-button-form');
        const newConfig = [];

        forms.forEach((form, index) => {
            const buttonData = {};

            // 基本设置
            const text = form.querySelector('[name="text"]').value;
            if (!text.trim()) {
                throw new Error(`按钮 ${index + 1}: 按钮文本不能为空`);
            }
            buttonData.text = text;
            buttonData.color = form.querySelector('[name="color"]').value;

            const cooldown = form.querySelector('[name="cooldown"]').value;
            if (cooldown && !isNaN(cooldown) && parseInt(cooldown) > 0) {
                buttonData.cooldown = parseInt(cooldown);
            }

            const cooldownChildren = form.querySelector('[name="cooldownChildren"]').value;
            if (cooldownChildren) {
                buttonData.cooldownChildren = cooldownChildren === 'true' ? true : cooldownChildren;
            }

            const refreshValue = form.querySelector('[name="muliRefresh"]').value;
            if (refreshValue) {
                buttonData.muliRefresh = refreshValue === 'true' ? true : refreshValue;
            }

            // 动作设置
            const actionType = form.querySelector('[name="actionType"]').value;
            buttonData.action = {};
            buttonData.action.type = actionType;
            if (actionType && ACTION_TEMPLATES[actionType]) {
                // 这里简化处理，实际应该根据模板生成代码
                if (actionType === 'sendMsg') {
                    var message = form.querySelector('[name="action_message"]')?.value;
                    var messages = message.split(',');
                    if (messages.length > 1) {
                        buttonData.action.params = messages;
                    } else {
                        buttonData.action.params = message;
                    }
                } else if (actionType === 'promptAndSend') {
                    const promptText = form.querySelector('[name="action_promptText"]')?.value;
                    const defaultValue = form.querySelector('[name="action_defaultValue"]')?.value;
                    const actionCode = form.querySelector('[name="action_actionCode"]')?.value;
                    buttonData.action.params = {};
                    buttonData.action.params.promptText = promptText;
                    buttonData.action.params.defaultValue = defaultValue;
                    buttonData.action.params.actionCode = actionCode;
                } else if (actionType === 'fetchPrivate') {
                    var message = form.querySelector('[name="action_endpoint"]')?.value;
                    var messages = message.split(',');
                    if (messages.length > 1) {
                        buttonData.action.params = messages;
                    } else {
                        buttonData.action.params = message;
                    }
                }
            }

            // 子按钮设置
            const childForms = form.querySelectorAll('.child-button-form');
            if (childForms.length > 0) {
                buttonData.children = [];

                childForms.forEach(childForm => {
                    const childData = {};
                    const childText = childForm.querySelector('[name="text"]').value;
                    if (!childText.trim()) {
                        throw new Error(`按钮 ${index + 1} 的子按钮: 文本不能为空`);
                    }
                    childData.text = childText;

                    const childCooldown = childForm.querySelector('[name="cooldown"]').value;
                    if (childCooldown && !isNaN(childCooldown) && parseInt(childCooldown) > 0) {
                        childData.cooldown = parseInt(childCooldown);
                    }

                    const childRefreshValue = childForm.querySelector('[name="muliRefresh"]').value;
                    if (childRefreshValue) {
                        childData.muliRefresh = childRefreshValue === 'true' ? true : childRefreshValue;
                    }

                    const childActionType = childForm.querySelector('[name="actionType"]').value;
                    childData.action = {};
                    childData.action.type = childActionType;
                    if (childActionType && ACTION_TEMPLATES[childActionType]) {
                        // 这里简化处理，实际应该根据模板生成代码
                        if (childActionType === 'sendMsg') {
                            var message = childForm.querySelector('[name="action_message"]')?.value;
                            var messages = message.split(',');
                            if (messages.length > 1) {
                                childData.action.params = messages;
                            } else {
                                childData.action.params = message;
                            }
                        } else if (childActionType === 'promptAndSend') {
                            const promptText = childForm.querySelector('[name="action_promptText"]')?.value;
                            const defaultValue = childForm.querySelector('[name="action_defaultValue"]')?.value;
                            const actionCode = childForm.querySelector('[name="action_actionCode"]')?.value;
                            childData.action.params = {};
                            childData.action.params.promptText = promptText;
                            childData.action.params.defaultValue = defaultValue;
                            childData.action.params.actionCode = actionCode;
                        } else if (childActionType === 'fetchPrivate') {
                            var message = childForm.querySelector('[name="action_endpoint"]')?.value;
                            var messages = message.split(',');
                            if (messages.length > 1) {
                                childData.action.params = messages;
                            } else {
                                childData.action.params = message;
                            }
                        }
                    }

                    buttonData.children.push(childData);
                });
            }

            newConfig.push(buttonData);
        });

        activeConfig = newConfig;
        updateJsonEditor();
    }

    // 启动脚本
    init();
})();
