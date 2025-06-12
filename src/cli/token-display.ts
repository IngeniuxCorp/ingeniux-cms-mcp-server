/**
 * Token Display and Formatting
 */

import { TokenData } from '../types/api-types.js';

type DisplayFormat = 'json' | 'table' | 'minimal';

export class TokenDisplay {
	public display(tokens: TokenData, format: DisplayFormat = 'table'): void {
		console.log(); // Empty line for spacing
		
		switch (format) {
			case 'json':
				this.displayAsJSON(tokens);
				break;
			case 'table':
				this.displayAsTable(tokens);
				break;
			case 'minimal':
				this.displayAsMinimal(tokens);
				break;
			default:
				this.displayAsTable(tokens);
		}
		
		console.log(); // Empty line for spacing
		this.displayUsageInstructions(tokens);
	}

	private displayAsJSON(tokens: TokenData): void {
		console.log('🔑 Authentication Tokens (JSON Format):');
		console.log('─'.repeat(50));
		
		const output = {
			access_token: tokens.accessToken,
			refresh_token: tokens.refreshToken,
			token_type: tokens.tokenType || 'Bearer',
			expires_at: tokens.expiresAt.toISOString(),
			expires_in: this.calculateExpiresIn(tokens.expiresAt),
			scope: tokens.scope || 'read write'
		};
		
		console.log(JSON.stringify(output, null, 2));
	}

	private displayAsTable(tokens: TokenData): void {
		console.log('🔑 Authentication Tokens:');
		console.log('─'.repeat(70));
		
		const tableData = [
			['Access Token', this.truncateToken(tokens.accessToken)],
			['Refresh Token', this.truncateToken(tokens.refreshToken)],
			['Token Type', tokens.tokenType || 'Bearer'],
			['Expires At', tokens.expiresAt.toISOString()],
			['Expires In', this.calculateExpiresIn(tokens.expiresAt) + ' seconds'],
			['Scope', tokens.scope || 'read write']
		];
		
		for (const [label, value] of tableData) {
			console.log(`${label.padEnd(15)} │ ${value}`);
		}
	}

	private displayAsMinimal(tokens: TokenData): void {
		console.log('# Environment Variables:');
		console.log(`ACCESS_TOKEN=${tokens.accessToken}`);
		console.log(`REFRESH_TOKEN=${tokens.refreshToken}`);
		console.log(`TOKEN_TYPE=${tokens.tokenType || 'Bearer'}`);
		console.log(`EXPIRES_AT=${tokens.expiresAt.toISOString()}`);
		console.log(`EXPIRES_IN=${this.calculateExpiresIn(tokens.expiresAt)}`);
		console.log(`SCOPE=${tokens.scope || 'read write'}`);
	}

	private displayUsageInstructions(tokens: TokenData): void {
		console.log('📋 Usage Instructions:');
		console.log('─'.repeat(50));
		console.log('• Use the access token for API requests');
		console.log('• Include as Authorization: Bearer <access_token>');
		console.log('• Token expires at: ' + tokens.expiresAt.toLocaleString());
		
		const expiresIn = this.calculateExpiresIn(tokens.expiresAt);
		if (expiresIn < 300) { // Less than 5 minutes
			console.log('⚠️ Token expires soon! Consider refreshing.');
		}
	}

	private truncateToken(token: string): string {
		if (!token) return 'N/A';
		if (token.length <= 20) return token;
		return token.substring(0, 10) + '...' + token.substring(token.length - 10);
	}

	private calculateExpiresIn(expiresAt: Date): number {
		return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
	}

	public maskTokenForLogging(token: string): string {
		if (!token || token.length <= 8) return '****';
		return token.substring(0, 4) + '...' + token.substring(token.length - 4);
	}
}