import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {theme} from '../style/theme.js';

export default function SearchBar({onSubmit, isFocused = false}) {
	const [value, setValue] = useState('');

	return (
		<Box
			marginBottom={1}
			borderStyle={isFocused ? 'round' : undefined}
			borderColor={theme.colors.accent}
			paddingX={1}
		>
			<Text color={theme.colors.muted}>Search: </Text>
			<TextInput value={value} onChange={setValue} focus={isFocused} />
		</Box>
	);
}
