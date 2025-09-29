import React from 'react';
import {render, Text, Box, composeTextFragments} from '../src/index.js';
import type {TextFragment} from '../src/index.js';

// 实际的翻译文件结构 - 完整句子，便于翻译人员理解
const translations = {
	en: {
		welcome: "Welcome to {{appName}}!",
		status: "Status: {{status}} ({{count}} items processed)",
		error: "Error: {{message}} - Please contact {{support}}",
		success: "✓ Operation completed successfully in {{duration}}ms",
		info: "For more information, visit {{url}} or email {{email}}"
	},
	zh: {
		welcome: "欢迎使用{{appName}}！",
		status: "状态：{{status}}（已处理{{count}}项）",
		error: "错误：{{message}} - 请联系{{support}}",
		success: "✓ 操作在{{duration}}毫秒内成功完成",
		info: "更多信息请访问{{url}}或发送邮件至{{email}}"
	}
};

// 简单的模板解析器 - 将占位符替换为带样式的文本片段
function parseTemplate(template: string, variables: Record<string, {text: string; style?: any}>): TextFragment[] {
	const fragments: TextFragment[] = [];
	let lastIndex = 0;
	
	// 匹配 {{variable}} 模式
	const regex = /\{\{(\w+)\}\}/g;
	let match;
	
	while ((match = regex.exec(template)) !== null) {
		// 添加变量前的普通文本
		if (match.index > lastIndex) {
			fragments.push(template.slice(lastIndex, match.index));
		}
		
		// 添加变量（带样式）
		const varName = match[1];
		const variable = variables[varName];
		if (variable) {
			fragments.push({
				text: variable.text,
				styles: variable.style ? [variable.style] : undefined
			});
		}
		
		lastIndex = regex.lastIndex;
	}
	
	// 添加剩余的普通文本
	if (lastIndex < template.length) {
		fragments.push(template.slice(lastIndex));
	}
	
	return fragments;
}

function I18nPracticalDemo() {
	const locale: 'en' | 'zh' = 'zh'; // 可以动态切换
	const t = translations[locale];
	
	// 变量数据（通常来自应用状态）
	const variables = {
		appName: {text: "MyApp", style: {bold: true, color: 'cyan'}},
		status: {text: "Running", style: {color: 'green'}},
		count: {text: "42", style: {bold: true}},
		message: {text: "Connection timeout", style: {color: 'red'}},
		support: {text: "support@example.com", style: {underline: true, color: 'blue'}},
		duration: {text: "150", style: {bold: true, color: 'green'}},
		url: {text: "https://example.com", style: {underline: true, color: 'blue'}},
		email: {text: "info@example.com", style: {underline: true, color: 'blue'}}
	};
	
	return (
		<Box flexDirection="column" padding={1}>
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Text bold color="cyan">
					Practical I18n with composeTextFragments()
				</Text>
			</Box>
			
			<Box height={1} />
			
			<Box flexDirection="column" gap={1}>
				{/* 欢迎消息 */}
				<Box>
					<Text>
						{composeTextFragments(parseTemplate(t.welcome, variables))}
					</Text>
				</Box>
				
				{/* 状态信息 */}
				<Box>
					<Text>
						{composeTextFragments(parseTemplate(t.status, variables))}
					</Text>
				</Box>
				
				{/* 错误信息 */}
				<Box>
					<Text>
						{composeTextFragments(parseTemplate(t.error, variables))}
					</Text>
				</Box>
				
				{/* 成功信息 */}
				<Box>
					<Text>
						{composeTextFragments(parseTemplate(t.success, variables))}
					</Text>
				</Box>
				
				{/* 信息提示 */}
				<Box>
					<Text>
						{composeTextFragments(parseTemplate(t.info, variables))}
					</Text>
				</Box>
			</Box>
			
			<Box height={1} />
			
			<Box justifyContent="center">
				<Text dimColor>
					Translation files contain complete sentences - translator-friendly!
				</Text>
			</Box>
		</Box>
	);
}

render(<I18nPracticalDemo />);