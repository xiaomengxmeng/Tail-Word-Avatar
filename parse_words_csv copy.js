const fs = require('fs');
const path = require('path');

// 读取CSV文件并将单词解析为JavaScript数组
function parseCSVToJSArray() {
    const csvPath = path.join(__dirname, '2024墨墨考研深度记忆宝典 全部单词.csv');
    const outputPath = path.join(__dirname, 'parsed_words.js');
    
    try {
        // 读取CSV文件内容
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        
        // 分割成行
        const lines = csvContent.split('\n');
        
        // 创建JavaScript数组字符串
        let jsArray = 'const postgraduateWords1 = [\n';
        
        // 处理每一行
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                // 检查是否有引号包围的多行内容
                let fullLine = line;
                
                if (line.includes('"')) {
                    // 检查引号是否成对
                    const quoteCount = (line.match(/"/g) || []).length;
                    const hasMultiLine = quoteCount % 2 !== 0;
                    
                    if (hasMultiLine) {
                        // 寻找匹配的结束引号
                        for (let j = i + 1; j < lines.length; j++) {
                            const nextLine = lines[j];
                            fullLine += '\n' + nextLine;
                            
                            const newQuoteCount = (fullLine.match(/"/g) || []).length;
                            if (newQuoteCount % 2 === 0) {
                                i = j; // 跳过已处理的行
                                break;
                            }
                        }
                    }
                }
                
                // 解析单词和释义
                let word, posMeaning;
                if (fullLine.includes('"')) {
                    // 处理带引号的情况 - 使用更精确的解析
                    const match = fullLine.match(/^([^,]+),"(.+)"$/);
                    if (match) {
                        word = match[1].trim();
                        posMeaning = match[2];
                    } else {
                        // 后备解析
                        const parts = fullLine.split(',"');
                        word = parts[0].trim();
                        posMeaning = parts[1]?.replace(/"$/, '') || '';
                    }
                } else {
                    // 处理普通情况
                    const parts = fullLine.split(',');
                    word = parts[0].trim();
                    posMeaning = parts.slice(1).join(',').trim();
                }
                
                // 提取词性和释义
                if (posMeaning && word) {
                    // 处理可能的多行多词性情况
                    // 分割多行，确保正确处理换行符
                    const posMeaningLines = posMeaning.split(/\r?\n/);
                    
                    // 收集所有词性和释义
                    const meanings = [];
                    
                    for (const line of posMeaningLines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;
                        
                        // 尝试提取词性（通常以n., v., adj.等开头）
                        const posMatch = trimmedLine.match(/^([a-zA-Z.]+)\s+/);
                        
                        if (posMatch) {
                            const pos = posMatch[1];
                            const meaning = trimmedLine.substring(posMatch[0].length).trim();
                            
                            if (meaning) {
                                meanings.push({ pos, meaning });
                            }
                        } else {
                            // 如果没有明确的词性，将整行作为释义
                            meanings.push({ pos: '', meaning: trimmedLine });
                        }
                    }
                    
                    // 如果有收集到词性和释义，生成统一的对象
                    if (meanings.length > 0) {
                        // 构建meanings数组字符串
                        let meaningsStr = '[';
                        for (let i = 0; i < meanings.length; i++) {
                            const { pos, meaning } = meanings[i];
                            meaningsStr += `{pos: "${pos}", meaning: "${meaning.replace(/"/g, '\\"')}"}`;
                            if (i < meanings.length - 1) {
                                meaningsStr += ', ';
                            }
                        }
                        meaningsStr += ']';
                        
                        jsArray += `    {word: "${word}", meanings: ${meaningsStr}},
`;
                    }
                }
            } catch (error) {
                console.error(`解析第${i+1}行出错: ${line}`, error);
            }
        }
        
        // 结束数组
        jsArray = jsArray.replace(/,\n$/, '\n'); // 移除最后一个逗号
        jsArray += '];\n\n// 导出数组以便其他模块使用\ntry {\n    module.exports = postgraduateWords1;\n} catch (e) {\n    // 忽略浏览器环境下的导出错误\n}';
        
        // 写入输出文件
        fs.writeFileSync(outputPath, jsArray, 'utf-8');
        
        console.log(`解析完成！已生成 ${outputPath}`);
        console.log(`共处理 ${lines.length} 行数据`);
        
    } catch (error) {
        console.error('处理CSV文件时出错:', error);
    }
}

// 执行解析
parseCSVToJSArray();