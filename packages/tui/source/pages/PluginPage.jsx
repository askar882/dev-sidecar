import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../style/theme.js';

export default function PluginPage() {
	const plugins = [
		{name: 'free-eye', status: 'Enabled'},
		{name: 'git', status: 'Enabled'},
		{name: 'node', status: 'Enabled'},
		{name: 'overwall', status: 'Enabled'},
		{name: 'pip', status: 'Enabled'},
	];

	return (
		<Box flexDirection="column">
			<Text bold color={theme.colors.primary}>
				Plugin Management
			</Text>
			<Box marginTop={1} flexDirection="column">
				{plugins.map((plugin, index) => (
					<Box key={index} marginLeft={2}>
						<Text color={theme.colors.accent}>✔ {plugin.name}</Text>
						<Text color={theme.colors.muted}> ({plugin.status})</Text>
					</Box>
				))}
			</Box>
		</Box>
	);
}
