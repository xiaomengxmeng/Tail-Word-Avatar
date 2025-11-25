// ==UserScript==
// @name         按钮管理面板
// @namespace    http://tampermonkey.net/
// @version      1.0.13
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
    const version_us = "v1.0.13";
    // 按钮数据结构：{id, textContent, message, className , count}
    let buttonsConfig = [];
    const STORAGE_KEY = 'customButtonsConfig';
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

            // 创建按钮容器
            var buttonContainer = document.getElementById("custom-buttons-container");
            if (!buttonContainer) {
                buttonContainer = document.createElement("div");
                buttonContainer.id = "custom-buttons-container";
                buttonContainer.align = "right";
                buttonContainer.style.marginBottom = "10px";
                x.appendChild(buttonContainer);
            } else {
                // 清空现有按钮，避免重复添加
                buttonContainer.innerHTML = '';
            }
            
            // 创建每个按钮
            buttonsConfig.forEach(button => {
                var btn = document.createElement('button');
            btn.id = button.id;
            btn.textContent = button.textContent;
            btn.className = button.className || 'red';
            btn.setAttribute('style', 'margin-right:5px; margin-bottom:5px; padding:4px 8px; border-radius: 4px;');
            btn.onclick = function() {
                sendMsgApi(button.message);
                // 增加点击次数
                button.count++;
                saveButtonsConfig();
            };
            buttonContainer.appendChild(btn);
            });
            
            // 添加管理按钮
            var manageButton = document.createElement('button');
            manageButton.id = 'button-manager-button';
            manageButton.textContent = '管理';
            manageButton.className = 'blue';
            manageButton.setAttribute('style', 'margin-right:5px; margin-bottom:5px; padding:4px 8px;');
            manageButton.onclick = openButtonManagerPanel;
            buttonContainer.appendChild(manageButton);
            
        } catch (e) {
            console.error('创建按钮失败:', e);
            setTimeout(createButtons, 2000);
        }
    }
    
    // 生成唯一ID
    function generateUniqueId() {
        return 'custom-button-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
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
    
    // 注册油猴菜单
    GM_registerMenuCommand('按钮管理面板', openButtonManagerPanel);
    
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