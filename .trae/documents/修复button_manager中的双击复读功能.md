# 修复button_manager中的双击复读功能

## 问题分析

通过对比 `快捷功能-3284ffe8.js` 和 `button_manager.js` 中的双击复读实现，发现 `button_manager.js` 中存在以下问题：

1. **内容提取不完整**：只提取了 `p` 标签的文本内容，可能丢失图片、链接、引用等重要元素
2. **选择器过于具体**：使用 `querySelectorAll('.vditor-reset.ft__smaller p')` 可能会漏掉一些消息内容
3. **文本拼接问题**：直接拼接文本可能导致格式丢失

## 修复方案

### 1. 添加 `extractMessageHTML` 函数

将 `快捷功能-3284ffe8.js` 中完整的 `extractMessageHTML` 函数添加到 `button_manager.js` 中，用于提取完整的消息HTML内容。

### 2. 修改双击事件处理

将双击事件处理函数中的内容提取逻辑替换为使用 `extractMessageHTML` 函数，并直接发送HTML内容。

### 3. 优化消息发送

确保发送的是完整的HTML内容，而不是仅文本内容。

## 执行步骤

1. 在 `button_manager.js` 中添加 `extractMessageHTML` 函数
2. 修改双击事件处理函数，使用新的提取方式
3. 测试功能，确保修复后的复读功能能正确处理各种类型的消息

## 技术要点

- 使用 `extractMessageHTML` 函数提取完整的消息HTML内容
- 发送HTML内容而不是仅文本内容
- 保留消息的原始格式和元素
- 确保修复后能正确处理图片、链接、引用等复杂内容

## 预期结果

- 双击消息内容时能提取并发送完整的HTML内容
- 支持图片、链接、引用等复杂消息类型
- 保持消息的原始格式
- 与 `快捷功能-3284ffe8.js` 中的修复保持一致

