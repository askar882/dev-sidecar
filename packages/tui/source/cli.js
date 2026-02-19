#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.jsx';

const cli = meow(
	`
		Usage
		  $ tui

		Description
		  DevSidecar CLI Dashboard

		Controls
		  Use arrow keys to navigate.
		  Use Enter to select.
		  Use Tab to switch focus between Sidebar, Search and Content.
	`,
	{
		importMeta: import.meta,
	},
);

render(<App />);
