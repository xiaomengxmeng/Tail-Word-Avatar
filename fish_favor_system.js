// ==UserScript==
// @name         摸鱼派鱼油好感度系统
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  管理摸鱼派鱼油的好感度系统，支持好感度查询、修改和导入导出
// @author      ZeroDream
// @match        https://fishpi.cn/*
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        GM_registerMenuCommand
// @license MIT
// ==/UserScript==

(function() {
    'use strict';

    // 版本信息
    const version = '1.1';

    // 好感度数据结构
    // - id: 鱼油唯一标识符
    // - name: 鱼油名称
    // - favor: 好感度值(-100到100)
    // - note: 备注信息
    let fishFavorConfig = [];

    // 存储键名
    const STORAGE_KEY = 'fish_favor_system_config';

    // 初始化函数
    function init() {
        loadFavorConfig();
        // 注册油猴菜单命令
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('打开鱼油好感度管理', function() {
                openFavorManagerPanel();
            });
        }
        // 创建界面按钮
        createFavorButton();
        console.log('好感度系统初始化完成');
    }
    
    // 按钮位置存储键名
    const BUTTON_POSITION_KEY = 'fish_favor_button_position';

    // 创建界面按钮
    function createFavorButton() {
        try {
            // 获取回复区域
            var replyArea = document.getElementsByClassName('reply')[0];
            if (!replyArea) {
                console.log('未找到回复区域，稍后重试');
                setTimeout(createFavorButton, 1000);
                return;
            }

            // 创建按钮容器（使用唯一ID避免冲突）
            var buttonContainer = document.getElementById("fish-favor-buttons-container");
            if (!buttonContainer) {
                buttonContainer = document.createElement("div");
                buttonContainer.id = "fish-favor-buttons-container";
                buttonContainer.align = "right";
                buttonContainer.style.marginBottom = "10px";
                
                // 为拖动功能添加必要的CSS样式
                buttonContainer.style.position = 'absolute';
                buttonContainer.style.zIndex = '100';
                buttonContainer.style.backgroundColor = 'transparent';
                buttonContainer.style.border = 'none';
                buttonContainer.style.padding = '5px';
                buttonContainer.style.cursor = 'move'; // 默认设置整个容器可拖动
                
                // 将按钮容器插入到回复区域前面，而不是添加到末尾
                replyArea.parentNode.insertBefore(buttonContainer, replyArea);
                
                // 应用保存的位置
                applySavedPosition(buttonContainer);
                
                // 为按钮添加拖动事件
                favorButton.onmousedown = function(e) {
                    if (e.target === favorButton) {
                        // 延迟打开面板，优先处理拖动
                        const clickTimeout = setTimeout(function() {
                            openFavorManagerPanel();
                        }, 200);
                        
                        // 设置拖动事件，拖动时取消点击
                        setupDragEventsWithClickCancel(buttonContainer, favorButton, clickTimeout);
                    }
                };
            }
            
            // 创建好感度管理按钮（样式匹配单词面板）
            var favorButton = document.createElement('button');
            favorButton.id = 'fish-favor-button';
            favorButton.textContent = '好感管理';
            // 使用与单词面板相匹配的样式
            favorButton.setAttribute('style', `
                background-color: #f0f8ff;
                border: 1px solid #b8e2ff;
                color: #0066cc;
                padding: 6px 12px;
                margin-right: 5px;
                margin-bottom: 5px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                outline: none;
            `);
            
            // 添加悬停效果
            favorButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#e0f0ff';
                this.style.borderColor = '#91d5ff';
            });
            
            favorButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#f0f8ff';
                this.style.borderColor = '#b8e2ff';
            });
            
            favorButton.onclick = function() {
                openFavorManagerPanel();
            };
            
            // 检查按钮是否已存在，避免重复添加
                if (!document.getElementById('fish-favor-button')) {
                    buttonContainer.appendChild(favorButton);
                }
            
            // 确保按钮存在后，设置拖动功能到按钮上
                var favorButton = document.getElementById('fish-favor-button');
                if (favorButton) {
                    // 保存原始点击处理
                    const originalOnClick = favorButton.onclick;
                    
                    // 重写mousedown事件，处理拖动和点击
                    favorButton.onmousedown = function(e) {
                        if (e.target === favorButton) {
                            // 延迟打开面板，优先处理拖动
                            const clickTimeout = setTimeout(function() {
                                if (originalOnClick) originalOnClick();
                            }, 200);
                            
                            // 设置拖动事件，拖动时取消点击
                            setupDragEventsWithClickCancel(buttonContainer, favorButton, clickTimeout);
                        }
                    };
                    
                    // 移除原有的onclick处理，避免重复触发
                    favorButton.onclick = null;
                }
            
        } catch (e) {
            console.error('创建好感度按钮失败:', e);
            setTimeout(createFavorButton, 2000);
        }
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
    
    // 设置拖动事件（带点击取消功能）
    function setupDragEventsWithClickCancel(element, dragElement, clickTimeout) {
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
        }
        
        // 添加鼠标移动和释放事件监听器到document
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // 防止文本选中
        event.preventDefault();
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

    // 从localStorage加载好感度配置
    function loadFavorConfig() {
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEY);
            if (savedConfig) {
                fishFavorConfig = JSON.parse(savedConfig);
                // 数据迁移：将旧的单一note字段转换为新的notes数组格式
                fishFavorConfig = fishFavorConfig.map(fish => {
                    // 如果是旧格式（有note字段但没有notes字段）
                    if ('note' in fish && !fish.notes) {
                        const notesArray = [];
                        if (fish.note && fish.note.trim()) {
                            // 解析现有的备注，提取时间戳（如果有）
                            const noteRegex = /^\[(.*?)\]\s*(.*)$/;
                            const match = fish.note.match(noteRegex);
                            
                            let timestamp, content;
                            if (match) {
                                // 如果备注已经有时间戳格式
                                timestamp = match[1];
                                content = match[2];
                            } else {
                                // 没有时间戳，使用当前时间
                                timestamp = new Date().toLocaleString('zh-CN');
                                content = fish.note;
                            }
                            
                            notesArray.push({
                                timestamp: timestamp,
                                content: content,
                                timestampObj: new Date(timestamp)
                            });
                        }
                        
                        // 返回新格式，移除旧的note字段
                        return {
                            ...fish,
                            notes: notesArray
                        };
                    }
                    return fish;
                });
                console.log('好感度配置加载成功，已完成数据迁移');
            } else {
                fishFavorConfig = [];
                console.log('首次使用，创建默认配置');
                saveFavorConfig();
            }
        } catch (e) {
            console.error('加载好感度配置失败:', e);
            fishFavorConfig = [];
            saveFavorConfig();
        }
    }

    // 保存好感度配置到localStorage
    function saveFavorConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fishFavorConfig));
            console.log('好感度配置保存成功');
        } catch (e) {
            console.error('保存好感度配置失败:', e);
            showNotification('保存配置失败', 'error');
        }
    }

    // 生成唯一ID
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 创建控制按钮函数已移除，使用油猴菜单命令代替
    // function createControlButton() { ... }

    // 打开好感度管理面板
    function openFavorManagerPanel() {
        // 检查是否已存在面板
        const existingPanel = document.getElementById('fish-favor-panel');
        if (existingPanel) {
            document.body.removeChild(existingPanel);
        }

        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'fish-favor-panel';
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
        title.textContent = '鱼油好感度管理';
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

        // 添加新鱼油区域
        const addFishSection = document.createElement('div');
        addFishSection.style.cssText = `
            background: #fafafa;
            border: 2px dashed #e1e5e9;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        `;

        addFishSection.addEventListener('mouseenter', () => {
            addFishSection.style.borderColor = '#667eea';
            addFishSection.style.background = '#f0f2ff';
        });

        addFishSection.addEventListener('mouseleave', () => {
            addFishSection.style.borderColor = '#e1e5e9';
            addFishSection.style.background = '#fafafa';
        });

        const addTitle = document.createElement('h4');
        addTitle.textContent = '添加新鱼油';
        addTitle.style.marginTop = '0';
        addTitle.style.marginBottom = '20px';
        addTitle.style.color = '#333';
        addTitle.style.fontSize = '16px';
        addFishSection.appendChild(addTitle);

        // 鱼油名称输入
        const nameLabel = document.createElement('div');
        nameLabel.textContent = '鱼油名称';
        nameLabel.style.marginBottom = '8px';
        nameLabel.style.fontWeight = '500';
        nameLabel.style.color = '#555';
        addFishSection.appendChild(nameLabel);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '请输入鱼油名称';
        nameInput.style.cssText = `
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

        nameInput.addEventListener('focus', () => {
            nameInput.style.borderColor = '#667eea';
            nameInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });

        nameInput.addEventListener('blur', () => {
            nameInput.style.borderColor = '#d9d9d9';
            nameInput.style.boxShadow = 'none';
        });

        addFishSection.appendChild(nameInput);

        // 初始好感度输入
        const favorLabel = document.createElement('div');
        favorLabel.textContent = '初始好感度 (-100到100)';
        favorLabel.style.marginBottom = '8px';
        favorLabel.style.fontWeight = '500';
        favorLabel.style.color = '#555';
        addFishSection.appendChild(favorLabel);

        const favorInput = document.createElement('input');
        favorInput.type = 'number';
        favorInput.min = '-100';
        favorInput.max = '100';
        favorInput.value = '0';
        favorInput.style.cssText = `
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

        favorInput.addEventListener('focus', () => {
            favorInput.style.borderColor = '#667eea';
            favorInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });

        favorInput.addEventListener('blur', () => {
            favorInput.style.borderColor = '#d9d9d9';
            favorInput.style.boxShadow = 'none';
            // 确保好感度值在-100到100之间
              if (favorInput.value < -100) favorInput.value = -100;
              if (favorInput.value > 100) favorInput.value = 100;
        });

        addFishSection.appendChild(favorInput);

        // 备注输入
        const noteLabel = document.createElement('div');
        noteLabel.textContent = '备注 (可选)';
        noteLabel.style.marginBottom = '8px';
        noteLabel.style.fontWeight = '500';
        noteLabel.style.color = '#555';
        addFishSection.appendChild(noteLabel);

        const noteInput = document.createElement('textarea');
        noteInput.placeholder = '添加备注信息';
        noteInput.rows = 3;
        noteInput.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 20px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
            resize: vertical;
            transition: all 0.3s ease;
            outline: none;
        `;

        noteInput.addEventListener('focus', () => {
            noteInput.style.borderColor = '#667eea';
            noteInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });

        noteInput.addEventListener('blur', () => {
            noteInput.style.borderColor = '#d9d9d9';
            noteInput.style.boxShadow = 'none';
        });

        addFishSection.appendChild(noteInput);

        // 添加按钮
        const addBtn = document.createElement('button');
        addBtn.textContent = '添加鱼油';
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
            const fishName = nameInput.value.trim();
            const favorValue = parseInt(favorInput.value);
            const noteText = noteInput.value.trim();

            if (!fishName) {
                showNotification('请填写鱼油名称', 'error');
                return;
            }

            // 检查是否已存在同名鱼油
            const existingFish = fishFavorConfig.find(fish => fish.name === fishName);
            if (existingFish) {
                showNotification('该鱼油已存在', 'error');
                return;
            }

            // 创建备注数组
            const notesArray = [];
            if (noteText && noteText.trim()) {
                const now = new Date();
                const timestamp = now.toLocaleString('zh-CN');
                notesArray.push({
                    timestamp: timestamp,
                    content: noteText.trim(),
                    timestampObj: now
                });
            }
            
            // 创建新鱼油配置
            const newFish = {
                id: generateUniqueId(),
                name: fishName,
                favor: favorValue,
                notes: notesArray
            };

            // 添加到配置并保存
            fishFavorConfig.push(newFish);
            saveFavorConfig();

            // 更新管理面板列表
            updateFishList();

            // 清空输入框
            nameInput.value = '';
            favorInput.value = 0;
            noteInput.value = '';

            // 显示成功提示
            showNotification('鱼油添加成功！', 'success');
        });

        addFishSection.appendChild(addBtn);
        contentContainer.appendChild(addFishSection);

        // 鱼油列表区域
        const fishListSection = document.createElement('div');
        fishListSection.id = 'fish-list-section';
        fishListSection.style.cssText = `
            background: #fafafa;
            border-radius: 10px;
            padding: 20px;
        `;

        const listTitle = document.createElement('h4');
        listTitle.textContent = '已添加的鱼油';
        listTitle.style.marginTop = '0';
        listTitle.style.marginBottom = '20px';
        listTitle.style.color = '#333';
        listTitle.style.fontSize = '16px';
        fishListSection.appendChild(listTitle);

        // 搜索框
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜索鱼油...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 15px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
            transition: all 0.3s ease;
            outline: none;
        `;

        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#667eea';
            searchInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
        });

        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = '#d9d9d9';
            searchInput.style.boxShadow = 'none';
        });

        searchInput.addEventListener('input', function() {
            updateFishList(searchInput.value.trim());
        });

        fishListSection.appendChild(searchInput);

        // 鱼油列表容器
        const fishList = document.createElement('div');
        fishList.id = 'fish-list';
        fishList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: 300px;
            overflow-y: auto;
        `;
        fishListSection.appendChild(fishList);
        contentContainer.appendChild(fishListSection);

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

        exportBtn.onclick = exportFavorConfig;
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

        importBtn.onclick = importFavorConfig;
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
            transition: all 0.3s ease;
        `;

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = '#e8e8e8';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = '#f5f5f5';
        });

        closeBtn.onclick = function() {
            document.body.removeChild(panel);
        };

        contentContainer.appendChild(closeBtn);

        // 添加到文档
        document.body.appendChild(panel);

        // 更新鱼油列表
        updateFishList();

        // 实现面板拖动功能
        makeDraggable(panel, titleBar);
    }

    // 更新鱼油列表
    function updateFishList(searchTerm = '') {
        const fishList = document.getElementById('fish-list');
        if (!fishList) return;

        // 清空列表
        fishList.innerHTML = '';

        // 过滤鱼油列表
        let filteredFish = fishFavorConfig;
        if (searchTerm) {
            filteredFish = fishFavorConfig.filter(fish => 
                fish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (fish.note && fish.note.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // 按好感度降序排序
        filteredFish.sort((a, b) => b.favor - a.favor);

        if (filteredFish.length === 0) {
            const noResult = document.createElement('div');
            noResult.textContent = searchTerm ? '没有找到匹配的鱼油' : '暂无鱼油，请添加';
            noResult.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #999;
                font-size: 14px;
            `;
            fishList.appendChild(noResult);
            return;
        }

        // 创建鱼油项
        filteredFish.forEach(fish => {
            const fishItem = document.createElement('div');
            fishItem.style.cssText = `
                background: white;
                border: 1px solid #e8e8e8;
                border-radius: 8px;
                padding: 15px;
                transition: all 0.3s ease;
            `;

            fishItem.addEventListener('mouseenter', () => {
                fishItem.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
            });

            fishItem.addEventListener('mouseleave', () => {
                fishItem.style.boxShadow = 'none';
            });

            // 鱼油名称
            const fishName = document.createElement('div');
            fishName.textContent = fish.name;
            fishName.style.cssText = `
                font-weight: 500;
                color: #333;
                font-size: 15px;
                margin-bottom: 8px;
            `;
            fishItem.appendChild(fishName);

            // 好感度显示和控制
            const favorControl = document.createElement('div');
            favorControl.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                width: 100%;
            `;

            // 减号和数量输入区域
            const decreaseSection = document.createElement('div');
            decreaseSection.style.cssText = `
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            
            // 减号按钮
            const decreaseBtn = document.createElement('button');
            decreaseBtn.textContent = '-';
            decreaseBtn.style.cssText = `
                width: 30px;
                height: 30px;
                border: 1px solid #d9d9d9;
                background: #fff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
            `;
            
            // 数量输入框
            const decreaseAmount = document.createElement('input');
            decreaseAmount.type = 'number';
            decreaseAmount.value = '1';
            decreaseAmount.min = '1';
            decreaseAmount.max = '100';
            decreaseAmount.style.cssText = `
                width: 50px;
                height: 30px;
                border: 1px solid #d9d9d9;
                border-radius: 4px;
                text-align: center;
                font-size: 14px;
            `;
            
            decreaseSection.appendChild(decreaseBtn);
            decreaseSection.appendChild(decreaseAmount);

            decreaseBtn.addEventListener('mouseenter', () => {
                decreaseBtn.style.background = '#f5f5f5';
            });

            decreaseBtn.addEventListener('mouseleave', () => {
                decreaseBtn.style.background = 'white';
            });

            decreaseBtn.addEventListener('click', function() {
                const amount = parseInt(decreaseAmount.value) || 1;
                if (fish.favor > 0) {
                    // 显示自定义备注输入对话框
                    showNoteDialog(`将 ${fish.name} 的好感度减少 ${amount} 点，可选添加备注：`, function(note) {
                        // 只有用户点击确定才执行操作
                        if (note !== null) {
                            // 初始化notes数组（如果不存在）
                            if (!fish.notes) {
                                fish.notes = [];
                            }
                            
                            // 如果用户输入了备注，添加到notes数组
                            if (note && note.trim()) {
                                const now = new Date();
                                const timestamp = now.toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                                
                                fish.notes.push({
                                    timestamp: timestamp,
                                    content: note.trim(),
                                    timestampObj: now
                                });
                                
                                // 按时间倒序排序（最新的在前）
                                fish.notes.sort((a, b) => b.timestampObj - a.timestampObj);
                            }
                            
                            // 执行好感度减少
                            fish.favor = Math.max(0, fish.favor - amount);
                            updateFavorDisplay(fishItem, fish);
                            saveFavorConfig();
                            showNotification(`已将 ${fish.name} 的好感度减少到 ${fish.favor}`, 'info');
                        }
                    });
                }
            });

            // 好感度显示
            const favorDisplay = document.createElement('div');
            favorDisplay.style.cssText = `
                flex: 1;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            const favorValue = document.createElement('span');
            favorValue.textContent = `好感度: ${fish.favor}`;
            favorValue.style.cssText = `
                min-width: 80px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
            `;

            // 好感度进度条
            const progressBarContainer = document.createElement('div');
            progressBarContainer.style.cssText = `
                flex: 1;
                height: 12px;
                background: #f5f5f5;
                border-radius: 6px;
                overflow: hidden;
                position: relative;
                border: 1px solid #e8e8e8;
            `;

            const progressBar = document.createElement('div');
            const favorColor = getFavorColor(fish.favor);
            progressBar.style.cssText = `
                height: 100%;
                background: ${favorColor};
                transition: width 0.3s ease;
                width: ${fish.favor}%;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `;

            progressBarContainer.appendChild(progressBar);
            favorDisplay.appendChild(favorValue);
            favorDisplay.appendChild(progressBarContainer);

            // 加号和数量输入区域
            const increaseSection = document.createElement('div');
            increaseSection.style.cssText = `
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            
            // 加号按钮
            const increaseBtn = document.createElement('button');
            increaseBtn.textContent = '+';
            increaseBtn.style.cssText = `
                width: 30px;
                height: 30px;
                border: 1px solid #d9d9d9;
                background: #fff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
            `;
            
            // 数量输入框
            const increaseAmount = document.createElement('input');
            increaseAmount.type = 'number';
            increaseAmount.value = '1';
            increaseAmount.min = '1';
            increaseAmount.max = '100';
            increaseAmount.style.cssText = `
                width: 50px;
                height: 30px;
                border: 1px solid #d9d9d9;
                border-radius: 4px;
                text-align: center;
                font-size: 14px;
            `;
            
            increaseSection.appendChild(increaseAmount);
            increaseSection.appendChild(increaseBtn);

            increaseBtn.addEventListener('mouseenter', () => {
                increaseBtn.style.background = '#f5f5f5';
            });

            increaseBtn.addEventListener('mouseleave', () => {
                increaseBtn.style.background = 'white';
            });

            increaseBtn.addEventListener('click', function() {
                const amount = parseInt(increaseAmount.value) || 1;
                if (fish.favor < 100) {
                    // 显示自定义备注输入对话框
                    showNoteDialog(`将 ${fish.name} 的好感度增加 ${amount} 点，可选添加备注：`, function(note) {
                        // 只有用户点击确定才执行操作
                        if (note !== null) {
                            // 初始化notes数组（如果不存在）
                            if (!fish.notes) {
                                fish.notes = [];
                            }
                            
                            // 如果用户输入了备注，添加到notes数组
                            if (note && note.trim()) {
                                const now = new Date();
                                const timestamp = now.toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                                
                                fish.notes.push({
                                    timestamp: timestamp,
                                    content: note.trim(),
                                    timestampObj: now
                                });
                                
                                // 按时间倒序排序（最新的在前）
                                fish.notes.sort((a, b) => b.timestampObj - a.timestampObj);
                            }
                            
                            // 执行好感度增加
                            fish.favor = Math.min(100, fish.favor + amount);
                            updateFavorDisplay(fishItem, fish);
                            saveFavorConfig();
                            showNotification(`已将 ${fish.name} 的好感度增加到 ${fish.favor}`, 'info');
                        }
                    });
                }
            });

            favorControl.appendChild(decreaseSection);
            favorControl.appendChild(favorDisplay);
            favorControl.appendChild(increaseSection);
            fishItem.appendChild(favorControl);

            // 操作按钮区域
            const actionButtons = document.createElement('div');
            actionButtons.style.cssText = `
                display: flex;
                gap: 8px;
                margin-top: 10px;
            `;

            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
            editBtn.style.cssText = `
                flex: 1;
                padding: 6px 12px;
                background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            `;

            editBtn.addEventListener('click', function() {
                editFish(fish);
            });

            // 重置按钮
            const resetBtn = document.createElement('button');
            resetBtn.textContent = '重置';
            resetBtn.style.cssText = `
                flex: 1;
                padding: 6px 12px;
                background: #faad14;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            `;

            resetBtn.addEventListener('click', function() {
                if (confirm(`确定要将 ${fish.name} 的好感度重置为50吗？`)) {
                    fish.favor = 50;
                    updateFavorDisplay(fishItem, fish);
                    saveFavorConfig();
                    showNotification(`已将 ${fish.name} 的好感度重置为50`, 'success');
                }
            });

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.style.cssText = `
                flex: 1;
                padding: 6px 12px;
                background: #ff4d4f;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            `;

            deleteBtn.addEventListener('click', function() {
                if (confirm(`确定要删除鱼油 ${fish.name} 吗？`)) {
                    const index = fishFavorConfig.findIndex(f => f.id === fish.id);
                    if (index !== -1) {
                        fishFavorConfig.splice(index, 1);
                        saveFavorConfig();
                        updateFishList();
                        showNotification(`已删除鱼油 ${fish.name}`, 'success');
                    }
                }
            });

            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(resetBtn);
            actionButtons.appendChild(deleteBtn);
            fishItem.appendChild(actionButtons);

            // 备注显示 - 支持多个备注按时间倒序显示
            if (fish.notes && fish.notes.length > 0) {
                const noteContainer = document.createElement('div');
                noteContainer.id = `notes-${fish.id}`;
                noteContainer.style.cssText = `
                    margin-top: 10px;
                    max-height: 150px;
                    overflow-y: auto;
                    padding: 5px;
                `;
                
                const notesTitle = document.createElement('div');
                notesTitle.textContent = '备注历史:';
                notesTitle.style.cssText = `
                    font-size: 12px;
                    font-weight: 500;
                    color: #666;
                    margin-bottom: 5px;
                `;
                noteContainer.appendChild(notesTitle);
                
                // 确保notes数组按时间倒序排序（最新的在前）
                // 兼容没有timestampObj的历史数据，使用timestamp字符串解析为日期对象
                fish.notes.sort((a, b) => {
                    const dateA = a.timestampObj || new Date(a.timestamp);
                    const dateB = b.timestampObj || new Date(b.timestamp);
                    return dateB - dateA;
                });
                
                // 创建每个备注项
                fish.notes.forEach((note, index) => {
                    const noteItem = document.createElement('div');
                    noteItem.style.cssText = `
                        margin-bottom: 6px;
                        padding: 6px;
                        background: #f0f9ff;
                        border: 1px solid #91d5ff;
                        border-radius: 4px;
                        font-size: 11px;
                        color: #1890ff;
                    `;
                    
                    // 为第一个（最新的）备注添加特殊样式
                    if (index === 0) {
                        noteItem.style.background = '#f6ffed';
                        noteItem.style.borderColor = '#b7eb8f';
                        noteItem.style.color = '#389e0d';
                    }
                    
                    const timestampSpan = document.createElement('span');
                    timestampSpan.textContent = `[${note.timestamp}] `;
                    timestampSpan.style.cssText = `
                        font-weight: 500;
                        color: #8c8c8c;
                    `;
                    
                    const contentSpan = document.createElement('span');
                    contentSpan.textContent = note.content;
                    
                    noteItem.appendChild(timestampSpan);
                    noteItem.appendChild(contentSpan);
                    noteContainer.appendChild(noteItem);
                });
                
                fishItem.appendChild(noteContainer);
            }

            fishList.appendChild(fishItem);
        });
    }

    // 更新好感度显示
    function updateFavorDisplay(fishItem, fish) {
        const favorValue = fishItem.querySelector('span');
        const progressBar = fishItem.querySelector('div > div > div:last-child');
        
        if (favorValue) {
            favorValue.textContent = `好感度: ${fish.favor}`;
        }
        
        if (progressBar) {
            progressBar.style.width = `${fish.favor}%`;
            progressBar.style.background = getFavorColor(fish.favor);
        }
        
        // 更新备注显示
        const existingNotesContainer = fishItem.querySelector(`#notes-${fish.id}`);
        if (existingNotesContainer) {
            existingNotesContainer.remove();
        }
        
        // 如果有备注，重新创建备注显示
        if (fish.notes && fish.notes.length > 0) {
            const noteContainer = document.createElement('div');
            noteContainer.id = `notes-${fish.id}`;
            noteContainer.style.cssText = `
                margin-top: 10px;
                max-height: 150px;
                overflow-y: auto;
                padding: 5px;
            `;
            
            const notesTitle = document.createElement('div');
            notesTitle.textContent = '备注历史:';
            notesTitle.style.cssText = `
                font-size: 12px;
                font-weight: 500;
                color: #666;
                margin-bottom: 5px;
            `;
            noteContainer.appendChild(notesTitle);
            
            // 确保notes数组按时间倒序排序（最新的在前）
            // 兼容没有timestampObj的历史数据，使用timestamp字符串解析为日期对象
            fish.notes.sort((a, b) => {
                const dateA = a.timestampObj || new Date(a.timestamp);
                const dateB = b.timestampObj || new Date(b.timestamp);
                return dateB - dateA;
            });
            
            // 创建每个备注项
            fish.notes.forEach((note, index) => {
                const noteItem = document.createElement('div');
                noteItem.style.cssText = `
                    margin-bottom: 6px;
                    padding: 6px;
                    background: #f0f9ff;
                    border: 1px solid #91d5ff;
                    border-radius: 4px;
                    font-size: 11px;
                    color: #1890ff;
                `;
                
                // 为第一个（最新的）备注添加特殊样式
                if (index === 0) {
                    noteItem.style.background = '#f6ffed';
                    noteItem.style.borderColor = '#b7eb8f';
                    noteItem.style.color = '#389e0d';
                }
                
                const timestampSpan = document.createElement('span');
                timestampSpan.textContent = `[${note.timestamp}] `;
                timestampSpan.style.cssText = `
                    font-weight: 500;
                    color: #8c8c8c;
                `;
                
                const contentSpan = document.createElement('span');
                contentSpan.textContent = note.content;
                
                noteItem.appendChild(timestampSpan);
                noteItem.appendChild(contentSpan);
                noteContainer.appendChild(noteItem);
            });
            
            fishItem.appendChild(noteContainer);
        }
    }

    // 根据好感度获取颜色
    function getFavorColor(favor) {
        if (favor >= 80) return '#52c41a'; // 高好感度-绿色
        if (favor >= 60) return '#1890ff'; // 中高好感度-蓝色
        if (favor >= 40) return '#faad14'; // 中等好感度-黄色
        if (favor >= 20) return '#fa8c16'; // 中低好感度-橙色
        return '#ff4d4f'; // 低好感度-红色
    }

    // 编辑鱼油
    function editFish(fish) {
        // 创建编辑对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const dialogContent = document.createElement('div');
        dialogContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            width: 400px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        `;

        const dialogTitle = document.createElement('h4');
        dialogTitle.textContent = '编辑鱼油信息';
        dialogTitle.style.marginTop = '0';
        dialogTitle.style.marginBottom = '20px';
        dialogTitle.style.color = '#333';
        dialogContent.appendChild(dialogTitle);

        // 鱼油名称输入
        const nameLabel = document.createElement('div');
        nameLabel.textContent = '鱼油名称';
        nameLabel.style.marginBottom = '8px';
        nameLabel.style.fontWeight = '500';
        nameLabel.style.color = '#555';
        dialogContent.appendChild(nameLabel);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = fish.name;
        nameInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 15px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            outline: none;
        `;
        dialogContent.appendChild(nameInput);

        // 好感度输入
        const favorLabel = document.createElement('div');
        favorLabel.textContent = '好感度 (-100到100)';
        favorLabel.style.marginBottom = '8px';
        favorLabel.style.fontWeight = '500';
        favorLabel.style.color = '#555';
        dialogContent.appendChild(favorLabel);

        const favorInput = document.createElement('input');
        favorInput.type = 'number';
        favorInput.min = '0';
        favorInput.max = '100';
        favorInput.value = fish.favor;
        favorInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 15px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            outline: none;
        `;
        dialogContent.appendChild(favorInput);

        // 备注输入
        const noteLabel = document.createElement('div');
        noteLabel.textContent = '备注';
        noteLabel.style.marginBottom = '8px';
        noteLabel.style.fontWeight = '500';
        noteLabel.style.color = '#555';
        dialogContent.appendChild(noteLabel);

        const noteInput = document.createElement('textarea');
        noteInput.value = fish.note || '';
        noteInput.rows = 3;
        noteInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 20px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            resize: vertical;
            outline: none;
        `;
        dialogContent.appendChild(noteInput);

        // 按钮区域
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        // 保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        `;

        saveBtn.addEventListener('click', function() {
            const newName = nameInput.value.trim();
            const newFavor = parseInt(favorInput.value);
            const newNoteContent = noteInput.value.trim();

            if (!newName) {
                showNotification('请填写鱼油名称', 'error');
                return;
            }

            // 检查名称是否与其他鱼油重复
            const existingFish = fishFavorConfig.find(f => f.name === newName && f.id !== fish.id);
            if (existingFish) {
                showNotification('该鱼油名称已存在', 'error');
                return;
            }
            
            // 初始化notes数组（如果不存在）
            if (!fish.notes) {
                fish.notes = [];
            }
            
            // 如果有新的备注内容，添加到notes数组
            if (newNoteContent && newNoteContent.trim()) {
                const now = new Date();
                const timestamp = now.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                fish.notes.push({
                    timestamp: timestamp,
                    content: newNoteContent.trim(),
                    timestampObj: now
                });
                
                // 按时间倒序排序（最新的在前）
                fish.notes.sort((a, b) => b.timestampObj - a.timestampObj);
            }

            // 更新鱼油信息
            fish.name = newName;
            fish.favor = Math.max(-100, Math.min(100, newFavor)); // 确保在-100到100之间
            // 移除旧的note字段（如果存在）
            if ('note' in fish) {
                delete fish.note;
            }

            // 保存并更新UI
            saveFavorConfig();
            updateFishList();

            // 关闭对话框
            document.body.removeChild(dialog);

            showNotification('鱼油信息更新成功！', 'success');
        });

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: #f5f5f5;
            color: #595959;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        `;

        cancelBtn.addEventListener('click', function() {
            document.body.removeChild(dialog);
        });

        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);
        dialogContent.appendChild(buttonContainer);

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);
    }

    // 导出好感度配置
    function exportFavorConfig() {
        try {
            const exportData = {
                version: version,
                exportDate: new Date().toISOString(),
                fishList: fishFavorConfig
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'fish-favor-config.json';
            link.click();

            URL.revokeObjectURL(url);
            showNotification('配置导出成功！', 'success');
        } catch (e) {
            console.error('导出配置失败:', e);
            showNotification('配置导出失败', 'error');
        }
    }

    // 导入好感度配置
    function importFavorConfig() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';

            input.onchange = function(event) {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const importData = JSON.parse(event.target.result);

                        if (!importData.fishList || !Array.isArray(importData.fishList)) {
                            showNotification('无效的导入文件格式', 'error');
                            return;
                        }

                        // 验证鱼油数据结构
                        const isValid = importData.fishList.every(fish => 
                            fish.name && typeof fish.favor === 'number' && fish.favor >= -100 && fish.favor <= 100
                        );

                        if (!isValid) {
                            showNotification('导入文件数据不完整或格式错误', 'error');
                            return;
                        }

                        // 更新鱼油配置
                        fishFavorConfig = importData.fishList.map(fish => {
                            // 基础对象
                            const newFish = {
                                id: fish.id || generateUniqueId(),
                                name: fish.name,
                                favor: fish.favor
                            };
                            
                            // 处理备注 - 数据迁移逻辑，与loadFavorConfig保持一致
                            // 如果有notes数组，直接使用
                            if (fish.notes && Array.isArray(fish.notes)) {
                                newFish.notes = fish.notes;
                            } 
                            // 如果只有旧的note字段，转换为notes数组格式
                            else if ('note' in fish && fish.note && fish.note.trim()) {
                                const notesArray = [];
                                // 解析现有的备注，提取时间戳（如果有）
                                const noteRegex = /^\[(.*?)\]\s*(.*)$/;
                                const match = fish.note.match(noteRegex);
                                
                                let timestamp, content;
                                if (match) {
                                    // 如果备注已经有时间戳格式
                                    timestamp = match[1];
                                    content = match[2];
                                } else {
                                    // 没有时间戳，使用当前时间
                                    timestamp = new Date().toLocaleString('zh-CN');
                                    content = fish.note;
                                }
                                
                                notesArray.push({
                                    timestamp: timestamp,
                                    content: content,
                                    timestampObj: new Date(timestamp)
                                });
                                
                                newFish.notes = notesArray;
                            } else {
                                // 没有备注，初始化空数组
                                newFish.notes = [];
                            }
                            
                            return newFish;
                        });

                        // 保存并更新UI
                        saveFavorConfig();
                        updateFishList();

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

    // 显示自定义备注输入对话框
    function showNoteDialog(title, callback) {
        // 创建对话框遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;

        // 创建对话框容器
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            width: 400px;
            max-width: 90vw;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        `;

        // 创建标题
        const dialogTitle = document.createElement('h3');
        dialogTitle.textContent = title;
        dialogTitle.style.cssText = `
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 16px;
            color: #333;
        `;

        // 创建输入框
        const noteInput = document.createElement('textarea');
        noteInput.placeholder = '请输入备注内容（可选）';
        noteInput.style.cssText = `
            width: 100%;
            padding: 10px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 14px;
            resize: vertical;
            min-height: 80px;
            box-sizing: border-box;
        `;

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 15px;
        `;

        // 创建取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #d9d9d9;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        `;

        // 创建确定按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            border: none;
            background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        `;

        // 添加按钮到容器
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);

        // 添加所有元素到对话框
        dialog.appendChild(dialogTitle);
        dialog.appendChild(noteInput);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 自动聚焦输入框
        noteInput.focus();

        // 关闭对话框函数
        function closeDialog() {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }

        // 按钮事件监听
        cancelBtn.addEventListener('click', () => {
            closeDialog();
            callback(null); // 用户取消
        });

        confirmBtn.addEventListener('click', () => {
            const noteText = noteInput.value.trim();
            closeDialog();
            callback(noteText);
        });

        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
                callback(null);
            }
        });

        // 按ESC键关闭
        function handleEscKey(e) {
            if (e.key === 'Escape') {
                closeDialog();
                callback(null);
                document.removeEventListener('keydown', handleEscKey);
            }
        }
        document.addEventListener('keydown', handleEscKey);
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        // 检查是否已存在通知
        const existingNotification = document.getElementById('fish-favor-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }

        const notification = document.createElement('div');
        notification.id = 'fish-favor-notification';

        // 设置样式
        let bgColor, textColor;
        switch (type) {
            case 'success':
                bgColor = '#f6ffed';
                textColor = '#389e0d';
                break;
            case 'error':
                bgColor = '#fff2f0';
                textColor = '#cf1322';
                break;
            case 'warning':
                bgColor = '#fffbe6';
                textColor = '#d46b08';
                break;
            default:
                bgColor = '#e6f7ff';
                textColor = '#0958d9';
        }

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: ${textColor};
            padding: 12px 16px;
            border: 1px solid ${textColor};
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease;
        `;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒后自动消失
        setTimeout(() => {
            notification.style.transition = 'all 0.3s ease';
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 使元素可拖动
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        if (handle) {
            handle.style.cursor = 'move';
            handle.onmousedown = dragMouseDown;
        } else {
            element.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + 'px';
            element.style.left = (element.offsetLeft - pos1) + 'px';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();