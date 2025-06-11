#!/usr/bin/env node

/**
 * Test script to verify MCP server connection
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPConnection() {
	console.log('Testing MCP server connection...');
	
	// Check if required environment variables are set
	const requiredEnvVars = [
		'CMS_BASE_URL',
		'OAUTH_CLIENT_ID',
		'OAUTH_CLIENT_SECRET',
		'OAUTH_REDIRECT_URI'
	];
	
	const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
	
	if (missingVars.length > 0) {
		console.error('❌ Missing required environment variables:');
		missingVars.forEach(varName => {
			console.error(`   - ${varName}`);
		});
		console.error('\nPlease set these variables in your .env file or environment.');
		process.exit(1);
	}
	
	console.log('✅ All required environment variables are set');
	
	// Test server startup
	const serverPath = join(__dirname, 'dist', 'index.js');
	console.log(`Starting server: node ${serverPath}`);
	
	const server = spawn('node', [serverPath], {
		stdio: ['pipe', 'pipe', 'pipe'],
		env: process.env
	});
	
	let output = '';
	let errorOutput = '';
	
	server.stdout.on('data', (data) => {
		output += data.toString();
		console.log('STDOUT:', data.toString().trim());
	});
	
	server.stderr.on('data', (data) => {
		errorOutput += data.toString();
		console.error('STDERR:', data.toString().trim());
	});
	
	// Send a simple MCP request to test communication
	setTimeout(() => {
		const testRequest = {
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/list'
		};
		
		console.log('Sending test request:', JSON.stringify(testRequest));
		server.stdin.write(JSON.stringify(testRequest) + '\n');
	}, 2000);
	
	// Timeout after 10 seconds
	setTimeout(() => {
		console.log('⏰ Test timeout - stopping server');
		server.kill('SIGTERM');
	}, 10000);
	
	server.on('close', (code) => {
		console.log(`\n📊 Server process exited with code: ${code}`);
		
		if (output.includes('MCP server started successfully')) {
			console.log('✅ Server started successfully');
		} else {
			console.log('❌ Server failed to start properly');
		}
		
		if (errorOutput) {
			console.log('\n🔍 Error output:');
			console.log(errorOutput);
		}
		
		process.exit(code || 0);
	});
	
	server.on('error', (error) => {
		console.error('❌ Failed to start server:', error.message);
		process.exit(1);
	});
}

testMCPConnection().catch(console.error);