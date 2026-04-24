// ==UserScript==
// @name         猜百科自动输入助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动逐个输入常猜汉字，快速揭示文段内容
// @author       ZDream03
// @match        https://guess.wiki/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const commonWords = [
        '的', '是', '了', '在', '和', '与', '并', '到', '加', '方',
        '这', '年', '国', '称', '位', '于', '省', '中', '北', '南',
        '西', '江', '长', '入', '海', '世', '物', '理', '生', '医',
        '数', '疗', '病', '药', '学', '科', '技', '术',
        '大', '小', '多', '少', '上', '下', '左', '右', '前', '后',
        '东', '高', '低', '新', '旧', '好', '坏', '男', '女', '人',
        '天', '地', '水', '火', '山', '风', '云', '雨', '雪', '日',
        '月', '星', '光', '电', '气', '力', '心', '目', '手', '口',
        '头', '足', '身', '面', '言', '行', '知', '见', '思', '意',
        '法', '道', '德', '情', '性', '命', '死', '活', '成', '败',
        '起', '落', '进', '退', '开', '关', '出', '回', '来', '去',
        '有', '无', '同', '异', '真', '假', '实', '虚', '明', '暗',
        '重', '轻', '快', '慢', '冷', '热', '干', '湿', '白', '黑',
        '红', '黄', '青', '绿', '紫', '金', '银', '铜', '铁', '石',
        '木', '草', '花', '果', '树', '叶', '根', '茎', '种', '苗',
        '鸟', '鱼', '虫', '兽', '马', '牛', '羊', '猪', '狗', '猫',
        '鸡', '鸭', '鹅', '蛇', '龙', '虎', '象', '鹿', '兔', '鼠',
        '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
        '百', '千', '万', '亿', '零', '整', '半', '双', '单', '对',
        '京', '沪', '津', '渝', '冀', '豫', '云', '辽', '黑', '湘',
        '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋',
        '蒙', '陕', '吉', '闽', '贵', '粤', '川', '青', '藏', '琼',
        '宁'
    ];

    let isRunning = false;
    let currentIndex = 0;
    let stopRequested = false;
    let guessedWords = new Set();
    let missedWords = new Set();
    let inputInterval = 400;

    function findInputElement() {
        let el = document.querySelector('input[type="text"]');
        if (!el) el = document.querySelector('input[placeholder*="猜"]');
        if (!el) el = document.querySelector('input[placeholder*="输入"]');
        if (!el) el = document.querySelector('input[placeholder*="字"]');
        if (!el) el = document.querySelector('#guess-input');
        if (!el) el = document.querySelector('#entry');
        if (!el) {
            const inputs = document.querySelectorAll('input');
            for (const inp of inputs) {
                if (inp.type === 'text' || inp.type === '') {
                    el = inp;
                    break;
                }
            }
        }
        return el;
    }

    function findSubmitButton() {
        let btn = document.querySelector('button[type="submit"]');
        if (!btn) btn = document.querySelector('button.guess-btn');
        if (!btn) btn = document.querySelector('button.submit-btn');
        if (!btn) btn = document.querySelector('#guess-btn');
        if (!btn) btn = document.querySelector('#submit-btn');
        if (!btn) {
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
                const text = b.textContent.trim();
                if (text.includes('猜') || text.includes('提交') || text.includes('确定') || text.includes('发送')) {
                    btn = b;
                    break;
                }
            }
        }
        return btn;
    }

    function getAlreadyRevealedChars() {
        const revealed = new Set();
        const textElements = document.querySelectorAll('.revealed, .shown, .uncovered, .visible');
        textElements.forEach(el => {
            const text = el.textContent.trim();
            for (const ch of text) {
                if (ch !== '■' && ch !== ' ' && ch !== '\n') {
                    revealed.add(ch);
                }
            }
        });
        const allText = document.body.innerText;
        const blockRegex = /[^\s■\n\r]{1}/g;
        const articleArea = document.querySelector('.article, .text, .content, .passage, #article, #text, #content');
        if (articleArea) {
            const articleText = articleArea.innerText;
            for (const ch of articleText) {
                if (ch !== '■' && ch !== ' ' && ch !== '\n' && ch !== '\r') {
                    revealed.add(ch);
                }
            }
        }
        return revealed;
    }

    function getMissedChars() {
        const missed = new Set();
        const missedElements = document.querySelectorAll('.missed, .wrong, .absent, .not-found, .not-found-chars');
        missedElements.forEach(el => {
            const text = el.textContent.trim();
            for (const ch of text) {
                if (ch.trim() && ch !== ',' && ch !== '、' && ch !== '，' && ch !== ' ') {
                    missed.add(ch);
                }
            }
        });
        return missed;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function submitWord(word) {
        const input = findInputElement();
        if (!input) {
            updateStatus('❌ 未找到输入框');
            return false;
        }

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, word);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        await sleep(100);

        const submitBtn = findSubmitButton();
        if (submitBtn) {
            submitBtn.click();
        } else {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }

        return true;
    }

    async function startAutoInput() {
        if (isRunning) return;
        isRunning = true;
        stopRequested = false;
        currentIndex = 0;

        updateButtonStates();
        updateStatus('🚀 开始自动输入...');

        const revealed = getAlreadyRevealedChars();
        const missed = getMissedChars();

        revealed.forEach(ch => guessedWords.add(ch));
        missed.forEach(ch => missedWords.add(ch));

        for (let i = 0; i < commonWords.length; i++) {
            if (stopRequested) {
                updateStatus('⏹️ 已停止自动输入');
                break;
            }

            const word = commonWords[i];
            currentIndex = i + 1;

            if (guessedWords.has(word)) {
                updateProgress(i + 1, commonWords.length, word, '⏭️ 跳过(已猜中)');
                continue;
            }

            if (missedWords.has(word)) {
                updateProgress(i + 1, commonWords.length, word, '⏭️ 跳过(已确认无)');
                continue;
            }

            updateProgress(i + 1, commonWords.length, word, '⏳ 输入中...');

            const success = await submitWord(word);
            if (!success) {
                updateStatus('❌ 输入失败，请检查页面');
                break;
            }

            await sleep(inputInterval);

            const newRevealed = getAlreadyRevealedChars();
            const newMissed = getMissedChars();

            if (newRevealed.has(word)) {
                guessedWords.add(word);
                updateProgress(i + 1, commonWords.length, word, '✅ 命中！');
            } else if (newMissed.has(word)) {
                missedWords.add(word);
                updateProgress(i + 1, commonWords.length, word, '❌ 未出现');
            } else {
                updateProgress(i + 1, commonWords.length, word, '⏳ 已提交');
            }

            updateStats();

            await sleep(100);
        }

        if (!stopRequested) {
            updateStatus('🎉 自动输入完成！');
        }

        isRunning = false;
        updateButtonStates();
    }

    function stopAutoInput() {
        stopRequested = true;
        updateStatus('⏹️ 正在停止...');
    }

    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'guess-helper-panel';
        panel.innerHTML = `
            <div id="gh-header">
                <span id="gh-title">🎯 猜百科助手</span>
                <span id="gh-close">✕</span>
            </div>
            <div id="gh-body">
                <div id="gh-status">准备就绪</div>
                <div id="gh-progress"></div>
                <div id="gh-stats">
                    <span id="gh-hit">命中: 0</span>
                    <span id="gh-miss">未出现: 0</span>
                    <span id="gh-remain">剩余: ${commonWords.length}</span>
                </div>
                <div id="gh-controls">
                    <button id="gh-start" class="gh-btn gh-btn-start">▶ 开始</button>
                    <button id="gh-stop" class="gh-btn gh-btn-stop" disabled>⏹ 停止</button>
                </div>
                <div id="gh-speed">
                    <label>速度: <input type="range" id="gh-speed-slider" min="100" max="1000" value="400" step="50"></label>
                    <span id="gh-speed-value">400ms</span>
                </div>
                <div id="gh-wordlist-toggle">📝 查看字表</div>
                <div id="gh-wordlist" style="display:none;"></div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #guess-helper-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 280px;
                background: #1a1a2e;
                border: 1px solid #16213e;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #e0e0e0;
                overflow: hidden;
                user-select: none;
            }
            #gh-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                background: #16213e;
                cursor: move;
            }
            #gh-title {
                font-size: 14px;
                font-weight: 600;
                color: #00d2ff;
            }
            #gh-close {
                cursor: pointer;
                font-size: 16px;
                color: #888;
                padding: 0 4px;
            }
            #gh-close:hover { color: #ff5555; }
            #gh-body {
                padding: 12px 14px;
            }
            #gh-status {
                font-size: 13px;
                margin-bottom: 8px;
                color: #aaa;
                min-height: 20px;
            }
            #gh-progress {
                font-size: 12px;
                color: #666;
                margin-bottom: 8px;
                min-height: 16px;
            }
            #gh-stats {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                margin-bottom: 10px;
                padding: 6px 8px;
                background: #0f3460;
                border-radius: 6px;
            }
            #gh-hit { color: #50fa7b; }
            #gh-miss { color: #ff5555; }
            #gh-remain { color: #f1fa8c; }
            #gh-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
            }
            .gh-btn {
                flex: 1;
                padding: 8px 0;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .gh-btn-start {
                background: #50fa7b;
                color: #1a1a2e;
            }
            .gh-btn-start:hover { background: #69ff8e; }
            .gh-btn-start:disabled { background: #333; color: #666; cursor: not-allowed; }
            .gh-btn-stop {
                background: #ff5555;
                color: #fff;
            }
            .gh-btn-stop:hover { background: #ff6e6e; }
            .gh-btn-stop:disabled { background: #333; color: #666; cursor: not-allowed; }
            #gh-speed {
                font-size: 11px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #gh-speed label { flex: 1; display: flex; align-items: center; gap: 4px; }
            #gh-speed input[type="range"] {
                flex: 1;
                height: 4px;
                -webkit-appearance: none;
                background: #333;
                border-radius: 2px;
                outline: none;
            }
            #gh-speed input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #00d2ff;
                cursor: pointer;
            }
            #gh-speed-value { color: #00d2ff; min-width: 40px; text-align: right; }
            #gh-wordlist-toggle {
                font-size: 12px;
                color: #888;
                cursor: pointer;
                padding: 4px 0;
            }
            #gh-wordlist-toggle:hover { color: #00d2ff; }
            #gh-wordlist {
                max-height: 200px;
                overflow-y: auto;
                font-size: 11px;
                color: #666;
                line-height: 1.8;
                padding: 6px 8px;
                background: #0f3460;
                border-radius: 6px;
                margin-top: 6px;
                word-break: break-all;
            }
            #gh-wordlist .gh-hit-word { color: #50fa7b; text-decoration: line-through; }
            #gh-wordlist .gh-miss-word { color: #ff5555; text-decoration: line-through; }
            #gh-wordlist .gh-pending-word { color: #aaa; }
        `;

        document.head.appendChild(style);
        document.body.appendChild(panel);

        document.getElementById('gh-start').addEventListener('click', startAutoInput);
        document.getElementById('gh-stop').addEventListener('click', stopAutoInput);
        document.getElementById('gh-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });
        document.getElementById('gh-speed-slider').addEventListener('input', (e) => {
            inputInterval = parseInt(e.target.value);
            document.getElementById('gh-speed-value').textContent = inputInterval + 'ms';
        });
        document.getElementById('gh-wordlist-toggle').addEventListener('click', () => {
            const wl = document.getElementById('gh-wordlist');
            wl.style.display = wl.style.display === 'none' ? 'block' : 'none';
            if (wl.style.display === 'block') updateWordList();
        });

        makeDraggable(panel, document.getElementById('gh-header'));
        updateWordList();
    }

    function makeDraggable(element, handle) {
        let offsetX, offsetY, isDragging = false;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = (e.clientX - offsetX) + 'px';
            element.style.top = (e.clientY - offsetY) + 'px';
            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    function updateStatus(text) {
        const el = document.getElementById('gh-status');
        if (el) el.textContent = text;
    }

    function updateProgress(current, total, word, status) {
        const el = document.getElementById('gh-progress');
        if (el) el.textContent = `[${current}/${total}] ${word} - ${status}`;
    }

    function updateStats() {
        const hitEl = document.getElementById('gh-hit');
        const missEl = document.getElementById('gh-miss');
        const remainEl = document.getElementById('gh-remain');
        if (hitEl) hitEl.textContent = '命中: ' + guessedWords.size;
        if (missEl) missEl.textContent = '未出现: ' + missedWords.size;
        if (remainEl) remainEl.textContent = '剩余: ' + (commonWords.length - guessedWords.size - missedWords.size);
    }

    function updateButtonStates() {
        const startBtn = document.getElementById('gh-start');
        const stopBtn = document.getElementById('gh-stop');
        if (startBtn) startBtn.disabled = isRunning;
        if (stopBtn) stopBtn.disabled = !isRunning;
    }

    function updateWordList() {
        const el = document.getElementById('gh-wordlist');
        if (!el) return;
        let html = '';
        commonWords.forEach(word => {
            let cls = 'gh-pending-word';
            if (guessedWords.has(word)) cls = 'gh-hit-word';
            else if (missedWords.has(word)) cls = 'gh-miss-word';
            html += `<span class="${cls}">${word}</span> `;
        });
        el.innerHTML = html;
    }

    function init() {
        createControlPanel();
        console.log('[猜百科助手] 已加载，共 ' + commonWords.length + ' 个常猜字');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
