import React from 'react';
import {render, Text, Box} from '../../src/index.js';
import {composeTextFragments} from '../../src/index.js';

function StyleShowcase() {
	// English version
	const englishFragments = [
		{text: 'Red', styles: [{color: 'red'}]},
		' | ',
		{text: 'Green', styles: [{color: 'green'}]},
		' | ',
		{text: 'Blue', styles: [{color: 'blue'}]},
		'\n',
		{text: 'BgRed', styles: [{backgroundColor: 'red'}]},
		' | ',
		{text: 'BgGreen', styles: [{backgroundColor: 'green'}]},
		' | ',
		{text: 'BgBlue', styles: [{backgroundColor: 'blue'}]},
		'\n',
		{text: 'Bold', styles: [{bold: true}]},
		' | ',
		{text: 'Italic', styles: [{italic: true}]},
		' | ',
		{text: 'Underline', styles: [{underline: true}]},
		'\n',
		{text: 'Strike', styles: [{strikethrough: true}]},
		' | ',
		{text: 'Dim', styles: [{dimColor: true}]},
		' | ',
		{text: 'Inverse', styles: [{inverse: true}]},
		'\n',
		{text: 'Bold+Red', styles: [{bold: true, color: 'red'}]},
		' | ',
		{text: 'All Styles', styles: [{
			bold: true,
			italic: true,
			underline: true,
			color: 'magenta',
			backgroundColor: 'white'
		}]},
	];

	// Chinese version
	const chineseFragments = [
		{text: '红色', styles: [{color: 'red'}]},
		' | ',
		{text: '绿色', styles: [{color: 'green'}]},
		' | ',
		{text: '蓝色', styles: [{color: 'blue'}]},
		'\n',
		{text: '红色背景', styles: [{backgroundColor: 'red'}]},
		' | ',
		{text: '绿色背景', styles: [{backgroundColor: 'green'}]},
		' | ',
		{text: '蓝色背景', styles: [{backgroundColor: 'blue'}]},
		'\n',
		{text: '粗体', styles: [{bold: true}]},
		' | ',
		{text: '斜体', styles: [{italic: true}]},
		' | ',
		{text: '下划线', styles: [{underline: true}]},
		'\n',
		{text: '删除线', styles: [{strikethrough: true}]},
		' | ',
		{text: '暗淡', styles: [{dimColor: true}]},
		' | ',
		{text: '反色', styles: [{inverse: true}]},
		'\n',
		{text: '粗体+红色', styles: [{bold: true, color: 'red'}]},
		' | ',
		{text: '所有样式', styles: [{
			bold: true,
			italic: true,
			underline: true,
			color: 'magenta',
			backgroundColor: 'white'
		}]},
	];

	const englishText = composeTextFragments(englishFragments);
	const chineseText = composeTextFragments(chineseFragments);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Text bold color="cyan">
					Text Fragment Composition API - Style Showcase
				</Text>
			</Box>

			<Box height={1} />

			{/* English Section */}
			<Box borderStyle="single" borderColor="green" padding={1}>
				<Box flexDirection="column">
					<Text bold underline color="green">
						English - All InlineTextStyle Properties:
					</Text>
					<Text> </Text>
					<Text>{englishText}</Text>
				</Box>
			</Box>

			<Box height={1} />

			{/* Chinese Section */}
			<Box borderStyle="single" borderColor="yellow" padding={1}>
				<Box flexDirection="column">
					<Text bold underline color="yellow">
						中文 - 所有 InlineTextStyle 属性:
					</Text>
					<Text> </Text>
					<Text>{chineseText}</Text>
				</Box>
			</Box>

			<Box height={1} />

			{/* Footer */}
			<Box justifyContent="center">
				<Text dimColor>
					Generated using composeTextFragments() - Perfect for i18n!
				</Text>
			</Box>
		</Box>
	);
}

render(<StyleShowcase />);