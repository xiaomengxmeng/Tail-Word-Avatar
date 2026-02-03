// ==UserScript==
// @name         摸鱼派消息截图
// @namespace    https://fishpi.cn
// @version      1.0.0
// @description  为摸鱼派聊天室消息添加截图功能，支持截取消息并保存为图片
// @author       ZeroDream
// @match        https://fishpi.cn/cr
// @icon         https://fishpi.cn/images/favicon.png
// @grant        none
// @run-at       document-end
// @license MIT
// ==/UserScript==
// ZDream03 2026-2-2 添加截图功能
// ZDream03 2026-2-3 修改截图按钮位置，处理所有消息 添加文件名自动复制到剪切板
(function() {
    'use strict';

    // 配置
    const CONFIG = {
        html2canvasCDN: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        maxContentLength: 20, // 消息内容摘要最大长度
        screenshotScale: 1,    // 截图缩放比例（1为原大小）
        debounceDelay: 300,    // 防抖延迟
    };

    // 状态
    let html2canvasLoaded = false;
    let messageObserver = null;
    let lastProcessTime = 0;
    let processedMessages = new Set();

    // 初始化
    function init() {
        console.log('摸鱼派消息截图脚本初始化...');
        
        // 加载HTML2Canvas库
        loadHtml2Canvas().then(() => {
            console.log('HTML2Canvas库加载成功');
            html2canvasLoaded = true;
            
            // 初始扫描消息菜单
            scanMessageMenus();
            
            // 开始监听消息变化
            startMessageObserver();
            
        }).catch(error => {
            console.error('HTML2Canvas库加载失败:', error);
            showFeedback('HTML2Canvas库加载失败，截图功能不可用', 'error');
        });
    }

    // 加载HTML2Canvas库
    function loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (window.html2canvas) {
                resolve();
                return;
            }
            
            // 创建script标签
            const script = document.createElement('script');
            script.src = CONFIG.html2canvasCDN;
            script.onload = () => {
                if (window.html2canvas) {
                    resolve();
                } else {
                    reject(new Error('HTML2Canvas库加载失败'));
                }
            };
            script.onerror = () => {
                reject(new Error('HTML2Canvas库加载失败'));
            };
            
            document.head.appendChild(script);
        });
    }

    // 扫描消息菜单
    function scanMessageMenus() {
        const messageItems = document.querySelectorAll('[id^="chatroom"]');
        
        messageItems.forEach(messageItem => {
            const messageId = messageItem.id;
            
            // 检查是否已有截图按钮，如果没有则处理
            const dateBar = messageItem.querySelector('.ft__smaller.ft__fade.fn__right.date-bar');
            if (dateBar) {
                const detailsMenu = dateBar.querySelector('details');
                if (detailsMenu && !detailsMenu.querySelector('.screenshot-menu-item')) {
                    addScreenshotMenuItem(detailsMenu, messageItem);
                    processedMessages.add(messageId);
                } else if (!detailsMenu) {
                    // 如果没有菜单，创建并添加
                    processMessageMenu(messageItem);
                    processedMessages.add(messageId);
                }
            }
        });
    }

    // 处理单个消息菜单
    function processMessageMenu(messageItem) {
        const dateBar = messageItem.querySelector('.ft__smaller.ft__fade.fn__right.date-bar');
        if (!dateBar) return;
        
        let detailsMenu = dateBar.querySelector('details');
        if (!detailsMenu) {
            // 如果没有菜单，创建一个
            detailsMenu = createDetailsMenu();
            dateBar.appendChild(detailsMenu);
        }
        
        // 检查是否已有截图按钮
        if (!detailsMenu.querySelector('.screenshot-menu-item')) {
            addScreenshotMenuItem(detailsMenu, messageItem);
        }
    }

    // 创建details菜单
    function createDetailsMenu() {
        const details = document.createElement('details');
        details.className = 'screenshot-details-menu';
        details.style.cssText = `
            display: inline-block;
            margin-left: 8px;
        `;
        
        const summary = document.createElement('summary');
        summary.style.cssText = `
            cursor: pointer;
            list-style: none;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
        `;
        summary.textContent = '⋯';
        
        // 移除默认箭头
        summary.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        details.appendChild(summary);
        return details;
    }

    // 添加截图菜单项
    function addScreenshotMenuItem(detailsMenu, messageItem) {
        // 查找现有的 details-menu 元素
        const detailsMenuContainer = detailsMenu.querySelector('details-menu');
        
        const screenshotItem = document.createElement('a');
        screenshotItem.className = 'screenshot-menu-item item';
        screenshotItem.style.cssText = `
            cursor: pointer;
        `;
        screenshotItem.textContent = '截图';
        
        // 添加点击事件
        screenshotItem.addEventListener('click', (e) => {
            e.stopPropagation();
            captureMessageScreenshot(messageItem);
            detailsMenu.removeAttribute('open');
        });
        
        // 如果有 details-menu，添加到其中，否则创建 menu-content
        if (detailsMenuContainer) {
            detailsMenuContainer.appendChild(screenshotItem);
        } else {
            const menuContent = detailsMenu.querySelector('.menu-content') || createMenuContent(detailsMenu);
            menuContent.appendChild(screenshotItem);
        }
    }

    // 创建菜单内容容器
    function createMenuContent(detailsMenu) {
        const menuContent = document.createElement('div');
        menuContent.className = 'menu-content';
        menuContent.style.cssText = `
            position: absolute;
            right: 0;
            top: 100%;
            margin-top: 4px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 80px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        detailsMenu.appendChild(menuContent);
        return menuContent;
    }

    // 开始监听消息变化
    function startMessageObserver() {
        const chatContainer = document.querySelector('#comments') || document.body;
        
        messageObserver = new MutationObserver((mutations) => {
            // 防抖处理
            const now = Date.now();
            if (now - lastProcessTime < CONFIG.debounceDelay) return;
            lastProcessTime = now;
            
            let hasNewMessages = false;
            
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    hasNewMessages = true;
                }
            });
            
            if (hasNewMessages) {
                setTimeout(() => {
                    scanMessageMenus();
                }, 100);
            }
        });
        
        messageObserver.observe(chatContainer, {
            childList: true,
            subtree: true
        });
        
        console.log('消息观察器已启动');
    }

    // 捕获消息截图
    function captureMessageScreenshot(messageItem) {
        if (!html2canvasLoaded || !window.html2canvas) {
            showFeedback('HTML2Canvas库未加载，无法截图', 'error');
            return;
        }
        
        showFeedback('正在截图...', 'info');
        
        try {
            // 获取消息内容DOM
            const { clone, tempContainer } = getMessageContentDOM(messageItem);
            if (!clone || !tempContainer) {
                showFeedback('无法定位消息内容', 'error');
                return;
            }
            
            // 将临时容器添加到文档中
            document.body.appendChild(tempContainer);
            
            // 配置HTML2Canvas
            const options = {
                dpi: 300, // 解决生产图片模糊
                scale: CONFIG.screenshotScale,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                logging: false,
                backgroundColor: '#ffffff',
                removeContainer: true,
                willReadFrequently: true,
                width: clone.offsetWidth,
                height: clone.offsetHeight
            };
            
            console.log('开始执行截图...');
            console.log('截图尺寸:', clone.offsetWidth, 'x', clone.offsetHeight);
            
            // 执行截图
            window.html2canvas(clone, options).then(canvas => {
                console.log('截图成功，显示手动保存对话框...');
                console.log('Canvas尺寸:', canvas.width, 'x', canvas.height);
                
                // 生成文件名
                const filename = generateScreenshotFilename(messageItem);
                
                // 自动复制文件名到剪贴板
                copyToClipboard(filename)
                    .then(() => {
                        console.log('文件名已复制到剪贴板:', filename);
                        showFeedback('文件名已复制到剪贴板', 'success');
                    })
                    .catch(err => {
                        console.error('复制文件名失败:', err);
                        // 复制失败不影响截图显示
                    });
                
                // 直接显示手动保存对话框
                showCanvasForManualSave(canvas, filename);
                
            }).catch(error => {
                console.error('截图失败:', error);
                showFeedback(`截图失败: ${error.message}`, 'error');
            }).finally(() => {
                // 清理临时容器
                if (tempContainer.parentNode) {
                    tempContainer.parentNode.removeChild(tempContainer);
                }
            });
            
        } catch (error) {
            console.error('截图过程出错:', error);
            showFeedback(`截图过程出错: ${error.message}`, 'error');
        }
    }

    // 获取消息内容DOM
    function getMessageContentDOM(messageItem) {
        // 克隆整个消息元素，确保包含头像、用户名、徽章、消息内容等所有信息
        const clone = messageItem.cloneNode(true);
        
        // 清理不需要的元素：操作菜单下拉内容、截图按钮等
        const unwantedElements = clone.querySelectorAll('details-menu, .fn__layer, .screenshot-menu-item, .menu-content');
        unwantedElements.forEach(el => el.remove());
        
        // 将SVG <use> 元素内联化，以便HTML2Canvas正确渲染
        inlineSVGUseElements(clone);
        
        // 确保样式正确
        clone.style.cssText = `
            background: white;
            padding: 10px;
            border-radius: 4px;
            max-width: 600px;
            font-size: 14px;
            color: #2c2c2c;
        `;
        
        // 创建临时容器
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            z-index: -1;
            opacity: 0;
        `;
        tempContainer.appendChild(clone);
        
        return { clone, tempContainer };
    }
    
    // 将SVG <use> 元素内联化
    function inlineSVGUseElements(element) {
        const useElements = element.querySelectorAll('use');
        console.log(`找到 ${useElements.length} 个 SVG use 元素`);
        
        useElements.forEach((useEl, index) => {
            const xlinkHref = useEl.getAttribute('xlink:href') || useEl.getAttribute('href');
            if (!xlinkHref) return;
            
            // 获取引用的SVG定义
            const symbolId = xlinkHref.replace('#', '');
            const symbol = document.getElementById(symbolId);
            
            if (symbol) {
                console.log(`处理 SVG use 元素 ${index + 1}: ${xlinkHref}`);
                
                // 创建新的SVG元素
                const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgEl.setAttribute('style', useEl.parentElement.getAttribute('style') || '');
                svgEl.setAttribute('class', useEl.parentElement.getAttribute('class') || '');
                
                // 复制symbol的内容
                const symbolContent = symbol.innerHTML;
                svgEl.innerHTML = symbolContent;
                
                // 复制viewBox等属性
                const viewBox = symbol.getAttribute('viewBox');
                if (viewBox) {
                    svgEl.setAttribute('viewBox', viewBox);
                }
                
                // 设置宽高
                const width = symbol.getAttribute('width') || '16';
                const height = symbol.getAttribute('height') || '16';
                svgEl.setAttribute('width', width);
                svgEl.setAttribute('height', height);
                
                // 替换原来的SVG元素
                const parentSVG = useEl.parentElement;
                if (parentSVG && parentSVG.parentElement) {
                    parentSVG.parentElement.replaceChild(svgEl, parentSVG);
                    console.log(`SVG use 元素 ${index + 1} 已内联化`);
                }
            } else {
                console.warn(`找不到 SVG symbol: ${symbolId}`);
            }
        });
    }
    
    // 在调用HTML2Canvas之前处理资源，避免canvas污染
    function processImagesBeforeScreenshot(element) {
        // 处理可能包含背景图片的元素（背景图片也可能导致污染）
        const allElements = element.querySelectorAll('*');
        console.log(`检查 ${allElements.length} 个元素的背景图片`);
        
        allElements.forEach((el, index) => {
            try {
                const style = window.getComputedStyle(el);
                const backgroundImage = style.backgroundImage || '';
                
                // 检查是否包含背景图片
                if (backgroundImage && backgroundImage !== 'none') {
                    console.log(`元素 ${index + 1} 包含背景图片:`, backgroundImage);
                    // 移除背景图片，避免canvas污染
                    el.style.backgroundImage = 'none';
                    el.style.backgroundColor = '#f0f0f0';
                    console.log(`元素 ${index + 1} 的背景图片已移除`);
                }
            } catch (e) {
                console.warn(`无法获取元素 ${index + 1} 的样式:`, e);
            }
        });
        
        console.log('资源处理完成，图片已保留');
    }

    // 生成截图文件名
    function generateScreenshotFilename(messageItem) {
        // 获取用户名
        const userElement = messageItem.querySelector('#userName .ft-gray') || 
                          messageItem.querySelector('.username') || 
                          messageItem.querySelector('.user-name');
        const userName = userElement ? userElement.textContent.trim() : '匿名';
        
        // 只获取用户发言内容（.vditor-reset 中的内容）
        const contentElement = messageItem.querySelector('.vditor-reset');
        let contentText = '';
        if (contentElement) {
            // 获取消息内容，限制长度并清理特殊字符
            contentText = contentElement.textContent.trim()
                .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_') // 将特殊字符替换为下划线
                .substring(0, 50); // 限制长度
        }
        
        // 处理用户名特殊字符
        const safeUserName = userName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
        
        // 生成最终文件名：用户名_消息内容.png
        return contentText ? `${safeUserName}_${contentText}.png` : `${safeUserName}_截图.png`;
    }

    // 下载截图
    function downloadScreenshot(canvas, filename) {
        // 尝试方式1: 使用 toBlob 方法（最可靠，但要求Canvas未被污染）
        try {
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas转换为Blob失败，尝试使用 toDataURL');
                    // 尝试方式2: 使用 toDataURL 方法
                    tryDataURLDownload(canvas, filename);
                    return;
                }
                
                try {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // 释放URL对象
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 100);
                    
                    console.log('使用 toBlob 方法下载成功');
                    
                } catch (error) {
                    console.error('下载过程出错:', error);
                    // 尝试方式2: 使用 toDataURL 方法
                    tryDataURLDownload(canvas, filename);
                }
                
            }, 'image/png', 0.95);
        } catch (error) {
            console.error('Canvas toBlob 失败:', error);
            // 尝试方式2: 使用 toDataURL 方法
            tryDataURLDownload(canvas, filename);
        }
    }
    
    // 尝试使用 toDataURL 方法下载
    function tryDataURLDownload(canvas, filename) {
        try {
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('使用 toDataURL 方法下载成功');
            
        } catch (error) {
            console.error('toDataURL 方法也失败:', error);
            // 降级方案: 显示Canvas让用户手动保存
            showCanvasForManualSave(canvas, filename);
        }
    }
    
    // 降级方案: 显示Canvas让用户手动保存
    function showCanvasForManualSave(canvas, filename) {
        console.log('显示降级方案: 手动保存Canvas');
        
        // 创建一个模态框显示Canvas
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        // 添加提示信息
        const info = document.createElement('div');
        info.style.cssText = `
            color: white;
            margin-bottom: 20px;
            text-align: center;
            font-size: 16px;
            max-width: 600px;
        `;
        info.innerHTML = `
            <p><strong>📸 截图已生成</strong></p>
            <p>请<strong>右键点击图片</strong>，选择<strong>"图片另存为..."</strong>来保存截图。</p>
        `;
        modal.appendChild(info);
        
        // 添加文件名显示和复制按钮
        const filenameContainer = document.createElement('div');
        filenameContainer.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 90%;
        `;
        
        const filenameText = document.createElement('span');
        filenameText.style.cssText = `
            color: #fff;
            font-size: 14px;
            font-family: monospace;
            word-break: break-all;
        `;
        filenameText.textContent = filename;
        filenameContainer.appendChild(filenameText);
        
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 复制';
        copyBtn.style.cssText = `
            padding: 6px 12px;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
            flex-shrink: 0;
        `;
        copyBtn.addEventListener('click', async () => {
            try {
                await copyToClipboard(filename);
                copyBtn.textContent = '✅ 已复制';
                showFeedback('文件名已复制到剪贴板', 'success');
                setTimeout(() => {
                    copyBtn.textContent = '📋 复制';
                }, 2000);
            } catch (err) {
                console.error('复制失败:', err);
                copyBtn.textContent = '❌ 复制失败';
                setTimeout(() => {
                    copyBtn.textContent = '📋 复制';
                }, 2000);
            }
        });
        filenameContainer.appendChild(copyBtn);
        modal.appendChild(filenameContainer);
        
        // 添加Canvas
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 90%;
            max-height: 70%;
            overflow: auto;
        `;
        
        // 克隆Canvas并添加到容器
        const clonedCanvas = document.createElement('canvas');
        clonedCanvas.width = canvas.width;
        clonedCanvas.height = canvas.height;
        const ctx = clonedCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        clonedCanvas.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            display: block;
        `;
        canvasContainer.appendChild(clonedCanvas);
        modal.appendChild(canvasContainer);
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            margin-top: 20px;
            padding: 10px 30px;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        `;
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        modal.appendChild(closeBtn);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
        
        showFeedback('截图已生成，请手动保存', 'info');
    }

    // 复制文本到剪贴板
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            // 尝试使用现代 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        resolve();
                    })
                    .catch(err => {
                        console.error('Clipboard API 复制失败:', err);
                        // 降级到传统方法
                        tryLegacyCopy(text, resolve, reject);
                    });
            } else {
                // 使用传统方法
                tryLegacyCopy(text, resolve, reject);
            }
        });
    }
    
    // 传统复制方法（降级方案）
    function tryLegacyCopy(text, resolve, reject) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // 设置样式使其不可见
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            // 选择文本并复制
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                resolve();
            } else {
                reject(new Error('传统复制方法失败'));
            }
        } catch (err) {
            console.error('传统复制方法出错:', err);
            reject(err);
        }
    }

    // 显示反馈信息
    function showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = 'screenshot-feedback';
        feedback.textContent = message;
        
        const typeStyles = {
            success: {
                backgroundColor: '#4CAF50',
                borderLeftColor: '#2E7D32'
            },
            error: {
                backgroundColor: '#F44336',
                borderLeftColor: '#C62828'
            },
            info: {
                backgroundColor: '#2196F3',
                borderLeftColor: '#1565C0'
            }
        };
        
        const style = typeStyles[type] || typeStyles.info;
        
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background-color: ${style.backgroundColor};
            color: white;
            border-left: 4px solid ${style.borderLeftColor};
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 9999;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        
        // 显示动画
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(0)';
        }, 10);
        
        // 隐藏动画
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();