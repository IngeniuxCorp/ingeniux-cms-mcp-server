#!/usr/bin/env node

/**
 * CLI script for submitting to Cursor Directory
 * Orchestrates validation, entry generation, and submission
 */

import * as fs from 'fs';
import * as path from 'path';
import { PublishingOrchestrator, PublishingConfig, ValidationSummary } from '../src/marketplace/cursor-directory/orchestrator/publishing-orchestrator.js';

interface CliOptions {
    validateOnly: boolean;
    projectPath: string;
    githubToken?: string;
    dryRun: boolean;
    verbose: boolean;
    help: boolean;
}

interface CliResult {
    success: boolean;
    exitCode: number;
}

export class CursorDirectorySubmissionCli {
    private readonly options: CliOptions;
    private readonly orchestrator: PublishingOrchestrator;

    constructor(options: CliOptions) {
        this.options = options;

        const githubToken = this.resolveGitHubToken();
        if (!githubToken && !options.validateOnly) {
            throw new Error('GitHub token is required for submission (not validation-only)');
        }

        this.orchestrator = new PublishingOrchestrator(
            githubToken || 'dummy-token-for-validation',
            this.getStatusFilePath()
        );
    }

    /**
     * Main execution method
     */
    public async execute(): Promise<CliResult> {
        try {
            if (this.options.help) {
                this.printHelp();
                return { success: true, exitCode: 0 };
            }

            this.printHeader();

            if (this.options.validateOnly) {
                return await this.runValidationOnly();
            } else {
                return await this.runFullSubmission();
            }

        } catch (error) {
            this.printError(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { success: false, exitCode: 1 };
        }
    }

    /**
     * Runs validation-only mode
     */
    private async runValidationOnly(): Promise<CliResult> {
        try {
            this.printInfo('Running validation checks...');

            const validationResult = await this.orchestrator.validateOnly(this.options.projectPath);

            this.printValidationResults(validationResult);

            if (validationResult.overallValid) {
                this.printSuccess('✅ All validation checks passed!');
                this.printInfo('Project is ready for submission to Cursor Directory.');
                return { success: true, exitCode: 0 };
            } else {
                this.printError('❌ Validation failed. Please fix the issues above before submitting.');
                return { success: false, exitCode: 1 };
            }

        } catch (error) {
            this.printError(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { success: false, exitCode: 1 };
        }
    }

    /**
     * Runs full submission process
     */
    private async runFullSubmission(): Promise<CliResult> {
        try {
            const githubToken = this.resolveGitHubToken();
            if (!githubToken) {
                this.printError('GitHub token is required for submission');
                return { success: false, exitCode: 1 };
            }

            this.printInfo('Starting submission to Cursor Directory...');

            const config: PublishingConfig = {
                githubToken,
                projectPath: this.options.projectPath,
                dryRun: this.options.dryRun,
                skipValidation: false
            };

            const result = await this.orchestrator.publishToCursorDirectory(config);

            this.printSubmissionResults(result);

            if (result.success) {
                this.printSuccess('✅ Successfully submitted to Cursor Directory!');
                if (result.prUrl) {
                    this.printInfo(`📝 Pull Request: ${result.prUrl}`);
                }
                return { success: true, exitCode: 0 };
            } else {
                this.printError('❌ Submission failed. See errors above.');
                return { success: false, exitCode: 1 };
            }

        } catch (error) {
            this.printError(`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { success: false, exitCode: 1 };
        }
    }

    /**
     * Prints validation results in a structured format
     */
    private printValidationResults(validation: ValidationSummary): void {
        this.printInfo('\n📋 Validation Results:');

        // Repository validation
        if (validation.repositoryValidation) {
            const repo = validation.repositoryValidation;
            this.printValidationSection('Repository Structure', repo.isValid, repo.errors, repo.warnings);
        }

        // MCP compliance validation
        if (validation.mcpValidation) {
            const mcp = validation.mcpValidation;
            this.printValidationSection('MCP Compliance', mcp.isCompliant, mcp.errors, mcp.warnings);

            if (mcp.toolsRegistered?.length > 0) {
                this.printInfo(`   🔧 Tools found: ${mcp.toolsRegistered.map(t => t.name).join(', ')}`);
            }
        }

        // Documentation validation
        if (validation.documentationValidation) {
            const docs = validation.documentationValidation;
            this.printValidationSection('Documentation', docs.isValid, docs.errors, docs.warnings);
        }

        this.printInfo(`\n📊 Overall Status: ${validation.overallValid ? '✅ PASSED' : '❌ FAILED'}`);
    }

    /**
     * Prints validation section results
     */
    private printValidationSection(title: string, isValid: boolean, errors: string[], warnings: string[]): void {
        const status = isValid ? '✅' : '❌';
        this.printInfo(`\n  ${status} ${title}`);

        if (errors?.length > 0) {
            errors.forEach(error => this.printError(`     ❌ ${error}`));
        }

        if (warnings?.length > 0) {
            warnings.forEach(warning => this.printWarning(`     ⚠️  ${warning}`));
        }
    }

    /**
     * Prints submission results
     */
    private printSubmissionResults(result: any): void {
        this.printInfo(`\n📋 Submission Results:`);
        this.printInfo(`   Phase: ${result.phase}`);

        if (result.errors?.length > 0) {
            this.printError('\n   Errors:');
            result.errors.forEach((error: string) => this.printError(`     ❌ ${error}`));
        }

        if (result.warnings?.length > 0) {
            this.printWarning('\n   Warnings:');
            result.warnings.forEach((warning: string) => this.printWarning(`     ⚠️  ${warning}`));
        }

        if (result.submissionId) {
            this.printInfo(`\n   📝 Submission ID: ${result.submissionId}`);
        }
    }

    /**
     * Resolves GitHub token from environment or options
     */
    private resolveGitHubToken(): string | undefined {
        return this.options.githubToken ||
            process.env.GITHUB_TOKEN ||
            process.env.GH_TOKEN;
    }

    /**
     * Gets status file path for tracking submissions
     */
    private getStatusFilePath(): string {
        return path.join(this.options.projectPath, '.cursor-directory-submissions.json');
    }

    /**
     * Prints header information
     */
    private printHeader(): void {
        console.log('🚀 Cursor Directory Submission Tool');
        console.log('===================================');
        console.log(`Project: ${this.options.projectPath}`);
        console.log(`Mode: ${this.options.validateOnly ? 'Validation Only' : 'Full Submission'}`);
        if (this.options.dryRun) {
            console.log('Dry Run: Enabled');
        }
        console.log('');
    }

    /**
     * Prints help information
     */
    private printHelp(): void {
        console.log(`
🚀 Cursor Directory Submission Tool

Usage: node scripts/submit-to-cursor-directory.ts [options]

Options:
  --validate-only    Run validation checks without submitting
  --project-path     Path to project directory (default: current directory)
  --github-token     GitHub token for API access (can use GITHUB_TOKEN env var)
  --dry-run          Simulate submission without creating actual PR
  --verbose          Enable verbose output
  --help             Show this help message

Environment Variables:
  GITHUB_TOKEN       GitHub personal access token
  GH_TOKEN           Alternative GitHub token variable

Examples:
  # Validate project structure and compliance
  node scripts/submit-to-cursor-directory.ts --validate-only

  # Submit to Cursor Directory
  GITHUB_TOKEN=your_token node scripts/submit-to-cursor-directory.ts

  # Dry run submission
  node scripts/submit-to-cursor-directory.ts --dry-run

Requirements:
  - Project must be built (dist/index.js exists)
  - Valid package.json with required fields
  - README.md and LICENSE files
  - GitHub repository URL in package.json
  - For submission: GitHub token with repo permissions

Packaging:
  - Only 'dist' and 'mcp-tools-generated' folders are included in submissions
  - All other files and folders are automatically excluded
		`);
    }

    /**
     * Utility methods for colored console output
     */
    private printSuccess(message: string): void {
        console.log(`\x1b[32m${message}\x1b[0m`);
    }

    private printError(message: string): void {
        console.error(`\x1b[31m${message}\x1b[0m`);
    }

    private printWarning(message: string): void {
        console.log(`\x1b[33m${message}\x1b[0m`);
    }

    private printInfo(message: string): void {
        console.log(message);
    }
}

/**
 * Parses command line arguments
 */
function parseArgs(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {
        validateOnly: false,
        projectPath: process.cwd(),
        dryRun: false,
        verbose: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--validate-only':
                options.validateOnly = true;
                break;
            case '--project-path':
                if (i + 1 < args.length) {
                    options.projectPath = path.resolve(args[i + 1]);
                    i++;
                }
                break;
            case '--github-token':
                if (i + 1 < args.length) {
                    options.githubToken = args[i + 1];
                    i++;
                }
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            default:
                if (arg.startsWith('--')) {
                    console.error(`Unknown option: ${arg}`);
                    process.exit(1);
                }
        }
    }

    return options;
}

/**
 * Validates CLI options and environment
 */
function validateOptions(options: CliOptions): void {
    if (!fs.existsSync(options.projectPath)) {
        throw new Error(`Project path does not exist: ${options.projectPath}`);
    }

    const packageJsonPath = path.join(options.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found in project path: ${options.projectPath}`);
    }

    if (!options.validateOnly && !options.githubToken && !process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
        throw new Error('GitHub token is required for submission. Set GITHUB_TOKEN environment variable or use --github-token option');
    }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        const options = parseArgs();

        if (!options.help) {
            validateOptions(options);
        }

        const cli = new CursorDirectorySubmissionCli(options);
        const result = await cli.execute();

        process.exit(result.exitCode);

    } catch (error) {
        console.error(`\x1b[31mFatal error: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});