import React from 'react';
import {Box, Text} from 'ink';
import SelectInput from 'ink-select-input';
import {theme} from '../style/theme.js';

export default function Sidebar({items = [], onSelect, isFocused = true}) {
	const handleSelect = item => {
		onSelect && onSelect(item.value);
	};

	return (
		<Box
			flexDirection="column"
			width={theme.spacing.sidebarWidth}
			paddingRight={theme.spacing.padding}
			borderStyle={isFocused ? 'round' : undefined}
			borderColor={theme.colors.accent}
		>
			<Box marginBottom={1}>
				<Text color={theme.colors.logo} bold>
					DOCMIRROR
				</Text>
			</Box>
			<SelectInput
				items={items}
				onSelect={handleSelect}
				isFocused={isFocused}
			/>
		</Box>
	);
}
