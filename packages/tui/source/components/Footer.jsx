import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../style/theme.js';

export default function Footer({version = 'dev'}) {
	return (
		<Box marginTop={1} flexDirection="column">
			<Text color={theme.colors.muted}>
				©2020-2026 docmirror.cn — {version}
			</Text>
			<Text color={theme.colors.muted}>
				by <a href="https://github.com/greper">Greper</a>,{' '}
				<a href="https://github.com/wangliang181230">WangLiang</a>,{' '}
				<a href="https://github.com/cute-omega">CuteOmega</a>
			</Text>
		</Box>
	);
}
