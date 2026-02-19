import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../style/theme.js';

export default function ServerPage() {
	const stats = {
		uptime: 'Running',
		requests: 'N/A',
		errors: 0,
		memory: 'N/A',
	};

	return (
		<Box flexDirection="column">
			<Text bold color={theme.colors.primary}>
				Server Status
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>
					Status: <Text color={theme.colors.accent}>{stats.uptime}</Text>
				</Text>
				<Text>
					Requests: <Text color={theme.colors.muted}>{stats.requests}</Text>
				</Text>
				<Text>
					Errors: <Text color={theme.colors.muted}>{stats.errors}</Text>
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text color={theme.colors.muted}>
					(Real-time statistics not available in TUI mode yet)
				</Text>
			</Box>
		</Box>
	);
}
