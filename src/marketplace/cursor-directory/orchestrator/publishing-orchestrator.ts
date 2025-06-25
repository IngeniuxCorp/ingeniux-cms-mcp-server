export interface PublishingResult {
	success: boolean;
	phase: string;
	errors: string[];
	warnings: string[];
	prUrl?: string;
	prNumber?: number;
	directoryEntry?: any;
	submissionId?: string;
}

export interface ValidationSummary {
	overallValid: boolean;
	repositoryValidation: any;
	mcpValidation: any;
	documentationValidation: any;
}

export interface PublishingConfig {
	githubToken: string;
	projectPath: string;
	dryRun?: boolean;
	skipValidation?: boolean;
	customOptions?: any;
}

import { RepositoryValidator } from '../validators/repository-validator.js';
import { McpComplianceValidator } from '../validators/mcp-compliance-validator.js';
import { DocumentationValidator } from '../validators/documentation-validator.js';
import { DirectoryEntryGenerator } from '../generators/directory-entry-generator.js';
import { CursorDirectorySubmitter } from '../submitters/cursor-directory-submitter.js';
import { SubmissionStatusTracker } from '../submitters/submission-status-tracker.js';
import * as fs from 'fs';
import * as path from 'path';

export class PublishingOrchestrator {
	private readonly repositoryValidator: RepositoryValidator;
	private readonly mcpValidator: McpComplianceValidator;
	private readonly documentationValidator: DocumentationValidator;
	private readonly entryGenerator: DirectoryEntryGenerator;
	private readonly submitter: CursorDirectorySubmitter;
	private readonly statusTracker: SubmissionStatusTracker;

	constructor(githubToken: string, statusFilePath?: string) {
		this.repositoryValidator = new RepositoryValidator();
		this.mcpValidator = new McpComplianceValidator();
		this.documentationValidator = new DocumentationValidator();
		this.entryGenerator = new DirectoryEntryGenerator();
		this.submitter = new CursorDirectorySubmitter({
			githubToken,
			dryRun: false
		});
		this.statusTracker = new SubmissionStatusTracker(statusFilePath);
	}

	/**
	 * Main method to publish MCP server to Cursor Directory
	 */
	public async publishToCursorDirectory(config: PublishingConfig): Promise<PublishingResult> {
		const result: PublishingResult = {
			success: false,
			phase: 'Initialization',
			errors: [],
			warnings: []
		};

		let submissionId: string | null = null;

		try {
			// Initialize tracking
			const packageJson = this.readPackageJson(config.projectPath);
			if (!packageJson) {
				result.errors.push('Cannot read package.json');
				result.phase = 'Package Reading';
				return result;
			}

			submissionId = this.statusTracker.createSubmission(
				packageJson.name || 'unknown',
				this.entryGenerator.generateSlug(packageJson.name || 'unknown')
			);
			result.submissionId = submissionId;

			// Phase 1: Repository Validation
			if (!config.skipValidation) {
				result.phase = 'Repository Validation';
				this.statusTracker.updateSubmission(submissionId, { phase: result.phase });
				
				const repoValidation = this.repositoryValidator.validateRepository(config.projectPath);
				if (!repoValidation.isValid) {
					result.errors.push(...repoValidation.errors);
					this.statusTracker.markFailed(submissionId, result.errors, result.phase);
					return result;
				}
				result.warnings.push(...repoValidation.warnings);
			}

			// Phase 2: MCP Compliance Check
			if (!config.skipValidation) {
				result.phase = 'MCP Compliance';
				this.statusTracker.updateSubmission(submissionId, { phase: result.phase });
				
				const entryPoint = path.join(config.projectPath, 'dist/index.js');
				const mcpValidation = await this.mcpValidator.validateMcpCompliance(entryPoint);
				if (!mcpValidation.isCompliant) {
					result.errors.push(...mcpValidation.errors);
					this.statusTracker.markFailed(submissionId, result.errors, result.phase);
					return result;
				}
				result.warnings.push(...mcpValidation.warnings);
			}

			// Phase 3: Documentation Validation
			if (!config.skipValidation) {
				result.phase = 'Documentation Validation';
				this.statusTracker.updateSubmission(submissionId, { phase: result.phase });
				
				const docValidation = this.documentationValidator.validateDocumentation(config.projectPath);
				if (!docValidation.isValid) {
					result.errors.push(...docValidation.errors);
					this.statusTracker.markFailed(submissionId, result.errors, result.phase);
					return result;
				}
				result.warnings.push(...docValidation.warnings);
			}

			// Phase 4: Directory Entry Generation
			result.phase = 'Entry Generation';
			this.statusTracker.updateSubmission(submissionId, { phase: result.phase });
			
			const entryPoint = path.join(config.projectPath, 'dist/index.js');
			const mcpInfo = await this.mcpValidator.validateMcpCompliance(entryPoint);
			const directoryEntry = this.entryGenerator.generateEntry(packageJson, mcpInfo);
			
			// Validate generated entry
			const entryValidation = this.entryGenerator.validateEntry(directoryEntry);
			if (!entryValidation.isValid) {
				result.errors.push(...entryValidation.errors);
				this.statusTracker.markFailed(submissionId, result.errors, result.phase);
				return result;
			}

			result.directoryEntry = directoryEntry;

			// Phase 5: Submission
			result.phase = 'Submission';
			this.statusTracker.updateSubmission(submissionId, { phase: result.phase });
			
			const submissionResult = await this.submitter.submitServer(directoryEntry, {
				includeValidationDetails: true,
				includeTesting: true,
				customMessage: config.customOptions?.message,
				projectPath: config.projectPath,
				includePackagedFiles: true
			});

			if (!submissionResult.success) {
				result.errors.push(...submissionResult.errors);
				result.warnings.push(...submissionResult.warnings);
				this.statusTracker.markFailed(submissionId, result.errors, result.phase);
				return result;
			}

			// Success
			result.success = true;
			if (submissionResult.prUrl) {
				result.prUrl = submissionResult.prUrl;
			}
			if (submissionResult.prNumber) {
				result.prNumber = submissionResult.prNumber;
			}
			result.warnings.push(...submissionResult.warnings);
			
			if (submissionResult.prUrl && submissionResult.prNumber) {
				this.statusTracker.markSuccess(submissionId, submissionResult.prUrl, submissionResult.prNumber);
			}

			return result;

		} catch (error) {
			result.errors.push(`Publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			if (submissionId) {
				this.statusTracker.markFailed(submissionId, result.errors, result.phase);
			}
			return result;
		}
	}

	/**
	 * Validates project without submitting
	 */
	public async validateOnly(projectPath: string): Promise<ValidationSummary> {
		const summary: ValidationSummary = {
			overallValid: false,
			repositoryValidation: null,
			mcpValidation: null,
			documentationValidation: null
		};

		try {
			// Repository validation
			const repoValidation = this.repositoryValidator.validateRepository(projectPath);
			summary.repositoryValidation = repoValidation;

			// MCP validation
			let mcpValidation = null;
			if (repoValidation.isValid) {
				const entryPoint = path.join(projectPath, 'dist/index.js');
				mcpValidation = await this.mcpValidator.validateMcpCompliance(entryPoint);
				summary.mcpValidation = mcpValidation;
			}

			// Documentation validation
			const docValidation = this.documentationValidator.validateDocumentation(projectPath);
			summary.documentationValidation = docValidation;

			// Overall validation
			summary.overallValid = repoValidation.isValid && 
				(mcpValidation?.isCompliant ?? false) && 
				docValidation.isValid;

		} catch (error) {
			// Add error to summary
			if (!summary.repositoryValidation) {
				summary.repositoryValidation = { isValid: false, errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] };
			}
		}

		return summary;
	}

	/**
	 * Gets publishing status for a project
	 */
	public getPublishingStatus(projectPath: string): {
		hasValidStructure: boolean;
		lastSubmission: any;
		canSubmit: boolean;
		issues: string[];
	} {
		const issues: string[] = [];
		let hasValidStructure = false;
		let canSubmit = false;
		let lastSubmission: any = null;

		try {
			// Check basic structure
			const packageJson = this.readPackageJson(projectPath);
			if (!packageJson) {
				issues.push('Missing or invalid package.json');
			} else {
				hasValidStructure = true;
			}

			// Check for built files
			const distPath = path.join(projectPath, 'dist/index.js');
			if (!fs.existsSync(distPath)) {
				issues.push('Project not built - missing dist/index.js');
				hasValidStructure = false;
			}

			// Check last submission
			if (packageJson?.name) {
				const slug = this.entryGenerator.generateSlug(packageJson.name);
				lastSubmission = this.statusTracker.getLatestSubmissionForSlug(slug);
			}

			// Determine if can submit
			canSubmit = hasValidStructure && issues.length === 0;

		} catch (error) {
			issues.push(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return {
			hasValidStructure,
			lastSubmission,
			canSubmit,
			issues
		};
	}

	/**
	 * Generates preview of directory entry without submitting
	 */
	public async generatePreview(projectPath: string): Promise<{
		success: boolean;
		preview?: string;
		entry?: any;
		errors: string[];
	}> {
		const errors: string[] = [];

		try {
			const packageJson = this.readPackageJson(projectPath);
			if (!packageJson) {
				errors.push('Cannot read package.json');
				return { success: false, errors };
			}

			const entryPoint = path.join(projectPath, 'dist/index.js');
			const mcpInfo = await this.mcpValidator.validateMcpCompliance(entryPoint);
			
			const directoryEntry = this.entryGenerator.generateEntry(packageJson, mcpInfo);
			const preview = this.entryGenerator.generatePreview(directoryEntry);

			return {
				success: true,
				preview,
				entry: directoryEntry,
				errors
			};

		} catch (error) {
			errors.push(`Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return { success: false, errors };
		}
	}

	/**
	 * Gets submission statistics
	 */
	public getSubmissionStatistics(): any {
		return this.statusTracker.getStatistics();
	}

	/**
	 * Gets recent submissions
	 */
	public getRecentSubmissions(count: number = 10): any[] {
		return this.statusTracker.getRecentSubmissions(count);
	}

	/**
	 * Cancels a submission
	 */
	public cancelSubmission(submissionId: string, reason?: string): boolean {
		return this.statusTracker.markCancelled(submissionId, reason);
	}

	/**
	 * Cleans up old submission records
	 */
	public cleanupOldSubmissions(daysToKeep: number = 30): number {
		return this.statusTracker.cleanupOldSubmissions(daysToKeep);
	}

	/**
	 * Reads and parses package.json
	 */
	private readPackageJson(projectPath: string): any {
		try {
			const packageJsonPath = path.join(projectPath, 'package.json');
			if (!fs.existsSync(packageJsonPath)) {
				return null;
			}

			const content = fs.readFileSync(packageJsonPath, 'utf-8');
			return JSON.parse(content);

		} catch {
			return null;
		}
	}

	/**
	 * Validates GitHub token
	 */
	public async validateGitHubToken(): Promise<boolean> {
		try {
			const status = this.submitter.getSubmissionStatus();
			return await status.hasValidToken;
		} catch {
			return false;
		}
	}

	/**
	 * Exports submission history
	 */
	public exportSubmissionHistory(): any {
		return this.statusTracker.exportHistory();
	}

	/**
	 * Imports submission history
	 */
	public importSubmissionHistory(history: any): void {
		this.statusTracker.importHistory(history);
	}
}