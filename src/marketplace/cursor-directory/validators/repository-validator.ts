export interface FileCheckResult {
	path: string;
	exists: boolean;
	size?: number;
}

export interface RepositoryValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	requiredFiles: FileCheckResult[];
}

export interface PackageJsonStructure {
	name?: string;
	version?: string;
	description?: string;
	main?: string;
	type?: string;
	bin?: Record<string, string>;
	files?: string[];
	keywords?: string[];
	repository?: {
		type: string;
		url: string;
	};
	license?: string;
	author?: string;
}

import * as fs from 'fs';
import * as path from 'path';

export class RepositoryValidator {
	private readonly requiredFiles = [
		'package.json',
		'README.md',
		'dist/index.js',
		'LICENSE'
	];

	private readonly requiredPackageFields = [
		'name',
		'version',
		'description',
		'main',
		'bin',
		'repository',
		'license'
	];

	/**
	 * Validates repository structure for Cursor Directory requirements
	 */
	public validateRepository(projectPath: string): RepositoryValidationResult {
		const result: RepositoryValidationResult = {
			isValid: false,
			errors: [],
			warnings: [],
			requiredFiles: []
		};

		try {
			// Validate required files existence
			this.validateRequiredFiles(projectPath, result);

			// Validate package.json structure if it exists
			const packageJsonPath = path.join(projectPath, 'package.json');
			if (fs.existsSync(packageJsonPath)) {
				const packageJson = this.readPackageJson(packageJsonPath);
				if (packageJson) {
					this.validatePackageJsonStructure(packageJson, result);
				}
			}

			// Validate build artifacts
			this.validateBuildArtifacts(projectPath, result);

			// Set overall validation status
			result.isValid = result.errors.length === 0;

		} catch (error) {
			result.errors.push(`Repository validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return result;
	}

	/**
	 * Validates that all required files exist
	 */
	private validateRequiredFiles(projectPath: string, result: RepositoryValidationResult): void {
		for (const file of this.requiredFiles) {
			const filePath = path.join(projectPath, file);
			const exists = fs.existsSync(filePath);
			
			const fileCheck: FileCheckResult = {
				path: file,
				exists
			};

			if (exists) {
				try {
					const stats = fs.statSync(filePath);
					fileCheck.size = stats.size;
				} catch {
					// Size is optional, continue without it
				}
			} else {
				result.errors.push(`Missing required file: ${file}`);
			}

			result.requiredFiles.push(fileCheck);
		}
	}

	/**
	 * Reads and parses package.json file
	 */
	private readPackageJson(packageJsonPath: string): PackageJsonStructure | null {
		try {
			const content = fs.readFileSync(packageJsonPath, 'utf-8');
			return JSON.parse(content) as PackageJsonStructure;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Validates package.json structure and required fields
	 */
	private validatePackageJsonStructure(packageJson: PackageJsonStructure, result: RepositoryValidationResult): void {
		// Check required fields
		for (const field of this.requiredPackageFields) {
			if (!packageJson.hasOwnProperty(field) || packageJson[field as keyof PackageJsonStructure] === undefined) {
				result.errors.push(`Missing package.json field: ${field}`);
			}
		}

		// Validate MCP-specific requirements
		if (packageJson.keywords && !packageJson.keywords.includes('mcp')) {
			result.warnings.push("Package should include 'mcp' keyword");
		}

		// Validate entry point format
		if (packageJson.main !== 'dist/index.js') {
			result.errors.push("Main entry point must be 'dist/index.js'");
		}

		// Validate module type
		if (packageJson.type !== 'module') {
			result.warnings.push("Package type should be 'module' for MCP servers");
		}

		// Validate binary configuration
		if (packageJson.bin && packageJson.name) {
			const expectedBinPath = './dist/index.js';
			const binEntry = packageJson.bin[packageJson.name];
			if (binEntry !== expectedBinPath) {
				result.errors.push(`Binary entry should point to '${expectedBinPath}'`);
			}
		}

		// Validate repository URL format
		if (packageJson.repository) {
			if (!packageJson.repository.url || !packageJson.repository.url.includes('github.com')) {
				result.errors.push('Repository URL must be a valid GitHub URL');
			}
		}
	}

	/**
	 * Validates build artifacts exist and are valid
	 */
	private validateBuildArtifacts(projectPath: string, result: RepositoryValidationResult): void {
		const distPath = path.join(projectPath, 'dist');
		
		if (!fs.existsSync(distPath)) {
			result.errors.push('Build directory (dist/) does not exist');
			return;
		}

		const indexPath = path.join(distPath, 'index.js');
		if (!fs.existsSync(indexPath)) {
			result.errors.push('Built entry point (dist/index.js) does not exist');
			return;
		}

		// Check if the built file has executable content
		try {
			const content = fs.readFileSync(indexPath, 'utf-8');
			if (content.trim().length === 0) {
				result.errors.push('Built entry point is empty');
			}

			// Check for shebang for CLI execution
			if (!content.startsWith('#!/usr/bin/env node')) {
				result.warnings.push('Built entry point should include shebang for CLI execution');
			}

		} catch (error) {
			result.errors.push(`Cannot read built entry point: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Validates repository URL accessibility (basic format check)
	 */
	public validateRepositoryUrl(repoUrl: string): boolean {
		if (!repoUrl) {
			return false;
		}

		// Basic GitHub URL format validation
		const githubPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?$/;
		return githubPattern.test(repoUrl);
	}
}