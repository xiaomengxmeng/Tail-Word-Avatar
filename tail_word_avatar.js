// ==UserScript==
// @name         鱼派单词头像功能集
// @namespace    http://tampermonkey.net/
// @version      1.0.5
// @description  整合单词功能和头像生成功能的精简版脚本   try to thank APTX-4869!
// @author       ZeroDream
// @match        https://fishpi.cn/*
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        GM_registerMenuCommand
// @license MIT
// ==/UserScript==

(function () {
    'use strict';
    const version_us = "v1.0.5";

    // 小尾巴开关状态
    var suffixFlag = window.localStorage['xwb_flag'] ? JSON.parse(window.localStorage['xwb_flag']) : true;

    // 输出单词数量设置（默认为5）
    var wordCount = window.localStorage['xwb_tail_word_count'] ? parseInt(window.localStorage['xwb_tail_word_count']) : 5;
    // 左侧显示单词数量设置（默认为5）
    var sideWordCount = window.localStorage['xwb_side_word_count'] ? parseInt(window.localStorage['xwb_side_word_count']) : 5;

    // 头像生成功能开关
    var avatarGenFlag = window.localStorage['avatar_gen_flag'] ? JSON.parse(window.localStorage['avatar_gen_flag']) : false;

    // 确保单词数量在合理范围内
    if (isNaN(wordCount) || wordCount < 0 || wordCount > 20) {
        wordCount = 5;
        window.localStorage['xwb_tail_word_count'] = wordCount;
    }
    // 确保左侧显示单词数量在合理范围内
    if (isNaN(sideWordCount) || sideWordCount < 1 || sideWordCount > 20) {
        sideWordCount = 5;
        window.localStorage['xwb_side_word_count'] = sideWordCount;
    }

    // 头像生成配置 - 用户可自定义
    const avatarConfig = {
        // 默认头像文字
        defaultText: '不想桀桀桀',
        // 头像图片URL (基础背景图)
        baseImageUrl: 'https://file.fishpi.cn/2025/08/blob-3d1dec23.png',
        // 头像生成API地址
        generateApiUrl: 'https://fishpi.cn/gen?ver=0.1&scale=0.79',
        // 图片缩放比例
        scale: 10,
        // 背景颜色 (十六进制)
        backgroundColor: 'E8F4FF',
        // 字体颜色 (十六进制)
        fontColor: '3366CC'
    };

    // 小尾巴选项数组
    const suffixOptions = [
        '时光清浅处，一步一安然。',
        '心若向阳，无畏悲伤。',
        '岁月静好，现世安稳。',
        '人生如逆旅，我亦是行人。',
        '胸有丘壑，眼存山河。',
        '但行好事，莫问前程。',
        '愿有岁月可回首，且以深情共白头。',
        '人间烟火气，最抚凡人心。',
        '生活明朗，万物可爱。',
        '保持热爱，奔赴山海。',
        '山高水长，江湖再见。',
        '平安喜乐，万事胜意。',
        '知足常乐，随遇而安。',
        '星辰大海，永不止步。',
        '未来可期，人间值得。',
        '不忘初心，方得始终。',
        '人生海海，山山而川。',
        '生如夏花之绚烂，死如秋叶之静美。',
        '行到水穷处，坐看云起时。',
        '海纳百川，有容乃大。',
        '壁立千仞，无欲则刚。',
        '业精于勤，荒于嬉。',
        '书山有路勤为径，学海无涯苦作舟。',
        '纸上得来终觉浅，绝知此事要躬行。',
        '读书破万卷，下笔如有神。',
        '问渠那得清如许，为有源头活水来。',
        '横眉冷对千夫指，俯首甘为孺子牛。',
        '天生我材必有用，千金散尽还复来。',
        '长风破浪会有时，直挂云帆济沧海。',
        '人生得意须尽欢，莫使金樽空对月。'
    ];

    // 获取当前选中的小尾巴索引
    function getCurrentSuffixIndex() {
        const index = parseInt(window.localStorage['xwb_suffix_index']);
        return isNaN(index) || index < 0 || index >= suffixOptions.length ? 0 : index;
    }

    // 获取当前小尾巴文本
    function getCurrentSuffixText() {
        // 优先检查是否有自定义小尾巴
        const isCustom = window.localStorage['xwb_is_custom_suffix'] === 'true';
        const customSuffix = window.localStorage['xwb_custom_suffix'];

        // 如果设置了自定义小尾巴且不为空，则返回自定义文本
        if (isCustom && customSuffix) {
            return customSuffix;
        }

        // 否则返回预设的小尾巴选项
        return suffixOptions[getCurrentSuffixIndex()] || suffixOptions[0];
    }


    // 获取随机考研单词（包含单词、词性和释义）
    function getRandomWordWithInfo() {
        const random = Math.random();
        const randomIndex = Math.floor(random * postgraduateWords1.length);
        return postgraduateWords1[randomIndex];
    }

    // 获取指定数量的不重复随机单词
    function getRandomUniqueWords(count) {
        const wordsCopy = [...postgraduateWords1];
        const selectedWords = [];

        for (let i = 0; i < count && wordsCopy.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * wordsCopy.length);
            selectedWords.push(wordsCopy[randomIndex]);
            wordsCopy.splice(randomIndex, 1);
        }

        return selectedWords;
    }

    // 定义单词面板背景样式数组 - 优化版
    const wordPanelStyles = [
        { id: 'style1', name: '默认主题', backgroundColor: '#f8f9fa', borderColor: '#dee2e6', textColor: '#212529' },
        { id: 'style2', name: '暗黑主题', backgroundColor: '#343a40', borderColor: '#495057', textColor: '#f8f9fa' },
        { id: 'style3', name: '海洋主题', backgroundColor: '#e3f2fd', borderColor: '#90caf9', textColor: '#1565c0' },
        { id: 'style4', name: '森林主题', backgroundColor: '#e8f5e9', borderColor: '#a5d6a7', textColor: '#2e7d32' },
        { id: 'style5', name: '晚霞主题', backgroundColor: '#fff3e0', borderColor: '#ffcc80', textColor: '#e65100' },
        { id: 'style6', name: '优雅紫色', backgroundColor: '#f3e5f5', borderColor: '#ce93d8', textColor: '#4a148c' },
        { id: 'style7', name: '清新薄荷', backgroundColor: '#e0f2f1', borderColor: '#80deea', textColor: '#00796b' },
        { id: 'style8', name: '科技蓝', backgroundColor: '#e1f5fe', borderColor: '#4fc3f7', textColor: '#0277bd' },
        { id: 'style9', name: '温暖橙色', backgroundColor: '#fff8e1', borderColor: '#ffd54f', textColor: '#ef6c00' },
        { id: 'style10', name: '梦幻粉色', backgroundColor: '#fce4ec', borderColor: '#f8bbd0', textColor: '#c2185b' }
    ];

    // 获取当前样式索引
    function getCurrentStyleIndex() {
        const savedStyleId = window.localStorage.getItem('xwb_word_panel_style');
        const index = wordPanelStyles.findIndex(style => style.id === savedStyleId);
        return index >= 0 ? index : 0;
    }

    // 应用单词面板样式
    function applyWordPanelStyle(styleIndex) {
        if (styleIndex < 0 || styleIndex >= wordPanelStyles.length) {
            styleIndex = 0;
        }

        const style = wordPanelStyles[styleIndex];
        const wordDisplayArea = document.getElementById('wordDisplayArea');

        if (wordDisplayArea) {
            // 保存当前选择的样式
            window.localStorage.setItem('xwb_word_panel_style', style.id);

            // 应用样式
            wordDisplayArea.style.backgroundColor = style.backgroundColor;
            wordDisplayArea.style.borderColor = style.borderColor;
            wordDisplayArea.style.color = style.textColor;

            // 更新头部样式
            const header = wordDisplayArea.querySelector('div[style*="cursor: move"]');
            if (header) {
                header.style.color = style.textColor;
            }

            // 更新分隔线样式
            const dividerElements = wordDisplayArea.querySelectorAll('div[style*="border-bottom"]');
            dividerElements.forEach(element => {
                element.style.borderBottomColor = style.borderColor;
            });
        }
    }

    // 创建单词背景样式选择菜单
    GM_registerMenuCommand(`设置单词面板背景（当前：${wordPanelStyles[getCurrentStyleIndex()].name}）`, () => {
        let menuStr = '===== 单词面板背景样式 =====\n';
        wordPanelStyles.forEach((style, index) => {
            menuStr += `${index + 1}. ${style.name}\n`;
        });

        const choice = prompt(menuStr + '请输入样式编号选择背景：');
        if (!isNaN(choice) && choice >= 1 && choice <= wordPanelStyles.length) {
            const styleIndex = parseInt(choice) - 1;
            applyWordPanelStyle(styleIndex);
            // alert(`已切换到 ${wordPanelStyles[styleIndex].name} 样式！`);
        }
    });

    // 创建或获取左侧聊天区外的单词显示区域
    function getOrCreateWordDisplayArea() {
        let wordDisplayArea = document.getElementById('wordDisplayArea');
        if (!wordDisplayArea) {
            // 创建单词显示区域
            wordDisplayArea = document.createElement('div');
            wordDisplayArea.id = 'wordDisplayArea';

            // 设置默认样式和位置（移除滑动滑块）
            const cssText = 'position: fixed; top: 100px; left: 10px; width: 180px; height: 300px; ' +
                'background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 5px; ' +
                'z-index: 10000; overflow-y: hidden; padding: 5px; color: #212529; ' +
                'font-family: Arial, sans-serif; font-size: 12px;';

            wordDisplayArea.style.cssText = cssText;
            wordDisplayArea.innerHTML = '<div style="cursor: move; padding: 3px; text-align: center; font-weight: bold;">单词学习</div><div id="wordContent">暂无单词</div><div style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; cursor: nwse-resize; background-color: transparent; border-right: 3px solid #dee2e6; border-bottom: 3px solid #dee2e6;"></div>';
            document.body.appendChild(wordDisplayArea);

            // 添加拖拽功能
            addDragFunctionality(wordDisplayArea);
            // 添加调整大小功能
            addResizeFunctionality(wordDisplayArea);

            // 尝试恢复保存的位置和大小
            try {
                const savedPos = window.localStorage.getItem('xwb_word_panel_position');
                const savedSize = window.localStorage.getItem('xwb_word_panel_size');

                if (savedPos) {
                    const pos = JSON.parse(savedPos);
                    wordDisplayArea.style.top = pos.top + 'px';
                    wordDisplayArea.style.left = pos.left + 'px';
                    wordDisplayArea.style.transform = 'none';
                }

                if (savedSize) {
                    const size = JSON.parse(savedSize);
                    wordDisplayArea.style.width = size.width + 'px';
                    wordDisplayArea.style.height = size.height + 'px';
                }
            } catch (e) {
                // 如果恢复失败，使用默认大小
                wordDisplayArea.style.width = '180px';
                wordDisplayArea.style.height = '300px';
            }

            // 应用保存的样式
            applyWordPanelStyle(getCurrentStyleIndex());
        }

        return wordDisplayArea;
    }

    // 添加拖拽功能
    function addDragFunctionality(element) {
        const header = element.querySelector('div[style*="cursor: move"]');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            // 确保面板不会超出视口
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            element.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            element.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            element.style.transform = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';

                // 保存位置
                const position = {
                    left: parseInt(element.style.left || '10'),
                    top: parseInt(element.style.top || '100')
                };
                window.localStorage.setItem('xwb_word_panel_position', JSON.stringify(position));
            }
        });
    }

    // 添加调整大小功能
    function addResizeFunctionality(element) {
        const resizer = element.querySelector('div[style*="cursor: nwse-resize"]');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const width = startWidth + (e.clientX - startX);
            const height = startHeight + (e.clientY - startY);

            // 设置最小尺寸限制
            if (width >= 150 && height >= 200) {
                element.style.width = width + 'px';
                element.style.height = height + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;

                // 保存大小
                const size = {
                    width: element.offsetWidth,
                    height: element.offsetHeight
                };
                window.localStorage.setItem('xwb_word_panel_size', JSON.stringify(size));
            }
        });
    }

    // 更新单词显示
    function updateWordDisplay(wordList) {
        const wordDisplayArea = getOrCreateWordDisplayArea();
        const wordContent = wordDisplayArea.querySelector('#wordContent');

        const currentStyle = wordPanelStyles[getCurrentStyleIndex()] || wordPanelStyles[0];

        if (wordContent && wordList && wordList.length > 0) {
            let contentHTML = '';

            wordList.forEach((word, index) => {
                if (word && word.word) {
                    contentHTML += `<div style="margin-bottom: 3px; padding-bottom: 3px; ${index < wordList.length - 1 ? `border-bottom: 1px dashed ${currentStyle.borderColor};` : ''}">
<div style="font-weight: bold; font-size: 12px;">${word.word}</div>`;

                    // 检查是否有meanings数组
                    if (word.meanings && word.meanings.length > 0) {
                        word.meanings.forEach((meaningItem, idx) => {
                            contentHTML += `<div style="font-size: 10px; margin: 1px 0; color: ${currentStyle.textColor}; opacity: 0.9;">${meaningItem.pos || '无词性'}</div>
<div style="font-size: 11px; line-height: 1.3;">${meaningItem.meaning || '无释义'}</div>`;

                            if (idx < word.meanings.length - 1) {
                                contentHTML += `<div style="height: 2px;"></div>`;
                            }
                        });
                    } else {
                        // 兼容旧数据结构
                        contentHTML += `<div style="font-size: 10px; margin: 1px 0; color: ${currentStyle.textColor}; opacity: 0.9;">${word.pos || '无词性'}</div>
<div style="font-size: 11px; line-height: 1.3;">${word.meaning || '无释义'}</div>`;
                    }

                    contentHTML += `</div>`;
                }
            });

            wordContent.innerHTML = contentHTML;
        } else if (wordContent) {
            wordContent.innerHTML = '暂无单词';
        }
    }

    // 自动更新单词的时间间隔（毫秒）- 2分钟 = 120000毫秒
    const AUTO_UPDATE_INTERVAL = 120000;
    let lastUpdateTime = Date.now();

    // 自动更新单词函数
    function autoUpdateWords() {
        const now = Date.now();

        // 检查是否超过更新间隔且页面上有单词显示区域
        if (now - lastUpdateTime >= AUTO_UPDATE_INTERVAL) {
            const wordDisplayArea = document.getElementById('wordDisplayArea');
            if (wordDisplayArea) {
                // 获取新的随机单词并更新显示
                const wordList = getRandomUniqueWords(sideWordCount);
                updateWordDisplay(wordList);
                lastUpdateTime = now;
            }
        }
    }

    // 设置定时器，每分钟检查一次是否需要更新单词
    setInterval(autoUpdateWords, 60000); // 60000毫秒 = 1分钟

    // 初始化时立即更新一次单词
    function initializeWordDisplay() {
        try {
            // 获取随机单词并更新显示
            const wordList = getRandomUniqueWords(sideWordCount);
            updateWordDisplay(wordList);
        } catch (e) {
            // 如果初始化失败，延迟重试
            setTimeout(initializeWordDisplay, 1000);
        }
    }

    // 创建统一的小尾巴设置菜单
    GM_registerMenuCommand("小尾巴设置", openSuffixSettingsPanel);

    // 创建设置左侧显示单词数量的菜单（保留单独入口）
    GM_registerMenuCommand("设置左侧显示单词数量", () => {
        const newCount = prompt("请输入左侧显示的单词数量（1-20）：", sideWordCount);
        const count = parseInt(newCount);
        if (!isNaN(count) && count >= 1 && count <= 20) {
            sideWordCount = count;
            window.localStorage['xwb_side_word_count'] = sideWordCount;
            // 立即更新左侧单词显示
            initializeWordDisplay();
        } else {
            alert("请输入有效的数字（1-20）！");
        }
    });

    // 打开小尾巴设置面板
    function openSuffixSettingsPanel() {
        // 创建设置面板容器
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // 面板标题
        const title = document.createElement('h3');
        title.textContent = '小尾巴设置';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 20px;
            text-align: center;
            color: #333;
        `;
        panel.appendChild(title);

        // 当前小尾巴预览
        const previewDiv = document.createElement('div');
        previewDiv.style.cssText = `
            background: #f0f8ff;
            border: 1px solid #b0e0e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        `;
        const previewTitle = document.createElement('div');
        previewTitle.textContent = '当前小尾巴预览：';
        previewTitle.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #0066cc;
        `;
        const previewContent = document.createElement('div');
        previewContent.textContent = getCurrentSuffixText();
        previewContent.style.cssText = `
            color: #333;
            font-style: italic;
        `;
        previewDiv.appendChild(previewTitle);
        previewDiv.appendChild(previewContent);
        panel.appendChild(previewDiv);

        // 小尾巴开关
        const toggleDiv = document.createElement('div');
        toggleDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        `;
        const toggleLabel = document.createElement('span');
        toggleLabel.textContent = '启用小尾巴功能：';
        toggleLabel.style.fontWeight = 'bold';
        const toggleSwitch = document.createElement('input');
        toggleSwitch.type = 'checkbox';
        toggleSwitch.checked = suffixFlag;
        toggleSwitch.style.cssText = `
            width: 40px;
            height: 20px;
            cursor: pointer;
        `;
        toggleSwitch.onchange = () => {
            suffixFlag = toggleSwitch.checked;
            window.localStorage['xwb_flag'] = suffixFlag;
        };
        toggleDiv.appendChild(toggleLabel);
        toggleDiv.appendChild(toggleSwitch);
        panel.appendChild(toggleDiv);

        // 小尾巴单词数量设置
        const wordCountDiv = document.createElement('div');
        wordCountDiv.style.cssText = `
            margin-bottom: 20px;
        `;
        const wordCountLabel = document.createElement('div');
        wordCountLabel.textContent = '小尾巴单词数量：';
        wordCountLabel.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
        `;
        const wordCountInput = document.createElement('input');
        wordCountInput.type = 'range';
        wordCountInput.min = '0';
        wordCountInput.max = '20';
        wordCountInput.value = wordCount;
        wordCountInput.style.cssText = `
            width: calc(100% - 60px);
            margin-right: 10px;
            vertical-align: middle;
        `;
        const wordCountDisplay = document.createElement('span');
        wordCountDisplay.textContent = wordCount;
        wordCountDisplay.style.cssText = `
            display: inline-block;
            width: 40px;
            text-align: center;
            font-weight: bold;
            vertical-align: middle;
        `;
        wordCountInput.oninput = () => {
            wordCountDisplay.textContent = wordCountInput.value;
        };
        wordCountInput.onchange = () => {
            wordCount = parseInt(wordCountInput.value);
            window.localStorage['xwb_tail_word_count'] = wordCount;
        };
        wordCountDiv.appendChild(wordCountLabel);
        wordCountDiv.appendChild(wordCountInput);
        wordCountDiv.appendChild(wordCountDisplay);
        panel.appendChild(wordCountDiv);

        // 小尾巴选择
        const suffixSelectDiv = document.createElement('div');
        suffixSelectDiv.style.cssText = `
            margin-bottom: 20px;
        `;
        const suffixSelectLabel = document.createElement('div');
        suffixSelectLabel.textContent = '选择小尾巴：';
        suffixSelectLabel.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
        `;
        const suffixSelect = document.createElement('select');
        suffixSelect.style.cssText = `
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            margin-bottom: 15px;
        `;

        // 添加预设选项
        suffixOptions.forEach((option, index) => {
            const opt = document.createElement('option');
            opt.value = `preset-${index}`;
            opt.textContent = option;
            if (!isCustom && index === getCurrentSuffixIndex()) {
                opt.selected = true;
            }
            suffixSelect.appendChild(opt);
        });

        // 添加自定义选项
        const customOpt = document.createElement('option');
        customOpt.value = 'custom';
        customOpt.textContent = '自定义小尾巴';
        if (isCustom) {
            customOpt.selected = true;
        }
        suffixSelect.appendChild(customOpt);

        suffixSelect.onchange = () => {
            const selectedValue = suffixSelect.value;
            if (selectedValue.startsWith('preset-')) {
                const index = parseInt(selectedValue.split('-')[1]);
                window.localStorage['xwb_suffix_index'] = index;
                if (window.localStorage['xwb_is_custom_suffix']) {
                    delete window.localStorage['xwb_is_custom_suffix'];
                }
                // 更新预览
                previewContent.textContent = getCurrentSuffixText();
            } else if (selectedValue === 'custom') {
                showCustomSuffixInput();
            }
        };
        suffixSelectDiv.appendChild(suffixSelectLabel);
        suffixSelectDiv.appendChild(suffixSelect);
        panel.appendChild(suffixSelectDiv);

        // 自定义小尾巴输入
        const customSuffixDiv = document.createElement('div');
        customSuffixDiv.id = 'custom-suffix-input';
        customSuffixDiv.style.cssText = `
            margin-bottom: 20px;
            ${isCustom ? '' : 'display: none;'}
        `;
        const customSuffixLabel = document.createElement('div');
        customSuffixLabel.textContent = '自定义小尾巴：';
        customSuffixLabel.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
        `;
        const customSuffixTextarea = document.createElement('textarea');
        customSuffixTextarea.style.cssText = `
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            min-height: 80px;
            resize: vertical;
            box-sizing: border-box;
        `;
        customSuffixTextarea.value = window.localStorage['xwb_custom_suffix'] || '';
        customSuffixTextarea.oninput = () => {
            const customText = customSuffixTextarea.value.trim();
            if (customText) {
                window.localStorage['xwb_custom_suffix'] = customText;
                window.localStorage['xwb_is_custom_suffix'] = 'true';
                // 更新预览
                previewContent.textContent = customText;
            }
        };
        customSuffixDiv.appendChild(customSuffixLabel);
        customSuffixDiv.appendChild(customSuffixTextarea);
        panel.appendChild(customSuffixDiv);

        // 保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存设置';
        saveBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
        `;
        saveBtn.onclick = () => {
            // 保存所有设置
            window.localStorage['xwb_flag'] = suffixFlag;
            window.localStorage['xwb_tail_word_count'] = wordCount;
            
            // 如果自定义小尾巴不为空，保存自定义设置
            const customText = customSuffixTextarea.value.trim();
            if (customText) {
                window.localStorage['xwb_custom_suffix'] = customText;
                window.localStorage['xwb_is_custom_suffix'] = 'true';
            }
            
            alert('小尾巴设置已保存！');
            document.body.removeChild(panel);
        };

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        `;
        cancelBtn.onclick = () => {
            document.body.removeChild(panel);
        };

        // 按钮容器
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.cssText = `
            display: flex;
            justify-content: center;
            margin-top: 20px;
        `;
        buttonsDiv.appendChild(saveBtn);
        buttonsDiv.appendChild(cancelBtn);
        panel.appendChild(buttonsDiv);

        // 添加到页面
        document.body.appendChild(panel);

        // 获取当前自定义状态
        let isCustom = window.localStorage['xwb_is_custom_suffix'] === 'true';

        // 显示自定义小尾巴输入框的函数
        function showCustomSuffixInput() {
            customSuffixDiv.style.display = 'block';
            customSuffixTextarea.focus();
        }
    };

    // 发送消息API函数
    function sendMsgApi(msg) {
        var msgData = {
            "content": msg,
            "client": "小魔法" + version_us
        };
        $.ajax({
            url: Label.servePath + "/chat-room/send",
            type: "POST",
            async: false,
            data: JSON.stringify(msgData),
            success: function (e) {
                // 成功回调
            },
            error: function (e) {
                // 静默处理错误，避免日志污染
            }
        });
    }

    // 重写发送消息函数，添加小尾巴和考研单词功能
    ChatRoom.send = function (needwb) {
        var wbMsg = '\n\n\n>  ' + getCurrentSuffixText();
        // 获取指定数量的不重复随机单词
        const wordList = getRandomUniqueWords(wordCount);

        // 更新左侧单词显示区域，确保显示用户设定的数量的单词
        let displayWordList;
        if (wordCount >= sideWordCount) {
            displayWordList = wordList.slice(0, sideWordCount);
        } else {
            displayWordList = [...wordList];
            const additionalCount = sideWordCount - wordCount;
            const remainingWords = postgraduateWords1.filter(word =>
                !displayWordList.some(displayWord => displayWord.word === word.word)
            );
            for (let i = 0; i < additionalCount && remainingWords.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * remainingWords.length);
                displayWordList.push(remainingWords[randomIndex]);
                remainingWords.splice(randomIndex, 1);
            }
        }
        updateWordDisplay(displayWordList);

        // 根据单词数量分配外部和内部单词
        var outerWord = wordList[0];
        var innerWords = wordList.slice(1);

        // 构建单词消息
        var wordMsg = ' '
        wordMsg += ' <details><summary>' + (outerWord && outerWord.word ? outerWord.word : '单词') + '</summary>\n\n';

        // 处理外部单词
        if (outerWord && outerWord.word) {
            if (outerWord.meanings && outerWord.meanings.length > 0) {
                outerWord.meanings.forEach((meaningItem, idx) => {
                    wordMsg += '\n' + (meaningItem.pos || '无词性') + '\n' + (meaningItem.meaning || '无释义') + '\n';
                    if (idx < outerWord.meanings.length - 1) {
                        wordMsg += '\n';
                    }
                });
            } else {
                wordMsg += '\n' + (outerWord.pos || '无词性') + '\n' + (outerWord.meaning || '无释义') + '\n';
            }
        }

        // 处理内部单词
        innerWords.forEach(word => {
            if (word && word.word) {
                wordMsg += word.word + '\n';
                if (word.meanings && word.meanings.length > 0) {
                    word.meanings.forEach((meaningItem, idx) => {
                        wordMsg += '\n' + (meaningItem.pos || '无词性') + '\n' + (meaningItem.meaning || '无释义') + '\n';
                        if (idx < word.meanings.length - 1) {
                            wordMsg += '\n';
                        }
                    });
                } else {
                    wordMsg += '\n' + (word.pos || '无词性') + '\n' + (word.meaning || '无释义') + '\n';
                }
                wordMsg += '\n';
            }
        });
        wordMsg += '</details>';
        var t, e;
        ChatRoom.isSend || (ChatRoom.isSend = !0,
            e = {
                content: t = ChatRoom.editor.getValue(),
            },
            ChatRoom.editor.setValue(""),
            $.ajax({
                url: Label.servePath + "/chat-room/send",
                type: "POST",
                cache: !1,
                data: JSON.stringify({
                    content: function () {
                        // 获取原始消息内容
                        let originalContent = t;

                        // 处理小尾巴和单词
                        if (t.trim().length == 0 || (!suffixFlag) || needwb == 0 || t.trim().startsWith('凌 ') || t.trim().startsWith('鸽 ') || t.trim().startsWith('小冰 ') || t.trim().startsWith('冰冰 ') || t.trim().startsWith('点歌 ') || t.trim().startsWith('TTS ') || t.trim().startsWith('朗读 ')) {
                            return originalContent;
                        } else if (wordCount === 0) {
                            return originalContent + '\n\n\n>  ' + getCurrentSuffixText();
                        } else {
                            return originalContent + wordMsg + wbMsg;
                        }
                    }(),
                    client: "Web/小梦的魔法" + version_us
                }),
                beforeSend: function () {
                    $("#form button.red").attr("disabled", "disabled").css("opacity", "0.3")
                },
                success: function (e) {
                    0 === e.code ? $("#chatContentTip").removeClass("error succ").html("") : ($("#chatContentTip").addClass("error").html("<ul><li>" + e.msg + "</li></ul>"),
                        ChatRoom.editor.setValue(t))
                },
                error: function (e) {
                    $("#chatContentTip").addClass("error").html("<ul><li>" + e.statusText + "</li></ul>"),
                        ChatRoom.editor.setValue(t)
                },
                complete: function (e, t) {
                    ChatRoom.isSend = !1,
                        $("#form button.red").removeAttr("disabled").css("opacity", "1")
                }
            }))
    };

    // 单词面板优化：移除了快捷消息按钮，专注于单词学习功能

    // 隐藏可能阻挡单词显示的机器人按钮或相关元素
    function hideRobotElements() {
        const robotElements = document.querySelectorAll(
            '#robotBtn, [id*="robotBtn"], ' +
            '.robot-btn, .robot-tool-bar, .robot-chat-box, ' +
            '[class*="robot"], [class*="机器人"], ' +
            '[id*="机器人"], [class*="ice-game-icon"]'
        );

        // 直接隐藏所有匹配的机器人元素
        robotElements.forEach(el => {
            el.style.display = 'none';
        });
    }
    const postgraduateWords1 = [
        { word: "define", meanings: [{ pos: "vt.", meaning: "定义；使明确；规定" }] },
        { word: "definition", meanings: [{ pos: "n.", meaning: "定义； 清晰度；解说" }] },
        { word: "identify", meanings: [{ pos: "vt.", meaning: "确定；鉴定；识别，辨认出；使参与；把…看成一样 vi. 确定；认同；一致" }] },
        { word: "identifiable", meanings: [{ pos: "adj.", meaning: "可辨认的；可认明的；可证明是同一的" }] },
        { word: "identity", meanings: [{ pos: "n.", meaning: "身份；同一性，一致；特性；恒等式" }] },
        { word: "determine", meanings: [{ pos: "v.", meaning: "（使）下决心，（使）做出决定" }, { pos: "vt.", meaning: "决定，确定；判定，判决；限定" }, { pos: "vi.", meaning: "确定；决定；判决，终止；了结，终止，结束" }] },
        { word: "determinism", meanings: [{ pos: "n.", meaning: "决定论" }] },
        { word: "judge", meanings: [{ pos: "vt.", meaning: "判断；审判" }, { pos: "n.", meaning: "法官；裁判员" }, { pos: "vi.", meaning: "审判；判决" }] },
        { word: "behavior", meanings: [{ pos: "n.", meaning: "行为，举止；态度；反应" }] },
        { word: "behavioral", meanings: [{ pos: "adj.", meaning: "行为的" }] },
        { word: "conduct", meanings: [{ pos: "n.", meaning: "进行；行为；实施" }, { pos: "vi.", meaning: "导电；带领" }, { pos: "vt.", meaning: "管理；引导；表现" }] },
        { word: "manner", meanings: [{ pos: "n.", meaning: "方式；习惯；种类；规矩；风俗" }] },
        { word: "performance", meanings: [{ pos: "n.", meaning: "性能；绩效；表演；执行；表现" }] },
    ];


    // 初始化时隐藏机器人元素
    hideRobotElements();

    // 添加页面加载完成后的监听器，确保DOM元素加载完成后再隐藏
    window.addEventListener('load', function () {
        hideRobotElements();
    });

    // 添加定时检查，确保页面动态加载的机器人元素也能被隐藏
    setInterval(hideRobotElements, 5000); // 每5秒检查一次

    // 初始化单词显示
    initializeWordDisplay();

    // 路径变化时重新初始化单词显示
    setTimeout(initializeWordDisplay, 500);
})();