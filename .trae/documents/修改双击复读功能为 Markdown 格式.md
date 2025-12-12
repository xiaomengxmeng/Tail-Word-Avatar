# 修改双击复读功能为 Markdown 格式

## 核心任务

将 `button_manager.js` 中的双击复读功能从直接发送 HTML 内容改为先将 HTML 转换为 Markdown 格式，然后发送转换后的 Markdown 内容。

## 实现步骤

### 1. 添加 htmlToMarkdownQuote 函数

从 `快捷功能-3284ffe8.js` 中复制完善的 `htmlToMarkdownQuote` 函数（第 1086 行版本）到 `button_manager.js` 中，该版本支持处理图片等元素。

### 2. 修改双击事件处理逻辑

将双击事件处理函数中的流程修改为：
- 提取消息 HTML 内容
- 调用 `htmlToMarkdownQuote` 将 HTML 转换为 Markdown
- 发送转换后的 Markdown 内容

### 3. 测试功能

确保修复后的复读功能能正确将 HTML 转换为 Markdown 格式并发送。

## 代码实现

### 1. 添加 htmlToMarkdownQuote 函数

```javascript
// 解析消息，将HTML转换为Markdown格式的引用
function htmlToMarkdownQuote(html, currentLevel = 0) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    function processElement(element, level) {
        let markdown = '';
        const indent = '>'.repeat(level) + (level > 0 ? ' ' : '');

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
                    } else if(node.childNodes[0] && node.childNodes[0].tagName.toLowerCase() === 'img') {
                        // 处理图片
                        markdown += indent + node.innerHTML.trim() + '\n';
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

        if (level === 0 && markdown) {
            markdown += '\n';
        }

        return markdown;
    }

    return processElement(tempDiv, currentLevel);
}
```

### 2. 修改双击事件处理函数

```javascript
// 双击消息内容复读功能
document.addEventListener('dblclick', function(event) {
    // 检查是否双击了消息内容区域
    const chatContent = event.target.closest('.chats__content');
    if (!chatContent) return;
    
    // 阻止默认行为
    event.preventDefault();
    event.stopPropagation();
    
    // 提取消息的HTML内容
    const messageHTML = extractMessageHTML(chatContent);
    if (!messageHTML) {
        console.error('无法提取消息内容');
        showNotification('无法提取消息内容', 'error');
        return;
    }
    
    // 将HTML转换为Markdown格式
    const markdownContent = htmlToMarkdownQuote(messageHTML);
    if (!markdownContent) {
        console.error('无法将HTML转换为Markdown');
        showNotification('无法转换消息格式', 'error');
        return;
    }
    
    // 发送消息
    sendMessagesApi([markdownContent])
        .then(() => {
            showNotification('消息已复读', 'success');
        })
        .catch(error => {
            console.error('复读消息失败:', error);
            showNotification('复读消息失败，请稍后重试', 'error');
        });
});
```

## 技术要点

1. **使用完善的 htmlToMarkdownQuote 函数**：支持处理文本、段落、引用、链接和图片等元素
2. **保持代码一致性**：参考快捷功能文件中的实现方式
3. **错误处理**：添加转换失败的处理逻辑
4. **确保功能完整**：不影响其他功能的正常运行

## 预期结果

- 双击消息内容时，系统会将消息的 HTML 内容转换为 Markdown 格式
- 发送转换后的 Markdown 内容，而不是原始 HTML
- 支持处理各种类型的消息，包括文本、图片、链接、引用等
- 与快捷功能文件中的实现保持一致

## 测试建议

1. 测试文本消息的转换
2. 测试包含图片的消息转换
3. 测试包含链接的消息转换
4. 测试包含引用的消息转换
5. 测试复杂格式的消息转换

