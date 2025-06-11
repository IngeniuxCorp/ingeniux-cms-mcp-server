/**
 * Jest test setup and global configuration
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.CMS_BASE_URL = 'https://test-cms.example.com';
process.env.OAUTH_CLIENT_ID = 'test-client-id';
process.env.OAUTH_CLIENT_SECRET = 'test-client-secret';
process.env.OAUTH_REDIRECT_URI = 'http://localhost:3000/callback';
process.env.API_TIMEOUT = '5000';
process.env.MAX_RETRIES = '2';
process.env.LOG_LEVEL = 'error';
process.env.CACHE_TTL = '300';
process.env.RATE_LIMIT_RPM = '100';

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
	...originalConsole,
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
};

// Cleanup after each test
afterEach(() => {
	jest.clearAllMocks();
});