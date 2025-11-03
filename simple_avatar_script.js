// ==UserScript==
// @name         头像生成脚本
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  仅头像生成按钮的脚本
// @match        https://fishpi.cn/*
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';
    
    // 头像生成配置
    const avatarConfig = {
        // 默认头像文字
        defaultText: '不想桀桀桀',
        generateApiUrl: 'https://fishpi.cn/gen?ver=0.1&scale=0.79',
        backgroundColor: 'ffffff,E8D5FF',
        fontColor: '9933CC,ffffff',
        baseImageUrl: 'https://file.fishpi.cn/2025/08/blob-3d1dec23.png'
    };

    // 发送消息的API函数
    function sendMsgApi(msg) {
        var msgData = {
            "content": msg,
            "client": "Web/小尾巴快捷端"
        };
        $.ajax({
            url: "https://fishpi.cn/chat-room/send",
            type: "POST",
            async: false,
            data: JSON.stringify(msgData),
            success: function (e) {
                // 成功回调
            },
            error: function (e) {
                console.error('发送消息失败:', e);
            }
        });
    }

    // 创建按钮区域和按钮
    function createButtons() {
        try {
            // 获取列表
            var x = document.getElementsByClassName('reply')[0];
            if (!x) {
                setTimeout(createButtons, 1000);
                return;
            }

            // 创建 div 图层
            var elve = document.getElementById("elves");
            if (!elve) {
                elve = document.createElement("div");
                elve.id = "elves";
                elve.align = "right";
                x.appendChild(elve);
            }
            
            // 创建冰冰按钮
            var bingbingButton = document.createElement('button');
            bingbingButton.id = 'bingbing-button';
            bingbingButton.textContent = '打劫';
            bingbingButton.className = 'red';
            bingbingButton.setAttribute('style', 'margin-right:5px');
            bingbingButton.onclick = function() {
                sendMsgApi('冰冰 去打劫');
            };
            
            // 创建鸽按钮
            var geButton = document.createElement('button');
            geButton.id = 'ge-button';
            geButton.textContent = '鸽';
            geButton.className = 'red';
            geButton.setAttribute('style', 'margin-right:5px');
            geButton.onclick = function() {
                sendMsgApi('鸽 行行好吧');
            };
            
            // 创建头像生成按钮
            var avatarGenButton = document.createElement('button');
            avatarGenButton.id = 'avatar-gen-button';
            avatarGenButton.textContent = 'Test';
            avatarGenButton.className = 'red';
            avatarGenButton.setAttribute('style', 'margin-right:5px');
            avatarGenButton.onclick = function() {
                const customText = prompt("请输入头像上显示的文字：", avatarConfig.defaultText);
                const textToUse = customText === null || customText.trim() === '' ? avatarConfig.defaultText : customText.trim();
                const encodedText = encodeURIComponent(textToUse);
                const avatarUrl = `https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=${encodedText}&url=${avatarConfig.baseImageUrl}&backcolor=${avatarConfig.backgroundColor}&fontcolor=${avatarConfig.fontColor}`;
                sendMsgApi(`![图片表情](${avatarUrl})`);
            };
            
            // 创建冰冰来个红包按钮
            var bingbingHongbaoButton = document.createElement('button');
            bingbingHongbaoButton.id = 'bingbing-hongbao-button';
            bingbingHongbaoButton.textContent = '红包';
            bingbingHongbaoButton.className = 'red';
            bingbingHongbaoButton.setAttribute('style', 'margin-right:5px');
            bingbingHongbaoButton.onclick = function() {
                sendMsgApi('冰冰 来个红包');
            };
            
            // 创建雷公助我按钮
            var lightningButton = document.createElement('button');
            lightningButton.id = 'lightning-button';
            lightningButton.textContent = '雷';
            lightningButton.className = 'red';
            lightningButton.setAttribute('style', 'margin-right:5px');
            lightningButton.onclick = function() {
                sendMsgApi('雷公助我');
            };
            
            // 创建火烧连营按钮
            var fireButton = document.createElement('button');
            fireButton.id = 'fire-button';
            fireButton.textContent = '火';
            fireButton.className = 'red';
            fireButton.setAttribute('style', 'margin-right:5px');
            fireButton.onclick = function() {
                sendMsgApi('火烧连营');
            };
            
            // 添加按钮到图层，避免重复添加
            if (!document.getElementById('bingbing-button')) elve.appendChild(bingbingButton);
            if (!document.getElementById('ge-button')) elve.appendChild(geButton);
            if (!document.getElementById('bingbing-hongbao-button')) elve.appendChild(bingbingHongbaoButton);
            if (!document.getElementById('lightning-button')) elve.appendChild(lightningButton);
            if (!document.getElementById('fire-button')) elve.appendChild(fireButton);
            if (!document.getElementById('avatar-gen-button')) elve.appendChild(avatarGenButton);
        } catch (e) {
            console.error('创建按钮失败:', e);
            setTimeout(createButtons, 2000);
        }
    }

    // 初始化函数
    function init() {
        createButtons();
        
        // 等待WebSocket连接建立后重试
        let retryCount = 0;
        const maxRetries = 30;
        const retryInterval = 1000;
        
        const retryTimer = setInterval(() => {
            if (retryCount < maxRetries) {
                createButtons();
                retryCount++;
            } else {
                clearInterval(retryTimer);
            }
        }, retryInterval);
    }

    // 当页面加载完成时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();