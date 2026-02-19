import React from 'react';
import {Box} from 'ink';
import IndexPage from '../pages/IndexPage.jsx';
import HelpPage from '../pages/HelpPage.jsx';
import PluginPage from '../pages/PluginPage.jsx';
import ProxyPage from '../pages/ProxyPage.jsx';
import ServerPage from '../pages/ServerPage.jsx';
import SettingPage from '../pages/SettingPage.jsx';
import {theme} from '../style/theme.js';

export default function Content({path, isFocused = false}) {
	const renderByPath = () => {
		if (!path) return <IndexPage isFocused={isFocused} />;
		if (path.startsWith('/home')) return <IndexPage isFocused={isFocused} />;
		if (path.startsWith('/help')) return <HelpPage />;
		if (path.startsWith('/plugin')) return <PluginPage />;
		if (path.startsWith('/proxy')) return <ProxyPage />;
		if (path.startsWith('/server')) return <ServerPage />;
		if (path.startsWith('/settings')) return <SettingPage />;
		if (path.startsWith('/search')) return <IndexPage isFocused={isFocused} />;
		return <IndexPage isFocused={isFocused} />;
	};

	return (
		<Box
			paddingLeft={theme.spacing.padding}
			flexDirection="column"
			flexGrow={1}
			borderStyle={isFocused ? 'round' : undefined}
			borderColor={theme.colors.accent}
		>
			{renderByPath()}
		</Box>
	);
}
