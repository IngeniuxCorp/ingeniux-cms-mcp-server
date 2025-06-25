export interface SubmissionResult {
	success: boolean;
	prUrl?: string;
	prNumber?: number;
	errors: string[];
	warnings: string[];
	phase?: string;
}

export interface RepositoryInfo {
	owner: string;
	name: string;
	url: string;
}

export interface SubmissionConfig {
	githubToken: string;
	cursorDirectoryRepo?: RepositoryInfo;
	dryRun?: boolean;
}

import { GitHubApiClient } from './github-api-client.js';
import { CursorDirectoryEntry } from '../generators/directory-entry-generator.js';
import { SubmissionPrGenerator, PrGenerationOptions } from '../generators/submission-pr-generator.js';

export class CursorDirectorySubmitter {
	private readonly githubClient: GitHubApiClient;
	private readonly prGenerator: SubmissionPrGenerator;
	private readonly cursorDirectoryRepo: RepositoryInfo;
	private readonly dryRun: boolean;

	constructor(config: SubmissionConfig) {
		this.githubClient = new GitHubApiClient({
			token: config.githubToken
		});
		
		this.prGenerator = new SubmissionPrGenerator();
		
		this.cursorDirectoryRepo = config.cursorDirectoryRepo || {
			owner: 'cursor-ai',
			name: 'cursor-directory',
			url: 'https://github.com/cursor-ai/cursor-directory'
		};
		
		this.dryRun = config.dryRun || false;
	}

	/**
	 * Submits MCP server to Cursor Directory
	 */
	public async submitServer(
		entry: CursorDirectoryEntry,
		options: PrGenerationOptions = {}
	): Promise<SubmissionResult> {
		const result: SubmissionResult = {
			success: false,
			errors: [],
			warnings: []
		};

		try {
			// Phase 1: Validate token and access
			result.phase = 'Token Validation';
			await this.validateGitHubAccess(result);
			if (!this.shouldContinue(result)) return result;

			// Phase 2: Fork repository
			result.phase = 'Repository Fork';
			const forkInfo = await this.forkRepository(result);
			if (!this.shouldContinue(result)) return result;

			// Phase 3: Generate PR content
			result.phase = 'PR Generation';
			const prData = this.generatePullRequest(entry, options, result);
			if (!this.shouldContinue(result)) return result;

			// Phase 4: Create branch
			result.phase = 'Branch Creation';
			await this.createSubmissionBranch(forkInfo!, prData.headBranch, result);
			if (!this.shouldContinue(result)) return result;

			// Phase 5: Add files
			result.phase = 'File Creation';
			await this.addServerFiles(forkInfo!, prData, result);
			if (!this.shouldContinue(result)) return result;

			// Phase 6: Create pull request
			result.phase = 'Pull Request';
			if (!this.dryRun) {
				await this.createPullRequest(forkInfo!, prData, result);
			} else {
				result.warnings.push('Dry run mode: PR not actually created');
				result.success = true;
			}

			return result;

		} catch (error) {
			result.errors.push(`Submission failed in ${result.phase}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return result;
		}
	}

	/**
	 * Validates GitHub access and permissions
	 */
	private async validateGitHubAccess(result: SubmissionResult): Promise<void> {
		try {
			// Check token validity
			const isValid = await this.githubClient.validateToken();
			if (!isValid) {
				result.errors.push('Invalid GitHub token or insufficient permissions');
				return;
			}

			// Check rate limits
			try {
				const rateLimit = await this.githubClient.getRateLimit();
				if (rateLimit && typeof rateLimit === 'object' && 'core' in rateLimit) {
					const core = rateLimit.core as any;
					if (core.remaining < 10) {
						result.warnings.push('GitHub API rate limit is low, submission may fail');
					}
				}
			} catch {
				result.warnings.push('Could not check GitHub rate limits');
			}

			// Check repository access
			try {
				await this.githubClient.getRepository(
					this.cursorDirectoryRepo.owner, 
					this.cursorDirectoryRepo.name
				);
			} catch (error) {
				result.errors.push(`Cannot access cursor-directory repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}

		} catch (error) {
			result.errors.push(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Forks the cursor-directory repository
	 */
	private async forkRepository(result: SubmissionResult): Promise<{ owner: string; name: string } | null> {
		try {
			const forkResult = await this.githubClient.forkRepository(
				this.cursorDirectoryRepo.owner,
				this.cursorDirectoryRepo.name
			);

			if (!forkResult.success) {
				result.errors.push(`Failed to fork repository: ${forkResult.error}`);
				return null;
			}

			if (!forkResult.forkName) {
				result.errors.push('Fork was created but fork name not returned');
				return null;
			}

			const [owner, name] = forkResult.forkName.split('/');
			return { owner, name };

		} catch (error) {
			result.errors.push(`Fork operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	/**
	 * Generates pull request data
	 */
	private generatePullRequest(
		entry: CursorDirectoryEntry,
		options: PrGenerationOptions,
		result: SubmissionResult
	): any {
		try {
			const prData = this.prGenerator.generateSubmissionPr(entry, {
				includeValidationDetails: true,
				includeTesting: true,
				...options
			});

			// Validate PR data
			const validation = this.prGenerator.validatePrData(prData);
			if (!validation.isValid) {
				result.errors.push(...validation.errors);
				return null;
			}

			return prData;

		} catch (error) {
			result.errors.push(`PR generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	/**
	 * Creates submission branch on forked repository
	 */
	private async createSubmissionBranch(
		forkInfo: { owner: string; name: string },
		branchName: string,
		result: SubmissionResult
	): Promise<void> {
		try {
			const branchResult = await this.githubClient.createBranch(
				forkInfo.owner,
				forkInfo.name,
				branchName,
				'main'
			);

			if (!branchResult.success) {
				result.errors.push(`Failed to create branch: ${branchResult.error}`);
			}

		} catch (error) {
			result.errors.push(`Branch creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Adds server files to the repository
	 */
	private async addServerFiles(
		forkInfo: { owner: string; name: string },
		prData: any,
		result: SubmissionResult
	): Promise<void> {
		try {
			const filesResult = await this.githubClient.createFiles(
				forkInfo.owner,
				forkInfo.name,
				prData.files.map((file: any) => ({
					path: file.path,
					content: file.content
				})),
				prData.headBranch,
				'Add'
			);

			if (!filesResult.success) {
				const failedFiles = filesResult.results
					.filter(r => !r.success)
					.map(r => r.error)
					.join(', ');
				result.errors.push(`Failed to create files: ${failedFiles}`);
			}

		} catch (error) {
			result.errors.push(`File creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Creates the pull request
	 */
	private async createPullRequest(
		forkInfo: { owner: string; name: string },
		prData: any,
		result: SubmissionResult
	): Promise<void> {
		try {
			const prResult = await this.githubClient.createPullRequest(
				this.cursorDirectoryRepo.owner,
				this.cursorDirectoryRepo.name,
				{
					title: prData.title,
					body: prData.body,
					headBranch: prData.headBranch,
					baseBranch: prData.baseBranch
				},
				forkInfo.owner
			);

			if (prResult.success) {
				result.success = true;
				result.prUrl = prResult.prUrl;
				result.prNumber = prResult.prNumber;
			} else {
				result.errors.push(`Failed to create pull request: ${prResult.error}`);
			}

		} catch (error) {
			result.errors.push(`Pull request creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Determines if submission should continue based on current state
	 */
	private shouldContinue(result: SubmissionResult): boolean {
		return result.errors.length === 0;
	}

	/**
	 * Validates submission before attempting
	 */
	public async validateSubmission(entry: CursorDirectoryEntry): Promise<{
		isValid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			// Validate entry
			const entryValidation = this.validateEntry(entry);
			errors.push(...entryValidation.errors);
			warnings.push(...entryValidation.warnings);

			// Validate GitHub access
			const tokenValid = await this.githubClient.validateToken();
			if (!tokenValid) {
				errors.push('GitHub token is invalid or has insufficient permissions');
			}

			// Check for existing entries (basic check)
			await this.checkForDuplicateEntry(entry, warnings);

		} catch (error) {
			errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	}

	/**
	 * Validates directory entry structure
	 */
	private validateEntry(entry: CursorDirectoryEntry): {
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Required fields
		if (!entry.name || entry.name.trim().length === 0) {
			errors.push('Entry name is required');
		}

		if (!entry.description || entry.description.length < 20) {
			errors.push('Entry description must be at least 20 characters');
		}

		if (!entry.repository || !entry.repository.includes('github.com')) {
			errors.push('Valid GitHub repository URL is required');
		}

		if (!entry.license) {
			errors.push('License is required');
		}

		if (entry.tools.length === 0) {
			warnings.push('No tools registered for this server');
		}

		if (entry.configuration.required.length === 0) {
			warnings.push('No required configuration specified');
		}

		// Validate slug format
		if (entry.slug && !/^[a-z0-9-]+$/.test(entry.slug)) {
			errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
		}

		// Validate tags
		if (entry.tags.length === 0) {
			warnings.push('No tags specified for discoverability');
		}

		return { errors, warnings };
	}

	/**
	 * Checks for potential duplicate entries
	 */
	private async checkForDuplicateEntry(
		entry: CursorDirectoryEntry,
		warnings: string[]
	): Promise<void> {
		try {
			// This would need to be implemented based on the actual cursor-directory structure
			// For now, just add a warning to manually check
			warnings.push('Please verify manually that this server is not already in the directory');

		} catch {
			// Ignore errors in duplicate checking
		}
	}

	/**
	 * Gets submission status
	 */
	public getSubmissionStatus(): {
		dryRun: boolean;
		repository: RepositoryInfo;
		hasValidToken: Promise<boolean>;
	} {
		return {
			dryRun: this.dryRun,
			repository: this.cursorDirectoryRepo,
			hasValidToken: this.githubClient.validateToken()
		};
	}
}