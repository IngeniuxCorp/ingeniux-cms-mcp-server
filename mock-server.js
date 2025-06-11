// Simple mock server for local OAuth and CMS endpoints (Node.js/Express)
const express = require('express');
const app = express();
app.use(express.json());

// Mock CMS endpoint
app.get('/mock-cms/*', (req, res) => {
	res.json({ message: 'Mock CMS response', path: req.path, query: req.query });
});

// Mock OAuth endpoints
app.get('/mock-oauth/authorize', (req, res) => {
	res.redirect(`${req.query.redirect_uri}?code=mock_code&state=${req.query.state}`);
});
app.post('/mock-oauth/token', (req, res) => {
	res.json({
		access_token: 'mock_access_token',
		token_type: 'Bearer',
		expires_in: 3600,
		refresh_token: 'mock_refresh_token'
	});
});

app.listen(4000, () => {
	console.log('Mock server running on http://localhost:4000');
});