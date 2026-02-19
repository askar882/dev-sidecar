import React from 'react';
import test from 'ava';
import { render } from 'ink-testing-library';
import App from './source/app.jsx';

test('renders dashboard', t => {
	const { lastFrame } = render(<App />);
	const output = lastFrame();

	t.true(output.includes('DOCMIRROR'));
	t.true(output.includes('Service Control'))
});
