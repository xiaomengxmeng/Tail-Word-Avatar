// ==UserScript==
// @name         按钮管理面板
// @namespace    http://tampermonkey.net/
// @version      1.0.17
// @description  管理聊天按钮的添加、编辑、删除和保存
// @author       ZeroDream
// @match        https://fishpi.cn/*
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        unsafeWindow
// @license MIT

// ==/UserScript==

(function () {
    'use strict';
    const version_us = "v1.0.17";
    // 按钮数据结构：{id, textContent, message, className , count}
    let buttonsConfig = [];
    const STORAGE_KEY = 'customButtonsConfig';
    const TEST_MODE_KEY = 'buttonTestMode';
    let isTestMode = false;
    const DEFAULT_BUTTONS = [
        { id: 'default-bingbing', textContent: '打劫', message: '冰冰 去打劫', className: 'red', count: 0 },
        { id: 'default-ge', textContent: '鸽', message: '鸽 行行好吧', className: 'red', count: 0 }
    ];
    
    // 颜色选项 - 全局常量
    const colorOptions = [
        { value: 'red', text: '红色' },
        { value: 'blue', text: '蓝色' },
        { value: 'green', text: '绿色' },
        { value: 'gray', text: '灰色' },
        { value: 'orange', text: '橙色' }
    ];
    
    // 更新按钮列表的函数 - 全局函数
    window.updateButtonsList = function() {
        const listContainer = document.getElementById('buttons-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (buttonsConfig.length === 0) {
            const emptyText = document.createElement('div');
            emptyText.textContent = '暂无按钮，请添加新按钮';
            emptyText.style.textAlign = 'center';
            emptyText.style.color = '#999';
            emptyText.style.padding = '20px';
            listContainer.appendChild(emptyText);
            return;
        }
        
        buttonsConfig.forEach((button, index) => {
            const buttonItem = document.createElement('div');
            buttonItem.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px;
                background: #fff;
                border: 1px solid #e8e8e8;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                transition: all 0.3s ease;
            `;
            
            // 添加悬停效果
            buttonItem.addEventListener('mouseenter', () => {
                buttonItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                buttonItem.style.borderColor = '#d9d9d9';
            });
            
            buttonItem.addEventListener('mouseleave', () => {
                buttonItem.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                buttonItem.style.borderColor = '#e8e8e8';
            });
            
            // 按钮信息
            const buttonInfo = document.createElement('div');
            buttonInfo.style.flex = '1';
            buttonInfo.style.minWidth = '0'; // 确保flex项可以收缩
            buttonInfo.style.marginRight = '15px';
            buttonInfo.style.overflow = 'hidden';
            
            const buttonText = document.createElement('div');
            buttonText.style.fontWeight = '500';
            buttonText.style.marginBottom = '6px';
            buttonText.style.color = '#262626';
            buttonText.style.fontSize = '14px';
            buttonText.style.whiteSpace = 'nowrap';
            buttonText.style.overflow = 'hidden';
            buttonText.style.textOverflow = 'ellipsis';
            buttonText.title = button.textContent; // 添加tooltip显示完整文本
            buttonText.textContent = button.textContent;
            
            const buttonMsg = document.createElement('div');
            buttonMsg.style.fontSize = '12px';
            buttonMsg.style.color = '#8c8c8c';
            buttonMsg.style.lineHeight = '1.4';
            buttonMsg.style.whiteSpace = 'nowrap';
            buttonMsg.style.overflow = 'hidden';
            buttonMsg.style.textOverflow = 'ellipsis';
            buttonMsg.title = '消息: ' + button.message; // 添加tooltip显示完整文本
            buttonMsg.textContent = '消息: ' + button.message;
            
            buttonInfo.appendChild(buttonText);
            
            // 点击次数显示
            const buttonCount = document.createElement('div');
            buttonCount.style.fontSize = '12px';
            buttonCount.style.color = '#1890ff';
            buttonCount.style.marginBottom = '4px';
            buttonCount.textContent = '点击次数: ' + button.count;
            buttonInfo.appendChild(buttonCount);
            
            buttonInfo.appendChild(buttonMsg);
            
            // 操作按钮容器
            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '8px';
            
            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
            editBtn.style.cssText = `
                padding: 6px 12px;
                background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(250, 173, 20, 0.2);
            `;
            
            editBtn.addEventListener('mouseenter', () => {
                editBtn.style.background = 'linear-gradient(135deg, #ffc53d 0%, #faad14 100%)';
                editBtn.style.boxShadow = '0 4px 12px rgba(250, 173, 20, 0.3)';
                editBtn.style.transform = 'translateY(-1px)';
            });
            
            editBtn.addEventListener('mouseleave', () => {
                editBtn.style.background = 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)';
                editBtn.style.boxShadow = '0 2px 4px rgba(250, 173, 20, 0.2)';
                editBtn.style.transform = 'translateY(0)';
            });
            
            editBtn.onclick = function() {
                window.editButton(index);
            };
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.style.cssText = `
                padding: 6px 12px;
                background: linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(245, 34, 45, 0.2);
            `;
            
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.background = 'linear-gradient(135deg, #ff4d4f 0%, #f5222d 100%)';
                deleteBtn.style.boxShadow = '0 4px 12px rgba(245, 34, 45, 0.3)';
                deleteBtn.style.transform = 'translateY(-1px)';
            });
            
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.background = 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)';
                deleteBtn.style.boxShadow = '0 2px 4px rgba(245, 34, 45, 0.2)';
                deleteBtn.style.transform = 'translateY(0)';
            });
            
            deleteBtn.onclick = function() {
                if (confirm('确定要删除按钮「' + button.textContent + '」吗？')) {
                    // 从配置中删除
                    buttonsConfig.splice(index, 1);
                    saveButtonsConfig();
                    
                    // 重新创建按钮
                    createButtons();
                    
                    // 更新管理面板
                    updateButtonsList();
                    
                    // 显示成功提示
                    showNotification('按钮删除成功！');
                }
            };
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            
            buttonItem.appendChild(buttonInfo);
            buttonItem.appendChild(actionsDiv);
            
            listContainer.appendChild(buttonItem);
        });
    }
    
    // 编辑按钮的函数 - 全局函数
window.editButton = function(index) {
        const button = buttonsConfig[index];
        
        // 创建编辑对话框
        const editDialog = document.createElement('div');
        editDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
        `;
        
        // 对话框标题
        const dialogTitle = document.createElement('h4');
        dialogTitle.textContent = '编辑按钮';
        dialogTitle.style.marginTop = '0';
        dialogTitle.style.textAlign = 'center';
        dialogTitle.style.marginBottom = '15px';
        editDialog.appendChild(dialogTitle);
        
        // 按钮文本输入
        const textInputDiv = document.createElement('div');
        textInputDiv.style.marginBottom = '10px';
        const textLabel = document.createElement('label');
        textLabel.textContent = '按钮文本: ';
        textLabel.style.display = 'inline-block';
        textLabel.style.width = '80px';
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = button.textContent;
        textInput.style.width = 'calc(100% - 90px)';
        textInput.style.padding = '5px';
        textInputDiv.appendChild(textLabel);
        textInputDiv.appendChild(textInput);
        editDialog.appendChild(textInputDiv);
        
        // 按钮消息输入
        const msgInputDiv = document.createElement('div');
        msgInputDiv.style.marginBottom = '10px';
        const msgLabel = document.createElement('label');
        msgLabel.textContent = '触发消息: ';
        msgLabel.style.display = 'inline-block';
        msgLabel.style.width = '80px';
        const msgInput = document.createElement('input');
        msgInput.type = 'text';
        msgInput.value = button.message;
        msgInput.style.width = 'calc(100% - 90px)';
        msgInput.style.padding = '5px';
        msgInputDiv.appendChild(msgLabel);
        msgInputDiv.appendChild(msgInput);
        editDialog.appendChild(msgInputDiv);
        
        // 按钮颜色选择
        const colorSelectDiv = document.createElement('div');
        colorSelectDiv.style.marginBottom = '15px';
        const colorLabel = document.createElement('label');
        colorLabel.textContent = '按钮颜色: ';
        colorLabel.style.display = 'inline-block';
        colorLabel.style.width = '80px';
        const colorSelect = document.createElement('select');
        colorSelect.style.width = 'calc(100% - 90px)';
        colorSelect.style.padding = '5px';
        
        colorOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            if (option.value === button.className) {
                opt.selected = true;
            }
            colorSelect.appendChild(opt);
        });
        
        colorSelectDiv.appendChild(colorLabel);
        colorSelectDiv.appendChild(colorSelect);
        editDialog.appendChild(colorSelectDiv);
        
        // 按钮容器
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.gap = '10px';
        buttonsDiv.style.justifyContent = 'flex-end';
        
        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            padding: 6px 12px;
            background: #f0f0f0;
            color: #333;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        cancelBtn.onclick = function() {
            document.body.removeChild(editDialog);
        };
        
        // 保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            padding: 6px 12px;
            background: #52c41a;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        saveBtn.onclick = function() {
            const buttonText = textInput.value.trim();
            const buttonMsg = msgInput.value.trim();
            
            if (!buttonText || !buttonMsg) {
                alert('请填写按钮文本和触发消息');
                return;
            }
            
            // 更新按钮配置
            buttonsConfig[index] = {
                id: button.id, // 保留原ID
                textContent: buttonText,
                message: buttonMsg,
                className: colorSelect.value,
                count: button.count || 0 // 保留原始点击次数，如果不存在则设为0
            };
            
            saveButtonsConfig();
            
            // 重新创建按钮
            createButtons();
            
            // 更新管理面板 - 使用全局函数
            window.updateButtonsList();
            
            // 关闭编辑对话框
            document.body.removeChild(editDialog);
            
            // 显示成功提示
            showNotification('按钮更新成功！');
        };
        
        buttonsDiv.appendChild(cancelBtn);
        buttonsDiv.appendChild(saveBtn);
        editDialog.appendChild(buttonsDiv);
        
        // 添加到页面
        document.body.appendChild(editDialog);
    }
    
    // 发送消息的API函数
    function sendMsgApi(msg) {
        var msgData = {
            "content": msg,
            "client": "Web/按钮管理面板"
        };
        $.ajax({
            url: "https://fishpi.cn/chat-room/send",
            type: "POST",
            async: false,
            data: JSON.stringify(msgData),
            success: function (e) {
                console.log('消息发送成功');
            },
            error: function (e) {
                console.error('发送消息失败:', e);
            }
        });
    }
    
    // 从localStorage加载按钮配置
    function loadButtonsConfig() {
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEY);
            if (savedConfig) {
                buttonsConfig = JSON.parse(savedConfig);
                // 确保每个按钮都有count属性
                buttonsConfig.forEach(button => {
                    if (!button.hasOwnProperty('count')) {
                        button.count = 0;
                    }
                });
                console.log('已加载保存的按钮配置:', buttonsConfig);
            } else {
                // 使用默认按钮配置
                buttonsConfig = DEFAULT_BUTTONS;
                saveButtonsConfig();
                console.log('使用默认按钮配置');
            }
        } catch (e) {
            console.error('加载按钮配置失败:', e);
            buttonsConfig = DEFAULT_BUTTONS;
        }
    }
    
    // 保存按钮配置到localStorage
    function saveButtonsConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(buttonsConfig));
            console.log('按钮配置已保存');
        } catch (e) {
            console.error('保存按钮配置失败:', e);
            alert('保存按钮配置失败，请重试');
        }
    }
    
    // 创建按钮到界面
    function createButtons() {
        try {
            // 获取回复区域
            var x = document.getElementsByClassName('reply')[0];
            if (!x) {
                console.log('未找到回复区域，稍后重试');
                setTimeout(createButtons, 1000);
                return;
            }

            // 创建或获取按钮容器（仅用于初始定位参考，不再作为按钮的父元素）
                var buttonContainer = document.getElementById("custom-buttons-container");
                if (!buttonContainer) {
                    buttonContainer = document.createElement("div");
                    buttonContainer.id = "custom-buttons-container";
                    buttonContainer.align = "right";
                    buttonContainer.style.marginBottom = "10px"; // 保留原有的底部边距
                    
                    // 设置容器样式（仅作为定位参考点）
                    buttonContainer.style.position = 'relative';
                    buttonContainer.style.display = 'block';
                    buttonContainer.style.width = '100%';
                    buttonContainer.style.minHeight = '50px';
                    buttonContainer.style.zIndex = '99';
                    buttonContainer.style.backgroundColor = 'transparent';
                    buttonContainer.style.border = 'none';
                    buttonContainer.style.padding = '0';
                    buttonContainer.style.cursor = 'default';
                    
                    // 添加到回复区域，作为初始定位参考
                    x.appendChild(buttonContainer);
                } else {
                    // 确保容器样式正确
                    buttonContainer.style.position = 'relative';
                    buttonContainer.style.display = 'block';
                    buttonContainer.style.width = '100%';
                    buttonContainer.style.padding = '0';
                }
                
                // 先移除所有现有的自定义按钮，避免重复
                const existingButtons = document.querySelectorAll('.custom-button');
                existingButtons.forEach(btn => {
                    if (btn.parentNode === document.body) {
                        document.body.removeChild(btn);
                    }
                });
            
            // 为每个按钮应用保存的位置，并返回是否有保存的位置
            function applyButtonPosition(buttonId, buttonElement) {
                try {
                    const positionKey = 'button_position_' + buttonId;
                    const savedPosition = localStorage.getItem(positionKey);
                    if (savedPosition) {
                        const position = JSON.parse(savedPosition);
                        buttonElement.style.position = 'absolute';
                        buttonElement.style.left = position.left + 'px';
                        buttonElement.style.top = position.top + 'px';
                        buttonElement.style.margin = '0'; // 移除边距，使用绝对定位
                        return true; // 返回true表示有保存的位置并已应用
                    }
                    return false; // 返回false表示没有保存的位置
                } catch (e) {
                    console.error('应用按钮位置失败:', e);
                    return false; // 出错时也返回false
                }
            }
            
            // 保存按钮位置
            function saveButtonPosition(buttonId, buttonElement) {
                try {
                    const positionKey = 'button_position_' + buttonId;
                    const position = {
                        left: parseInt(buttonElement.style.left || 0),
                        top: parseInt(buttonElement.style.top || 0)
                    };
                    localStorage.setItem(positionKey, JSON.stringify(position));
                } catch (e) {
                    console.error('保存按钮位置失败:', e);
                }
            }
            
            // 重置所有按钮位置
            function resetAllButtonsPosition() {
                try {
                    // 清除localStorage中所有按钮位置数据
                    for (let key in localStorage) {
                        if (key.startsWith('button_position_')) {
                            localStorage.removeItem(key);
                        }
                    }
                    
                    // 重新创建按钮以应用默认位置
                    createButtons();
                    
                    console.log('所有按钮位置已重置');
                } catch (e) {
                    console.error('重置按钮位置失败:', e);
                    showNotification('重置失败，请刷新页面重试', 'error');
                }
            }
            
            // 设置拖动事件（带点击取消功能） - 参考fish_favor_system.js实现
            function setupDragEventsWithClickCancel(element, dragElement, clickTimeout, buttonId) {
                let isDragging = false;
                let offsetX, offsetY;
                let hasMoved = false;
                const originalZIndex = element.style.zIndex; // 保存原始z-index
                
                // 计算鼠标相对于元素左上角的偏移量
                const elementRect = element.getBoundingClientRect();
                offsetX = event.clientX - elementRect.left;
                offsetY = event.clientY - elementRect.top;
                
                // 改变拖动过程中的样式
                element.style.opacity = '0.8';
                element.style.transform = 'scale(1.05)'; // 轻微放大
                element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'; // 增强阴影
                element.style.cursor = 'grabbing';
                document.body.style.cursor = 'grabbing';
                element.style.zIndex = '1000'; // 临时提升z-index，确保拖动时在最上层
                
                // 鼠标移动事件处理
                function handleMouseMove(e) {
                    e.stopPropagation(); // 阻止事件冒泡
                    
                    // 如果移动超过5px，则视为拖动
                    if (!hasMoved) {
                        const movedX = Math.abs(e.clientX - (elementRect.left + offsetX));
                        const movedY = Math.abs(e.clientY - (elementRect.top + offsetY));
                        hasMoved = (movedX > 5 || movedY > 5);
                        
                        // 如果开始拖动，取消点击事件
                        if (hasMoved && clickTimeout) {
                            clearTimeout(clickTimeout);
                        }
                    }
                    
                    if (hasMoved) {
                        isDragging = true;
                        
                        // 计算新位置（考虑滚动）
                        const left = e.clientX - offsetX + window.scrollX;
                        const top = e.clientY - offsetY + window.scrollY;
                        
                        // 应用新位置
                        element.style.left = left + 'px';
                        element.style.top = top + 'px';
                    }
                }
                
                // 鼠标释放事件处理
                function handleMouseUp(e) {
                    e.stopPropagation(); // 阻止事件冒泡
                    
                    // 移除事件监听器
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    
                    // 恢复样式
                    element.style.opacity = '1';
                    element.style.transform = 'scale(1)'; // 恢复原始大小
                    element.style.boxShadow = ''; // 恢复原始阴影
                    element.style.cursor = 'grab';
                    document.body.style.cursor = 'default';
                    element.style.zIndex = originalZIndex; // 恢复原始z-index
                    
                    // 如果有拖动，保存位置
                    if (isDragging) {
                        saveButtonPosition(buttonId, element);
                    }
                }
                
                // 添加鼠标移动和释放事件监听器到document
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                // 阻止默认行为
                event.preventDefault();
                
                // 防止文本选中
                event.preventDefault();
            }
            
            // 设置按钮独立拖动事件 - 参考fish_favor_system.js实现
            function setupButtonDrag(buttonId, buttonElement) {
                // 确保按钮初始样式正确
                buttonElement.style.position = 'absolute';
                buttonElement.style.margin = '0';
                buttonElement.style.zIndex = '100';
                buttonElement.style.cursor = 'grab';
                buttonElement.style.userSelect = 'none';
                
                // 保存原始点击处理
                const originalOnClick = buttonElement.onclick;
                
                // 移除原有的onclick处理，避免重复触发
                buttonElement.onclick = null;
                
                // 重写mousedown事件，处理拖动和点击
                buttonElement.onmousedown = function(e) {
                    if (e.target === buttonElement) {
                        // 延迟执行点击事件，优先处理拖动
                        const clickTimeout = setTimeout(() => {
                            if (originalOnClick) originalOnClick();
                        }, 200);
                        
                        // 设置拖动事件，拖动时取消点击
                        setupDragEventsWithClickCancel(buttonElement, buttonElement, clickTimeout, buttonId);
                    }
                };
                
                // 鼠标进入时设置为拖动光标
                buttonElement.onmouseenter = function() {
                    this.style.cursor = 'grab';
                };
                
                // 鼠标离开时恢复默认光标
                buttonElement.onmouseleave = function() {
                    this.style.cursor = 'default';
                };
            }
            
            // 根据按钮类型获取对应的样式
            function getButtonStyleByType(buttonType) {
                // 优化后的按钮基础样式，更接近好感管理按钮的风格
                const baseStyle = `
                    padding: 6px 12px;
                    margin: 0; // 移除边距，避免影响绝对定位
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    outline: none;
                    border: 1px solid;
                    position: absolute; // 设置为绝对定位
                    z-index: 100;
                    font-weight: 500;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    user-select: none; // 防止拖动时选中文本
                `;
                
                // 根据不同的按钮类型设置优化后的颜色方案
                switch(buttonType) {
                    case 'red':
                        return baseStyle + `
                            background-color: #fff1f0;
                            border-color: #ffccc7;
                            color: #f5222d;
                        `;
                    case 'blue':
                        return baseStyle + `
                            background-color: #f0f8ff;
                            border-color: #b8e2ff;
                            color: #1890ff;
                        `;
                    case 'green':
                        return baseStyle + `
                            background-color: #f6ffed;
                            border-color: #b7eb8f;
                            color: #52c41a;
                        `;
                    case 'gray':
                        return baseStyle + `
                            background-color: #fafafa;
                            border-color: #d9d9d9;
                            color: #8c8c8c;
                        `;
                    case 'orange':
                        return baseStyle + `
                            background-color: #fff7e6;
                            border-color: #ffd591;
                            color: #fa8c16;
                        `;
                    default:
                        // 默认使用蓝色样式，与fish_favor_system.js中的主按钮样式一致
                        return baseStyle + `
                            background-color: #f0f8ff;
                            border-color: #b8e2ff;
                            color: #1890ff;
                        `;
                }
            }
            
            // 为按钮添加悬停效果
            function addHoverEffects(button, buttonType) {
                // 悬停时的优化效果，增加阴影和微缩放
                const handleMouseEnter = function() {
                    this.style.transform = 'translateY(-1px)';
                    this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                };
                
                const handleMouseLeave = function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                };
                
                // 添加通用的悬停效果
                button.addEventListener('mouseenter', handleMouseEnter);
                button.addEventListener('mouseleave', handleMouseLeave);
                
                // 根据不同的按钮类型设置特定的颜色变化
                switch(buttonType) {
                    case 'red':
                        button.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#ff000020';
                            this.style.borderColor = '#ff4d4f';
                        });
                        button.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = '#fff1f0';
                            this.style.borderColor = '#ffccc7';
                        });
                        break;
                    case 'blue':
                        button.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#e6f7ff';
                            this.style.borderColor = '#69c0ff';
                        });
                        button.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = '#f0f8ff';
                            this.style.borderColor = '#b8e2ff';
                        });
                        break;
                    case 'green':
                        button.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#f0fff4';
                            this.style.borderColor = '#52c41a';
                        });
                        button.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = '#f6ffed';
                            this.style.borderColor = '#b7eb8f';
                        });
                        break;
                    case 'gray':
                        button.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#f5f5f5';
                            this.style.borderColor = '#bfbfbf';
                        });
                        button.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = '#fafafa';
                            this.style.borderColor = '#d9d9d9';
                        });
                        break;
                    case 'orange':
                        button.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#fffbe6';
                            this.style.borderColor = '#ffab00';
                        });
                        button.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = '#fff7e6';
                            this.style.borderColor = '#ffd591';
                        });
                        break;
                    default:
                        // 默认使用蓝色的悬停效果
                        button.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#e6f7ff';
                            this.style.borderColor = '#69c0ff';
                        });
                        button.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = '#f0f8ff';
                            this.style.borderColor = '#b8e2ff';
                        });
                }
            }
            
            // 创建自动计算初始位置的函数
            function calculateInitialPosition(index, totalButtons) {
                const containerRect = buttonContainer.getBoundingClientRect();
                const buttonWidth = 80; // 预估按钮宽度
                const buttonHeight = 36; // 预估按钮高度
                const spacing = 10; // 按钮间距
                
                // 计算初始位置，基于容器位置，并避免堆叠
                const rows = Math.ceil(totalButtons / 4); // 每行最多4个按钮
                const row = Math.floor(index / 4);
                const col = index % 4;
                
                // 从容器右侧开始排列
                const left = containerRect.right - (col + 1) * (buttonWidth + spacing) + window.scrollX;
                const top = containerRect.top + row * (buttonHeight + spacing) + window.scrollY;
                
                return { left, top };
            }
            
            // 创建每个按钮
            buttonsConfig.forEach((button, index) => {
                var btn = document.createElement('button');
                btn.id = button.id;
                btn.textContent = button.textContent;
                btn.className = 'custom-button ' + (button.className || 'blue'); // 添加custom-button类以便后续选择
                
                // 应用根据类型的样式，确保按钮是绝对定位
                const buttonType = button.className || 'blue';
                const baseStyle = getButtonStyleByType(buttonType);
                btn.setAttribute('style', baseStyle + '; position: absolute; z-index: 100;');
                
                btn.onclick = function() {
                    // 添加测试模式判断
                    if (isTestMode) {
                        // 测试模式下显示反馈信息
                        showNotification(`测试模式: 不会发送消息 - "${button.message}"`, 'blue');
                    } else {
                        // 非测试模式下正常发送消息
                        sendMsgApi(button.message);
                    }
                    // 增加点击次数
                    button.count++;
                    saveButtonsConfig();
                };
                
                // 添加悬停效果
                addHoverEffects(btn, buttonType);
                
                // 应用保存的位置，如果没有保存的位置则使用自动计算的位置
                const hasSavedPosition = applyButtonPosition(button.id, btn);
                if (!hasSavedPosition) {
                    const position = calculateInitialPosition(index, buttonsConfig.length);
                    btn.style.left = position.left + 'px';
                    btn.style.top = position.top + 'px';
                }
                
                // 设置拖动功能
                setupButtonDrag(button.id, btn);
                
                // 将按钮添加到document.body而不是buttonContainer
                document.body.appendChild(btn);
            });
            
            // 添加管理按钮
            var manageButton = document.createElement('button');
            manageButton.id = 'button-manager-button';
            manageButton.textContent = '管理';
            manageButton.className = 'custom-button blue';
            
            // 应用与其他按钮一致的样式，确保按钮是绝对定位
            manageButton.setAttribute('style', getButtonStyleByType('blue') + '; position: absolute; z-index: 100;');
            
            // 添加悬停效果
            addHoverEffects(manageButton, 'blue');
            
            // 为管理按钮计算初始位置（放在其他按钮上方）
            const manageButtonPosition = calculateInitialPosition(buttonsConfig.length, buttonsConfig.length + 1);
            manageButton.style.left = manageButtonPosition.left + 'px';
            manageButton.style.top = manageButtonPosition.top + 'px';
            
            // 先尝试应用保存的位置
            applyButtonPosition('button-manager-button', manageButton);
            
            // 设置拖动功能
            setupButtonDrag('button-manager-button', manageButton);
            
            manageButton.onclick = openButtonManagerPanel;
            
            // 将管理按钮添加到document.body而不是buttonContainer
            document.body.appendChild(manageButton);
            
        } catch (e) {
            console.error('创建按钮失败:', e);
            setTimeout(createButtons, 2000);
        }
    }
    
    // 按钮位置存储键名
    const BUTTON_POSITION_KEY = 'custom_buttons_position';
    
    // 生成唯一ID
    function generateUniqueId() {
        return 'custom-button-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }
    
    // 应用保存的按钮位置
    function applySavedPosition(element) {
        try {
            const savedPosition = localStorage.getItem(BUTTON_POSITION_KEY);
            if (savedPosition) {
                const position = JSON.parse(savedPosition);
                element.style.left = position.left + 'px';
                element.style.top = position.top + 'px';
            }
        } catch (e) {
            console.error('应用保存位置失败:', e);
        }
    }
    
    // 保存按钮位置到localStorage
    function saveButtonPosition(element) {
        try {
            const position = {
                left: parseInt(element.style.left || 0),
                top: parseInt(element.style.top || 0)
            };
            localStorage.setItem(BUTTON_POSITION_KEY, JSON.stringify(position));
            console.log('按钮位置保存成功:', position);
        } catch (e) {
            console.error('保存按钮位置失败:', e);
        }
    }
    
    // 设置拖动事件（带点击取消功能）
    function setupDragEventsWithClickCancel(element) {
        let isDragging = false;
        let offsetX, offsetY;
        let hasMoved = false;
        
        // 计算鼠标相对于元素左上角的偏移量
        const elementRect = element.getBoundingClientRect();
        offsetX = event.clientX - elementRect.left;
        offsetY = event.clientY - elementRect.top;
        
        // 改变拖动过程中的样式
        element.style.opacity = '0.8';
        
        // 鼠标移动事件处理
        function handleMouseMove(e) {
            // 如果移动超过5px，则视为拖动
            if (!hasMoved) {
                const movedX = Math.abs(e.clientX - (elementRect.left + offsetX));
                const movedY = Math.abs(e.clientY - (elementRect.top + offsetY));
                hasMoved = (movedX > 5 || movedY > 5);
            }
            
            if (hasMoved) {
                isDragging = true;
                
                // 计算新位置（考虑滚动）
                const left = e.clientX - offsetX + window.scrollX;
                const top = e.clientY - offsetY + window.scrollY;
                
                // 应用新位置
                element.style.left = left + 'px';
                element.style.top = top + 'px';
            }
        }
        
        // 鼠标释放事件处理
        function handleMouseUp() {
            // 移除事件监听器
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // 恢复样式
            element.style.opacity = '1';
            
            // 如果有拖动，保存位置
            if (isDragging) {
                saveButtonPosition(element);
            }
            // 拖动结束后，如果位置有保存，则保持绝对定位；否则恢复相对定位
            if (!localStorage.getItem(BUTTON_POSITION_KEY)) {
                element.style.position = 'relative';
            } else {
                element.style.position = 'absolute';
            }
        }
        
        // 添加鼠标移动和释放事件监听器到document
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // 防止文本选中
        event.preventDefault();
    }
    
    // 导入按钮配置
    function importButtonsConfig() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const importData = JSON.parse(event.target.result);
                        
                        if (!importData.buttons || !Array.isArray(importData.buttons)) {
                            showNotification('无效的导入文件格式', 'error');
                            return;
                        }
                        
                        // 验证按钮数据结构
                        const isValid = importData.buttons.every(button => 
                            button.id && button.textContent && button.message && button.className
                        );
                        
                        if (!isValid) {
                            showNotification('导入文件数据不完整', 'error');
                            return;
                        }
                        
                        // 更新按钮配置
                        buttonsConfig = importData.buttons;
                        
                        // 确保每个按钮都有count属性
                        buttonsConfig.forEach(button => {
                            if (!button.hasOwnProperty('count')) {
                                button.count = 0;
                            }
                        });
                        
                        // 保存并更新UI
                        saveButtonsConfig();
                        createButtons();
                        // 如果管理面板已打开，更新列表
                        if (document.getElementById('buttons-manager-panel')) {
                            updateButtonsList();
                        }
                        
                        showNotification('配置导入成功！', 'success');
                    } catch (parseError) {
                        console.error('解析导入文件失败:', parseError);
                        showNotification('解析导入文件失败', 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        } catch (e) {
            console.error('导入配置失败:', e);
            showNotification('配置导入失败', 'error');
        }
    }
    
    // 导出按钮配置为JSON文件
    function exportButtonsConfig() {
        try {
            const exportData = {
                version: version_us,
                exportDate: new Date().toISOString(),
                buttons: buttonsConfig
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'tail-button-config.json';
            link.click();
            
            URL.revokeObjectURL(url);
            showNotification('配置导出成功！', 'success');
        } catch (e) {
            console.error('导出配置失败:', e);
            showNotification('配置导出失败', 'error');
        }
    }
    
    // 打开按钮管理面板
    function openButtonManagerPanel() {
        // 检查是否已存在面板
        const existingPanel = document.getElementById('button-manager-panel');
        if (existingPanel) {
            document.body.removeChild(existingPanel);
        }
        
        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'button-manager-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff;
            border: 1px solid #e8e8e8;
            border-radius: 12px;
            padding: 0;
            z-index: 9999;
            width: 520px;
            max-height: 75vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            transition: box-shadow 0.3s ease;
        `;
        
        // 添加面板悬停效果
        panel.addEventListener('mouseenter', () => {
            panel.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
        });
        
        panel.addEventListener('mouseleave', () => {
            panel.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
        });
        
        // 创建可拖动的标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px 12px 0 0;
            cursor: move;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        // 面板标题
        const title = document.createElement('h3');
        title.textContent = '按钮管理面板';
        title.style.margin = '0';
        title.style.fontSize = '18px';
        title.style.fontWeight = '600';
        titleBar.appendChild(title);
        
        // 标题栏关闭按钮
        const titleCloseBtn = document.createElement('button');
        titleCloseBtn.innerHTML = '×';
        titleCloseBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s ease;
        `;
        
        titleCloseBtn.onclick = function() {
            document.body.removeChild(panel);
        };
        
        titleCloseBtn.addEventListener('mouseenter', () => {
            titleCloseBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        
        titleCloseBtn.addEventListener('mouseleave', () => {
            titleCloseBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        
        titleBar.appendChild(titleCloseBtn);
        panel.appendChild(titleBar);
        
        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        `;
        panel.appendChild(contentContainer);
        
        // 添加新按钮区域
        const addButtonSection = document.createElement('div');
        addButtonSection.style.cssText = `
            background: #fafafa;
            border: 2px dashed #e1e5e9;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        `;
        
        addButtonSection.addEventListener('mouseenter', () => {
            addButtonSection.style.borderColor = '#667eea';
            addButtonSection.style.background = '#f0f2ff';
        });
        
        addButtonSection.addEventListener('mouseleave', () => {
            addButtonSection.style.borderColor = '#e1e5e9';
            addButtonSection.style.background = '#fafafa';
        });
        
        const addTitle = document.createElement('h4');
        addTitle.textContent = '添加新按钮';
        addTitle.style.marginTop = '0';
        addTitle.style.marginBottom = '20px';
        addTitle.style.color = '#333';
        addTitle.style.fontSize = '16px';
        addButtonSection.appendChild(addTitle);
        
        // 按钮文本输入
        const textLabel = document.createElement('div');
        textLabel.textContent = '按钮文本';
        textLabel.style.marginBottom = '8px';
        textLabel.style.fontWeight = '500';
        textLabel.style.color = '#555';
        addButtonSection.appendChild(textLabel);
        
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.placeholder = '按钮显示的文本';
        textInput.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 20px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
            transition: all 0.3s ease;
            outline: none;
        `;
        
        textInput.addEventListener('focus', () => {
            textInput.style.borderColor = '#667eea';
            textInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });
        
        textInput.addEventListener('blur', () => {
            textInput.style.borderColor = '#d9d9d9';
            textInput.style.boxShadow = 'none';
        });
        
        addButtonSection.appendChild(textInput);
        
        // 触发消息输入
        const msgLabel = document.createElement('div');
        msgLabel.textContent = '触发消息';
        msgLabel.style.marginBottom = '8px';
        msgLabel.style.fontWeight = '500';
        msgLabel.style.color = '#555';
        addButtonSection.appendChild(msgLabel);
        
        const msgInput = document.createElement('input');
        msgInput.type = 'text';
        msgInput.placeholder = '点击按钮发送的消息';
        msgInput.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 20px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
            transition: all 0.3s ease;
            outline: none;
        `;
        
        msgInput.addEventListener('focus', () => {
            msgInput.style.borderColor = '#667eea';
            msgInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });
        
        msgInput.addEventListener('blur', () => {
            msgInput.style.borderColor = '#d9d9d9';
            msgInput.style.boxShadow = 'none';
        });
        
        addButtonSection.appendChild(msgInput);
        
        // 按钮颜色选择
        const colorLabel = document.createElement('div');
        colorLabel.textContent = '按钮颜色';
        colorLabel.style.marginBottom = '8px';
        colorLabel.style.fontWeight = '500';
        colorLabel.style.color = '#555';
        addButtonSection.appendChild(colorLabel);
        
        const colorSelect = document.createElement('select');
        colorSelect.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 20px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
            background-color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            outline: none;
        `;
        
        colorSelect.addEventListener('focus', () => {
            colorSelect.style.borderColor = '#667eea';
            colorSelect.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });
        
        colorSelect.addEventListener('blur', () => {
            colorSelect.style.borderColor = '#d9d9d9';
            colorSelect.style.boxShadow = 'none';
        });
        
        colorOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            colorSelect.appendChild(opt);
        });
        
        addButtonSection.appendChild(colorSelect);
        
        // 添加按钮
        const addBtn = document.createElement('button');
        addBtn.textContent = '添加按钮';
        addBtn.style.cssText = `
            width: 100%;
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        `;
        
        addBtn.addEventListener('mouseenter', () => {
            addBtn.style.transform = 'translateY(-2px)';
            addBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });
        
        addBtn.addEventListener('mouseleave', () => {
            addBtn.style.transform = 'translateY(0)';
            addBtn.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        });
        
        addBtn.addEventListener('click', function() {
            const buttonText = textInput.value.trim();
            const buttonMsg = msgInput.value.trim();
            
            if (!buttonText || !buttonMsg) {
                showNotification('请填写按钮文本和触发消息', 'error');
                return;
            }
            
            // 创建新按钮配置
            const newButton = {
                id: generateUniqueId(),
                textContent: buttonText,
                message: buttonMsg,
                className: colorSelect.value,
                count: 0
            };
            
            // 添加到配置并保存
            buttonsConfig.push(newButton);
            saveButtonsConfig();
            
            // 重新创建按钮
            createButtons();
            
            // 更新管理面板
            updateButtonsList();
            
            // 清空输入框
            textInput.value = '';
            msgInput.value = '';
            
            // 显示成功提示
            showNotification('按钮添加成功！', 'success');
        });
        
        addButtonSection.appendChild(addBtn);
        contentContainer.appendChild(addButtonSection);
        
        // 按钮列表区域
        const buttonsListSection = document.createElement('div');
        buttonsListSection.id = 'buttons-list-section';
        buttonsListSection.style.cssText = `
            background: #fafafa;
            border-radius: 10px;
            padding: 20px;
        `;
        
        const listTitle = document.createElement('h4');
        listTitle.textContent = '已添加的按钮';
        listTitle.style.marginTop = '0';
        listTitle.style.marginBottom = '20px';
        listTitle.style.color = '#333';
        listTitle.style.fontSize = '16px';
        buttonsListSection.appendChild(listTitle);
        
        // 按钮列表容器
        const buttonsList = document.createElement('div');
        buttonsList.id = 'buttons-list';
        buttonsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;
        buttonsListSection.appendChild(buttonsList);
        contentContainer.appendChild(buttonsListSection);
        
        // 导入导出按钮区域
        const importExportSection = document.createElement('div');
        importExportSection.style.cssText = `
            display: flex;
            gap: 10px;
            margin-top: 20px;
        `;
        
        // 导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '导出配置';
        exportBtn.style.cssText = `
            flex: 1;
            padding: 10px 20px;
            background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
        `;
        
        exportBtn.addEventListener('mouseenter', () => {
            exportBtn.style.transform = 'translateY(-2px)';
            exportBtn.style.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.4)';
        });
        
        exportBtn.addEventListener('mouseleave', () => {
            exportBtn.style.transform = 'translateY(0)';
            exportBtn.style.boxShadow = '0 2px 8px rgba(82, 196, 26, 0.3)';
        });
        
        exportBtn.onclick = exportButtonsConfig;
        importExportSection.appendChild(exportBtn);
        
        // 导入按钮
        const importBtn = document.createElement('button');
        importBtn.textContent = '导入配置';
        importBtn.style.cssText = `
            flex: 1;
            padding: 10px 20px;
            background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        `;
        
        importBtn.addEventListener('mouseenter', () => {
            importBtn.style.transform = 'translateY(-2px)';
            importBtn.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.4)';
        });
        
        importBtn.addEventListener('mouseleave', () => {
            importBtn.style.transform = 'translateY(0)';
            importBtn.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.3)';
        });
        
        importBtn.onclick = importButtonsConfig;
        importExportSection.appendChild(importBtn);
        
        // 重置按钮位置
        const resetPositionBtn = document.createElement('button');
        resetPositionBtn.textContent = '重置按钮位置';
        resetPositionBtn.style.cssText = `
            flex: 1;
            padding: 10px 20px;
            background: linear-gradient(135deg, #fa8c16 0%, #ffa940 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(250, 140, 22, 0.3);
        `;
        
        resetPositionBtn.addEventListener('mouseenter', () => {
            resetPositionBtn.style.transform = 'translateY(-2px)';
            resetPositionBtn.style.boxShadow = '0 4px 12px rgba(250, 140, 22, 0.4)';
        });
        
        resetPositionBtn.addEventListener('mouseleave', () => {
            resetPositionBtn.style.transform = 'translateY(0)';
            resetPositionBtn.style.boxShadow = '0 2px 8px rgba(250, 140, 22, 0.3)';
        });
        
        resetPositionBtn.onclick = function() {
            if (confirm('确定要重置所有按钮的位置吗？这将清除所有保存的位置设置。')) {
                resetAllButtonsPosition();
                showNotification('按钮位置已重置！', 'success');
            }
        };
        
        importExportSection.appendChild(resetPositionBtn);
        
        contentContainer.appendChild(importExportSection);
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            margin-top: 20px;
            width: 100%;
            padding: 10px 20px;
            background: #f5f5f5;
            color: #595959;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        `;
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = '#e8e8e8';
            closeBtn.style.borderColor = '#d9d9d9';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = '#f5f5f5';
            closeBtn.style.borderColor = '#d9d9d9';
        });
        
        closeBtn.onclick = function() {
            document.body.removeChild(panel);
        };
        
        contentContainer.appendChild(closeBtn);
        
        // 添加到页面
        document.body.appendChild(panel);
        
        // 更新按钮列表
        updateButtonsList();
        
        // 实现面板拖动功能
        let isDragging = false;
        let startX, startY, initialTop, initialLeft;
        
        titleBar.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialTop = panel.offsetTop;
            initialLeft = panel.offsetLeft;
            
            // 添加拖动时的样式
            panel.style.cursor = 'grabbing';
            panel.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.25)';
            
            // 阻止默认文本选择
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // 设置面板新位置
            panel.style.top = (initialTop + deltaY) + 'px';
            panel.style.left = (initialLeft + deltaX) + 'px';
            panel.style.transform = 'none'; // 移除居中变换
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                // 恢复正常样式
                panel.style.cursor = 'default';
                panel.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }
        });
        

    }
    
    // 显示通知
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #52c41a;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // 3秒后隐藏通知
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // 初始化函数
    function init() {
        // 加载测试模式状态
        loadTestModeState();
        
        // 加载按钮配置
        loadButtonsConfig();
        
        // 创建按钮
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
    
    // 切换测试模式
    function toggleTestMode() {
        isTestMode = !isTestMode;
        saveTestModeState();
        showNotification('测试模式已' + (isTestMode ? '开启' : '关闭') + '！点击按钮将' + (isTestMode ? '不会' : '会') + '发送消息。');
        // 更新菜单命令的显示
        updateMenuCommands();
    }
    
    // 保存测试模式状态
    function saveTestModeState() {
        localStorage.setItem(TEST_MODE_KEY, isTestMode.toString());
    }
    
    // 加载测试模式状态
    function loadTestModeState() {
        const savedState = localStorage.getItem(TEST_MODE_KEY);
        if (savedState !== null) {
            isTestMode = savedState === 'true';
        }
    }
    
    // 更新菜单命令
    function updateMenuCommands() {
        // 先清除旧的菜单命令
        // 注意：GM_registerMenuCommand 没有提供删除方法，这里只重新注册
        GM_registerMenuCommand('按钮管理面板', openButtonManagerPanel);
        GM_registerMenuCommand('测试模式：' + (isTestMode ? '✅ 已开启' : '❌ 已关闭'), toggleTestMode);
    }
    
    // 注册油猴菜单
    updateMenuCommands();
    
    // 当页面加载完成时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
// 添加按钮颜色样式
GM_addStyle(`
  .red {
    color: #f5222d;
    border: 1px solid #d9d9d9;
  }
  
  .blue {
    color: #096dd9;
    border: 1px solid #d9d9d9;
  }
  
  .green {
    color: #389e0d;
    border: 1px solid #d9d9d9;
  }
  
  .gray {
    color: #595959;
    border: 1px solid #d9d9d9;
  }
  
  .orange {
    color: #d46b08;
    border: 1px solid #d9d9d9;
  }
`);