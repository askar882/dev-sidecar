import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../style/theme.js';

export default function Footer({version = 'dev'}) {
	return (
		<Box marginTop={1} flexDirection="column">
			<Text color={theme.colors.muted}>
				©2020-2026 docmirror.cn — {version}
			</Text>
			<Text color={theme.colors.muted}>by Greper, WangLiang, CuteOmega</Text>
		</Box>
	);
}
