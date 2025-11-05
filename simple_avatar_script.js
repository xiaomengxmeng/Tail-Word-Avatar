// ==UserScript==
// @name         头像生成脚本
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  仅头像生成按钮的脚本
// @match        https://fishpi.cn/*
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';
    
    // 预设的颜色组合
    const presetColorCombinations = [
        { name: '紫色系', backgroundColor: 'ffffff,E8D5FF', fontColor: '9933CC,ffffff' },
        { name: '蓝色系', backgroundColor: 'E6F7FF,BAE7FF', fontColor: '1890FF,001529' },
        { name: '绿色系', backgroundColor: 'F6FFED,D9F7BE', fontColor: '52C41A,389E0D' },
        { name: '红色系', backgroundColor: 'FFF1F0,FFCCC7', fontColor: 'F5222D,C41D14' },
        { name: '黄色系', backgroundColor: 'FFFBE6,FFF1B8', fontColor: 'FAAD14,D48806' },
        { name: '黑色系', backgroundColor: 'F5F5F5,D9D9D9', fontColor: '000000,595959' },
        { name: '橙色系', backgroundColor: 'FFF7E6,FFD591', fontColor: 'FA8C16,D46B08' },
        { name: '粉色系', backgroundColor: 'FFF0F6,FFADD6', fontColor: 'EB2F96,C41D7F' },
        { name: '青色系', backgroundColor: 'E6FFFB,B5E8DF', fontColor: '13C2C2,098270' },
        { name: '紫罗兰色', backgroundColor: 'F9F0FF,E9D7FE', fontColor: '9254DE,722ED1' },
        { name: '金色系', backgroundColor: 'FFFBE6,FFF1B8', fontColor: 'FAAD14,CF7C1C' },
        { name: '海蓝色系', backgroundColor: 'E8F4FD,B2DDFF', fontColor: '36CFC9,13C2C2' },
        { name: '紫色到蓝色', backgroundColor: 'E8D5FF,E6F7FF', fontColor: '9933CC,1890FF' },
        { name: '橙色到红色', backgroundColor: 'FFF7E6,FFF1F0', fontColor: 'FA8C16,F5222D' },
        { name: '绿色到青色', backgroundColor: 'F6FFED,E6FFFB', fontColor: '52C41A,13C2C2' },
        { name: '粉色到紫色', backgroundColor: 'FFF0F6,F9F0FF', fontColor: 'EB2F96,9254DE' },
        { name: '蓝色到青色', backgroundColor: 'E6F7FF,E6FFFB', fontColor: '1890FF,13C2C2' },
        { name: '黄色到橙色', backgroundColor: 'FFFBE6,FFF7E6', fontColor: 'FAAD14,FA8C16' }
    ];
    
    // 从localStorage加载配置，如果没有则使用默认配置
    function loadConfig() {
        const savedConfig = localStorage.getItem('avatarGeneratorConfig');
        if (savedConfig) {
            try {
                return JSON.parse(savedConfig);
            } catch (e) {
                console.error('解析保存的配置失败:', e);
            }
        }
        // 默认配置
        return {
            defaultText: '不想桀桀桀',
            generateApiUrl: 'https://fishpi.cn/gen?ver=0.1&scale=0.79',
            backgroundColor: 'ffffff,E8D5FF',
            fontColor: '9933CC,ffffff',
            baseImageUrl: 'https://file.fishpi.cn/2025/08/blob-3d1dec23.png'
        };
    }
    
    // 保存配置到localStorage
    function saveConfig(config) {
        localStorage.setItem('avatarGeneratorConfig', JSON.stringify(config));
    }
    
    // 头像生成配置
    let avatarConfig = loadConfig();

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
            //FishFishFish https://file.fishpi.cn/2025/08/faebd5a59a694b23bceef58d6a12fee4-3457696f.gif
            //![](https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=%E7%88%B1%E8%80%8C%E4%B8%8D%E5%BE%97%20%2D%20%E6%AD%A2%E4%BA%8E%E5%94%87%E9%BD%BF%EF%BC%8C%E6%8E%A9%E4%BA%8E%E5%B2%81%E6%9C%88&url=https://file.fishpi.cn/2025/10/aj1-6b5eb828.gif&backcolor=F5DC78,C8B4FF,ffffff&shadow=0.8&anime=3&way=right&fontway=right&fontcolor=ffffff,F5DC78 "爱而不得 - 止于唇齿，掩于岁月")
            //![](https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=%E7%88%B1%E8%80%8C%E4%B8%8D%E5%BE%97&url=https://file.fishpi.cn/2025/10/aj1-6b5eb828.gif&backcolor=F5DC78,C8B4FF,ffffff&shadow=0.8&anime=3&way=right&fontway=right&fontcolor=ffffff,F5DC78 "爱而不得")
            //![](https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=%E5%9B%9B%E5%AD%A3%E6%9C%89%E4%BD%A0&url=https://file.fishpi.cn/2024/12/0009-4d0c6287.png&backcolor=4daffe&fontcolor=ffffff "四季有你")
            // ![图片表情](https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=Azi%F0%9F%92%9C%F0%9F%92%9C%F0%9F%92%9C&url=https://file.fishpi.cn/2025/07/%E7%B4%AB%E8%89%B2%E5%B0%8F%E4%BB%93%E9%BC%A0GIF%E8%A1%A8%E6%83%859%E7%88%B1%E7%BB%99%E7%BD%91aigeicom-2781678a.gif&backcolor=ffffff,E8D5FF&fontcolor=9933CC,ffffff)
            //![图片表情](https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=%E7%93%A6%E8%BE%BE%E8%A5%BF%E7%93%A6%E6%B3%A1%E6%B3%A1%E8%8C%B6&url=https://file.fishpi.cn/2025/10/17605791587999f873c31-507bde29.gif&backcolor=E8F4FF,ffffff&fontcolor=3366CC,ffffff)
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
                sendMsgApi('小斗士 雷公助我');
            };
            
            // 创建火烧连营按钮
            var fireButton = document.createElement('button');
            fireButton.id = 'fire-button';
            fireButton.textContent = '火';
            fireButton.className = 'red';
            fireButton.setAttribute('style', 'margin-right:5px');
            fireButton.onclick = function() {
                sendMsgApi('小斗士 火烧连营');
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

    // 创建颜色选择面板
    function createColorSelectionPanel() {
        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'avatarColorPanel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            z-index: 9999;
            width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
        `;
        
        // 面板标题
        const title = document.createElement('h3');
        title.textContent = '选择头像颜色组合';
        title.style.marginTop = '0';
        title.style.textAlign = 'center';
        panel.appendChild(title);
        
        // 预设颜色列表
        const colorList = document.createElement('div');
        colorList.style.maxHeight = '300px';
        colorList.style.overflowY = 'auto';
        colorList.style.marginBottom = '15px';
        panel.appendChild(colorList);
        
        // 添加预设颜色选项
        presetColorCombinations.forEach(combo => {
            const option = document.createElement('div');
            option.style.cssText = `
                display: flex;
                align-items: center;
                padding: 10px;
                margin-bottom: 8px;
                border: 1px solid #eee;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            option.onmouseover = () => option.style.backgroundColor = '#f5f5f5';
            option.onmouseout = () => option.style.backgroundColor = 'white';
            
            // 颜色预览
            const preview = document.createElement('div');
            preview.style.cssText = `
                width: 60px;
                height: 30px;
                margin-right: 10px;
                background: linear-gradient(45deg, #${combo.backgroundColor.split(',')[0]}, #${combo.backgroundColor.split(',')[1]});
                border-radius: 4px;
                position: relative;
            `;
            
            // 文字颜色预览
            const textPreview = document.createElement('div');
            textPreview.textContent = 'Aa';
            textPreview.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-weight: bold;
                background: linear-gradient(45deg, #${combo.fontColor.split(',')[0]}, #${combo.fontColor.split(',')[1]});
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            `;
            
            preview.appendChild(textPreview);
            option.appendChild(preview);
            
            // 颜色名称
            const nameSpan = document.createElement('span');
            nameSpan.textContent = combo.name;
            nameSpan.style.flex = 1;
            option.appendChild(nameSpan);
            
            // 点击选择
            option.onclick = () => {
                avatarConfig.backgroundColor = combo.backgroundColor;
                avatarConfig.fontColor = combo.fontColor;
                saveConfig(avatarConfig);
                alert(`已选择${combo.name}颜色组合！`);
                document.body.removeChild(panel);
            };
            
            colorList.appendChild(option);
        });
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.onclick = () => document.body.removeChild(panel);
        panel.appendChild(closeBtn);
        
        // 添加到页面
        document.body.appendChild(panel);
    }
    
    // 打开头像URL设置对话框
    function setAvatarUrl() {
        const newUrl = prompt('请输入新的头像背景图片URL：', avatarConfig.baseImageUrl);
        if (newUrl !== null && newUrl.trim() !== '') {
            avatarConfig.baseImageUrl = newUrl.trim();
            saveConfig(avatarConfig);
            alert('头像背景图片URL已更新！');
        }
    }
    
    // 注册油猴菜单
    GM_registerMenuCommand('设置头像背景URL', setAvatarUrl);
    GM_registerMenuCommand('选择头像颜色组合', createColorSelectionPanel);
    
    // 当页面加载完成时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();