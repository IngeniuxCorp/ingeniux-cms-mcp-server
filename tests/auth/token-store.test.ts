/**
 * Token Store Tests - 20-minute expiry, automatic cleanup, cache validation
 */

import { TokenStore } from '../../src/auth/token-store';
import { TokenData } from '../../src/types/api-types';

// Mock crypto functions
jest.mock('crypto', () => ({
	createHash: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn().mockReturnValue('mock-hash-key')
	}),
	createCipheriv: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnValue('encrypted-part'),
		final: jest.fn().mockReturnValue('final-part')
	}),
	createDecipheriv: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnValue('decrypted-part'),
		final: jest.fn().mockReturnValue('final-part')
	}),
	randomBytes: jest.fn().mockReturnValue({
		toString: jest.fn().mockReturnValue('mock-iv')
	})
}));

describe('TokenStore', () => {
	let tokenStore: TokenStore;
	let mockTokenData: TokenData;

	beforeEach(() => {
		// Reset singleton for each test
		(TokenStore as any).instance = null;
		tokenStore = TokenStore.getInstance();
		
		mockTokenData = {
			accessToken: 'test-access-token',
			refreshToken: 'test-refresh-token',
			expiresAt: new Date(Date.now() + 1200000), // 20 minutes from now
			tokenType: 'Bearer',
			scope: 'read write'
		};

		jest.clearAllMocks();
		jest.clearAllTimers();
		jest.useFakeTimers();
		
		// Mock setTimeout and clearTimeout properly
		jest.spyOn(global, 'setTimeout');
		jest.spyOn(global, 'clearTimeout');
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('getInstance', () => {
		it('should create singleton instance', () => {
			const instance1 = TokenStore.getInstance();
			const instance2 = TokenStore.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('store', () => {
		it('should store token data with 20-minute expiry', () => {
			const startTime = Date.now();
			
			tokenStore.store(mockTokenData);
			
			const storedExpiry = tokenStore.getExpirationTime();
			expect(storedExpiry).toBeDefined();
			
			// Should be exactly 20 minutes (1200 seconds) from now
			const expectedExpiry = startTime + (1200 * 1000);
			const actualExpiry = storedExpiry!.getTime();
			expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000); // Within 1 second
		});

		it('should override original expiry with 20-minute limit', () => {
			const futureExpiry = new Date(Date.now() + 7200000); // 2 hours from now
			const tokenWithLongExpiry = {
				...mockTokenData,
				expiresAt: futureExpiry
			};

			tokenStore.store(tokenWithLongExpiry);
			
			const storedExpiry = tokenStore.getExpirationTime();
			expect(storedExpiry!.getTime()).toBeLessThan(futureExpiry.getTime());
			expect(storedExpiry!.getTime()).toBeLessThan(Date.now() + 1201000); // Max 20 minutes + 1 second
		});

		it('should encrypt access and refresh tokens', () => {
			tokenStore.store(mockTokenData);
			
			// Verify encryption was called
			const crypto = require('crypto');
			expect(crypto.createCipheriv).toHaveBeenCalledTimes(2); // Once for each token
		});

		it('should schedule automatic cleanup after 20 minutes', () => {
			tokenStore.store(mockTokenData);
			
			// Verify setTimeout was called with 20 minutes (1200000ms)
			expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1200000);
		});

		it('should validate token data structure', () => {
			const invalidTokenData = {
				accessToken: '',
				refreshToken: 'valid-refresh',
				expiresAt: new Date(),
				tokenType: 'Bearer'
			};

			expect(() => tokenStore.store(invalidTokenData as TokenData)).toThrow('Invalid access token');
		});

		it('should throw error for missing required fields', () => {
			const incompleteTokenData = {
				accessToken: 'valid-access'
				// Missing other required fields
			};

			expect(() => tokenStore.store(incompleteTokenData as TokenData)).toThrow();
		});
	});

	describe('isValid', () => {
		it('should return true for valid non-expired token', () => {
			tokenStore.store(mockTokenData);
			
			expect(tokenStore.isValid()).toBe(true);
		});

		it('should return false for expired token', () => {
			// Store token first
			tokenStore.store(mockTokenData);
			
			// Fast-forward past expiry
			jest.advanceTimersByTime(1201000); // 20 minutes + 1 second
			
			expect(tokenStore.isValid()).toBe(false);
		});

		it('should return false when no token stored', () => {
			expect(tokenStore.isValid()).toBe(false);
		});

		it('should return false after 20-minute expiry', () => {
			tokenStore.store(mockTokenData);
			
			// Fast-forward 20 minutes + 1 second
			jest.advanceTimersByTime(1201000);
			
			expect(tokenStore.isValid()).toBe(false);
		});
	});

	describe('getAccessToken', () => {
		it('should return access token when valid', () => {
			tokenStore.store(mockTokenData);
			
			const accessToken = tokenStore.getAccessToken();
			expect(accessToken).toBe('decrypted-partfinal-part'); // Mocked decryption result
		});

		it('should return null for expired token', () => {
			// Store token first
			tokenStore.store(mockTokenData);
			
			// Fast-forward past expiry
			jest.advanceTimersByTime(1201000); // 20 minutes + 1 second
			
			expect(tokenStore.getAccessToken()).toBeNull();
		});

		it('should return null when no token stored', () => {
			expect(tokenStore.getAccessToken()).toBeNull();
		});
	});

	describe('getRefreshToken', () => {
		it('should return refresh token even if access token expired', () => {
			// Store token first
			tokenStore.store(mockTokenData);
			
			// Fast-forward past expiry
			jest.advanceTimersByTime(1201000); // 20 minutes + 1 second
			
			const refreshToken = tokenStore.getRefreshToken();
			expect(refreshToken).toBe('decrypted-partfinal-part'); // Mocked decryption result
		});

		it('should return null when no token stored', () => {
			expect(tokenStore.getRefreshToken()).toBeNull();
		});
	});

	describe('expiresWithin', () => {
		it('should return true when token expires within specified minutes', () => {
			tokenStore.store(mockTokenData);
			
			// Token expires in 20 minutes, check if expires within 25 minutes
			expect(tokenStore.expiresWithin(25)).toBe(true);
		});

		it('should return false when token expires after specified minutes', () => {
			tokenStore.store(mockTokenData);
			
			// Token expires in 20 minutes, check if expires within 15 minutes
			expect(tokenStore.expiresWithin(15)).toBe(false);
		});

		it('should return true when no token stored', () => {
			expect(tokenStore.expiresWithin(10)).toBe(true);
		});
	});

	describe('clear', () => {
		it('should clear stored token data', () => {
			tokenStore.store(mockTokenData);
			expect(tokenStore.isValid()).toBe(true);
			
			tokenStore.clear();
			
			expect(tokenStore.isValid()).toBe(false);
			expect(tokenStore.getAccessToken()).toBeNull();
		});

		it('should cancel scheduled cleanup timer', () => {
			tokenStore.store(mockTokenData);
			
			tokenStore.clear();
			
			expect(clearTimeout).toHaveBeenCalled();
		});
	});

	describe('automatic cleanup', () => {
		it('should automatically clear tokens after 20 minutes', () => {
			tokenStore.store(mockTokenData);
			expect(tokenStore.isValid()).toBe(true);
			
			// Fast-forward exactly 20 minutes
			jest.advanceTimersByTime(1200000);
			
			expect(tokenStore.isValid()).toBe(false);
			expect(tokenStore.getAccessToken()).toBeNull();
		});

		it('should reschedule cleanup when new token stored', () => {
			tokenStore.store(mockTokenData);
			
			// Store another token
			tokenStore.store({
				...mockTokenData,
				accessToken: 'new-access-token'
			});
			
			// Should have called setTimeout twice (once for each store)
			expect(setTimeout).toHaveBeenCalledTimes(2);
		});
	});

	describe('updateAccessToken', () => {
		it('should update access token while keeping refresh token', () => {
			tokenStore.store(mockTokenData);
			
			const newExpiry = new Date(Date.now() + 1200000);
			tokenStore.updateAccessToken('new-access-token', newExpiry);
			
			// Should still have the same refresh token
			expect(tokenStore.getRefreshToken()).toBe('decrypted-partfinal-part');
		});

		it('should throw error when no existing token data', () => {
			expect(() => {
				tokenStore.updateAccessToken('new-token', new Date());
			}).toThrow('No existing token data to update');
		});
	});

	describe('encryption/decryption', () => {
		it('should handle encryption failures gracefully', () => {
			const crypto = require('crypto');
			crypto.createCipheriv.mockImplementationOnce(() => {
				throw new Error('Encryption failed');
			});

			// Should not throw, should fallback to storing plain text
			expect(() => tokenStore.store(mockTokenData)).not.toThrow();
		});

		it('should handle decryption failures gracefully', () => {
			const crypto = require('crypto');
			
			// Mock decryption failure before storing
			crypto.createDecipheriv.mockImplementationOnce(() => {
				throw new Error('Decryption failed');
			});
			
			tokenStore.store(mockTokenData);
			
			// Should clear tokens and return null on decryption failure
			const result = tokenStore.retrieve();
			expect(result).toBeNull();
		});
	});

	describe('error handling', () => {
		it('should handle store errors gracefully', () => {
			const invalidData = null as any;
			
			expect(() => tokenStore.store(invalidData)).toThrow('Token data is required');
		});

		it('should handle clear errors gracefully', () => {
			// Should not throw even if internal operations fail
			expect(() => tokenStore.clear()).not.toThrow();
		});

		it('should return false for isValid on any error', () => {
			// Mock internal error
			const originalTokenData = (tokenStore as any).tokenData;
			(tokenStore as any).tokenData = { expiresAt: 'invalid-date' };
			
			expect(tokenStore.isValid()).toBe(false);
			
			// Restore
			(tokenStore as any).tokenData = originalTokenData;
		});
	});
});