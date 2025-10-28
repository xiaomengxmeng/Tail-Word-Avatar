// ==UserScript==
// @name         鱼派单词头像功能集
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  整合单词功能和头像生成功能的精简版脚本   try to thank APTX-4869!
// @author       (江户川-哀酱)APTX-4869
// @match        https://fishpi.cn/*
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';
    const version_us = "v1.0.0";

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

    // 小尾巴选项数组
    const suffixOptions = [
        '时光清浅处，一步一安然。',
        '心若向阳，无畏悲伤。',
        '岁月静好，现世安稳。',
        '人生如逆旅，我亦是行人。',
        '胸有丘壑，眼存山河。',
        '但行好事，莫问前程。',
        '愿有岁月可回首，且以深情共白头。',
        '人间烟火气，最抚凡人心。'
    ];

    // 获取当前选中的小尾巴索引
    function getCurrentSuffixIndex() {
        const index = parseInt(window.localStorage['xwb_suffix_index']);
        return isNaN(index) || index < 0 || index >= suffixOptions.length ? 0 : index;
    }

    // 获取当前小尾巴文本
    function getCurrentSuffixText() {
        return suffixOptions[getCurrentSuffixIndex()] || suffixOptions[0];
    }

    // 定义单词数据
    const postgraduateWords1 = [
        {word: "define", meanings: [{pos: "vt.", meaning: "定义；使明确；规定"}]},
        {word: "definition", meanings: [{pos: "n.", meaning: "定义； 清晰度；解说"}]},
        {word: "identify", meanings: [{pos: "vt.", meaning: "确定；鉴定；识别，辨认出；使参与；把…看成一样 vi. 确定；认同；一致"}]},
        {word: "judge", meanings: [{pos: "vt.", meaning: "判断；审判"}, {pos: "n.", meaning: "法官；裁判员"}, {pos: "vi.", meaning: "审判；判决"}]},
        {word: "behavior", meanings: [{pos: "n.", meaning: "行为，举止；态度；反应"}]},
        // 这里可以添加更多单词，但为了文件简洁，只包含部分示例
    ];

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

    // 定义单词面板背景样式数组
    const wordPanelStyles = [
        { id: 'style1', name: '默认主题', backgroundColor: '#f8f9fa', borderColor: '#dee2e6', textColor: '#212529' },
        { id: 'style2', name: '暗黑主题', backgroundColor: '#343a40', borderColor: '#495057', textColor: '#f8f9fa' },
        { id: 'style3', name: '海洋主题', backgroundColor: '#e3f2fd', borderColor: '#90caf9', textColor: '#1565c0' },
        { id: 'style4', name: '森林主题', backgroundColor: '#e8f5e9', borderColor: '#a5d6a7', textColor: '#2e7d32' },
        { id: 'style5', name: '晚霞主题', backgroundColor: '#fff3e0', borderColor: '#ffcc80', textColor: '#e65100' }
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

    // 创建设置小尾巴单词数量的菜单
    GM_registerMenuCommand("设置小尾巴单词数量", () => {
        const newCount = prompt("请输入小尾巴中输出的单词数量（0-20）：", wordCount);
        const count = parseInt(newCount);
        if (!isNaN(count) && count >= 0 && count <= 20) {
            wordCount = count;
            window.localStorage['xwb_tail_word_count'] = wordCount;
        } else {
            alert("请输入有效的数字（0-20）！");
        }
    });

    // 创建设置左侧显示单词数量的菜单
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

    // 创建小尾巴开关菜单
    GM_registerMenuCommand("小尾巴开关", () => {
        suffixFlag = !suffixFlag;
        window.localStorage['xwb_flag'] = suffixFlag;
    });
    
    // 创建小尾巴更换菜单
    GM_registerMenuCommand("更换小尾巴", () => {
        // 获取自定义小尾巴（如果有）
        let customSuffix = window.localStorage['xwb_custom_suffix'] || '';
        const currentIndex = getCurrentSuffixIndex();
        const isCustom = window.localStorage['xwb_is_custom_suffix'] === 'true';

        // 构建更友好的菜单选项字符串
        let menuStr = '===== 小尾巴选择器 =====\n';
        menuStr += '欢迎选择或自定义聊天小尾巴！\n\n';
        menuStr += '【预设选项】\n';
        suffixOptions.forEach((option, index) => {
            // 高亮当前选中的预设选项
            const highlight = !isCustom && index === currentIndex ? ' ✓ ' : '   ';
            menuStr += `${highlight}[${index + 1}] ${option}\n`;
        });
        menuStr += '\n【自定义选项】\n';
        // 高亮当前选中的自定义状态
        const customHighlight = isCustom ? ' ✓ ' : '   ';
        menuStr += `${customHighlight}[9] 自定义小尾巴\n`;
        menuStr += '\n【快速操作】\n';
        menuStr += '[0] 查看当前小尾巴预览\n\n';

        menuStr += `【当前状态】：${getCurrentSuffixText()}${isCustom ? '（自定义）' : ''}\n\n`;
        menuStr += '请输入：\n';
        menuStr += '- 数字 1-' + suffixOptions.length + ' 选择预设小尾巴\n';
        menuStr += '- 数字 9 进入自定义小尾巴界面\n';
        menuStr += '- 数字 0 查看当前小尾巴预览\n';
        menuStr += '- 直接输入文本 设置为自定义小尾巴\n\n';
        menuStr += '请输入您的选择：';

        // 设置合理的默认值
        const defaultValue = isCustom ? 9 : currentIndex + 1;
        const input = prompt(menuStr, defaultValue);

        if (input === null) {
            // 用户取消操作
            return;
        }

        const trimmedInput = input.trim();

        // 查看预览功能
        if (trimmedInput === '0') {
            const previewText = `当前小尾巴预览：\n\n${getCurrentSuffixText()}`;
            alert(previewText);
            return;
        }

        // 允许用户直接输入自定义文本作为小尾巴
        if (trimmedInput !== '9' && !trimmedInput.match(/^[1-9]$/)) {
            if (trimmedInput !== '') {
                // 用户直接输入了自定义文本，不是选择预设选项
                const newCustomSuffix = trimmedInput;
                // 显示确认对话框
                if (confirm(`确定将以下内容设置为自定义小尾巴吗？\n\n${newCustomSuffix}`)) {
                    window.localStorage['xwb_custom_suffix'] = newCustomSuffix;
                    window.localStorage['xwb_is_custom_suffix'] = 'true';
                    alert("🎉 自定义小尾巴已成功设置！\n" + newCustomSuffix);
                }
                return;
            } else {
                alert("⚠️ 输入内容不能为空！");
                return;
            }
        }

        const choice = parseInt(trimmedInput);

        if (!isNaN(choice)) {
            // 处理预设选项
            if (choice >= 1 && choice <= suffixOptions.length) {
                window.localStorage['xwb_suffix_index'] = choice - 1;
                // 清除自定义小尾巴状态
                if (window.localStorage['xwb_is_custom_suffix']) {
                    delete window.localStorage['xwb_is_custom_suffix'];
                }
                alert("🎉 小尾巴已成功更换为：\n" + suffixOptions[choice - 1]);
            }
            // 处理自定义选项
            else if (choice === 9) {
                const newCustomSuffix = prompt("请输入您的自定义小尾巴：", customSuffix);
                if (newCustomSuffix !== null) {
                    const trimmedCustom = newCustomSuffix.trim();
                    if (trimmedCustom !== '') {
                        window.localStorage['xwb_custom_suffix'] = trimmedCustom;
                        window.localStorage['xwb_is_custom_suffix'] = 'true';
                        alert("🎉 自定义小尾巴已成功设置！\n" + trimmedCustom);
                    } else {
                        alert("⚠️ 自定义小尾巴不能为空！");
                    }
                }
            }
            else {
                alert(`⚠️ 请输入有效的选项序号（1-${suffixOptions.length}、9或0）！`);
            }
        }
        else {
            alert("⚠️ 请输入有效的选项序号！");
        }
    });

    // 发送消息API函数
    function sendMsgApi(msg) {
        var msgData = {
            "content": msg,
            "client": "Web/单词头像功能集" + version_us
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
                client: "Web/单词头像功能集" + version_us
            },
            ChatRoom.editor.setValue(""),
            $.ajax({
                url: Label.servePath + "/chat-room/send",
                type: "POST",
                cache: !1,
                data: JSON.stringify({
                    content: function() {
                        // 获取原始消息内容
                        let originalContent = t;
                        
                        // 处理小尾巴和单词
                        if (t.trim().length == 0 || (!suffixFlag) || needwb == 0 || t.trim().startsWith('凌 ') || t.trim().startsWith('鸽 ') || t.trim().startsWith('小冰 ') || t.trim().startsWith('点歌 ') || t.trim().startsWith('TTS ') || t.trim().startsWith('朗读 ')) {
                            return originalContent;
                        } else if (wordCount === 0) {
                            return originalContent + '\n\n\n>  ' + getCurrentSuffixText();
                        } else {
                            return originalContent + wordMsg + wbMsg;
                        }
                    }(),
                    client: "Web/单词头像功能集" + version_us
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

    // 添加快捷消息按钮
    // 获取列表
    var x = document.getElementsByClassName('reply')[0];
    if (x) {
        // 创建 div 图层
        var elve = document.getElementById("elves");
        if (!elve) {
            elve = document.createElement("div");
            elve.id = "elves";
            elve.align = "right";
            x.appendChild(elve);
        }

        // 鸽 行行好吧 按钮
        var ge_ok = document.createElement("button");
        ge_ok.id = "ge_ok";
        ge_ok.textContent = "鸽 行行好吧";
        ge_ok.className = "red";
        ge_ok.setAttribute('style', 'margin-right:5px');
        // 绑定按键点击功能
        ge_ok.onclick = function () {
            sendMsgApi("鸽 行行好吧");
        };

        // 小冰 去打劫 按钮
        var ice_rob = document.createElement("button");
        ice_rob.id = "ice_rob";
        ice_rob.textContent = "小冰 打劫";
        ice_rob.className = "red";
        ice_rob.setAttribute('style', 'margin-right:5px');
        // 绑定按键点击功能
        ice_rob.onclick = function () {
            sendMsgApi("小冰 去打劫");
        };

        // 添加按钮到图层
        elve.appendChild(ge_ok);
        elve.appendChild(ice_rob);
        
        // 瓦达西瓦泡泡茶 按钮
        var bubble_tea = document.createElement("button");
        bubble_tea.id = "bubble_tea";
        bubble_tea.textContent = "瓦达西瓦泡泡茶";
        bubble_tea.className = "red";
        bubble_tea.setAttribute('style', 'margin-right:5px');
        // 绑定按键点击功能
        bubble_tea.onclick = function () {
            const text = "瓦达西瓦泡泡茶";
            const encodedText = encodeURIComponent(text.trim());
            sendMsgApi(text);
        };
        
        // 昂不利波波 按钮
        var anbuli = document.createElement("button");
        anbuli.id = "anbuli";
        anbuli.textContent = "昂不利波波";
        anbuli.className = "red";
        anbuli.setAttribute('style', 'margin-right:5px');
        // 绑定按键点击功能
        anbuli.onclick = function () {
            sendMsgApi("昂不利波波");
        };
        
        // 添加新按钮到图层
        elve.appendChild(bubble_tea);
        elve.appendChild(anbuli);
        
        // 头像生成按钮 - 仅在功能开启时创建
        if (avatarGenFlag) {
            var avatar_gen = document.createElement("button");
            avatar_gen.id = "avatar_gen";
            avatar_gen.textContent = "生成自定义头像";
            avatar_gen.className = "red";
            avatar_gen.setAttribute('style', 'margin-right:5px');
            // 绑定按键点击功能
            avatar_gen.onclick = function () {
                const defaultText = "不想桀桀桀";
                const customText = prompt("请输入头像上显示的文字：", defaultText);
                if (customText !== null && customText.trim() !== "") {
                    const encodedText = encodeURIComponent(customText.trim());
                    const avatarUrl = `https://fishpi.cn/gen?scale=10&txt=${encodedText}&url=https://file.fishpi.cn/2025/08/blob-3d1dec23.png&backcolor=D3D3D3&fontcolor=1A365D`;
                    sendMsgApi(`![图片表情](${avatarUrl})`);
                }
            };
            
            // 添加按钮到图层
            elve.appendChild(avatar_gen);
        }
    }

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
    
    // 初始化时隐藏机器人元素
    hideRobotElements();
    
    // 添加页面加载完成后的监听器，确保DOM元素加载完成后再隐藏
    window.addEventListener('load', function() {
        hideRobotElements();
    });
    
    // 添加定时检查，确保页面动态加载的机器人元素也能被隐藏
    setInterval(hideRobotElements, 5000); // 每5秒检查一次

    // 初始化单词显示
    initializeWordDisplay();

    // 路径变化时重新初始化单词显示
    setTimeout(initializeWordDisplay, 500);
})();