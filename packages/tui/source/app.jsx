import React, {useState} from 'react';
import {Box, useInput} from 'ink';
import SearchBar from './components/SearchBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Content from './components/Content.jsx';
import Footer from './components/Footer.jsx';
import {menus} from './components/menuData.js';

export default function App() {
	const [path, setPath] = useState('/home');
	const [focusId, setFocusId] = useState('sidebar'); // 'sidebar' | 'search' | 'content'

	useInput((input, key) => {
		if (input === '\t') {
			// Tab to switch focus
			setFocusId(prev => {
				if (prev === 'sidebar') return 'search';
				if (prev === 'search') return 'content'; // Or stick to sidebar <-> search
				return 'sidebar';
			});
		}
	});

	const items = menus;

	return (
		<Box flexDirection="column" padding={1}>
			<SearchBar
				isFocused={focusId === 'search'}
				onSubmit={q => {
					setPath(`/search?q=${encodeURIComponent(q)}`);
					setFocusId('sidebar'); // return focus to sidebar
				}}
			/>

			<Box marginTop={1}>
				<Sidebar
					items={items}
					isFocused={focusId === 'sidebar'}
					onSelect={p => setPath(p)}
				/>
				<Box marginLeft={2} flexGrow={1}>
					<Content path={path} isFocused={focusId === 'content'} />
				</Box>

				<Footer version={process.env.npm_package_version || 'dev'} />
			</Box>
		</Box>
	);
}
