export interface PackagingConfig {
	sourcePath: string;
	includedFolders: string[];
	excludePatterns?: string[];
}

export interface PackagedFile {
	relativePath: string;
	content: string;
	size: number;
}

export interface PackagingResult {
	success: boolean;
	files: PackagedFile[];
	totalSize: number;
	errors: string[];
	warnings: string[];
}

import * as fs from 'fs';
import * as path from 'path';

export class ProjectPackager {
	private readonly maxFileSize = 1024 * 1024; // 1MB max per file
	private readonly maxTotalSize = 10 * 1024 * 1024; // 10MB max total

	/**
	 * Packages project files for Cursor Directory submission
	 * Only includes specified folders (dist, mcp-tools-generated)
	 */
	public packageProject(config: PackagingConfig): PackagingResult {
		const result: PackagingResult = {
			success: false,
			files: [],
			totalSize: 0,
			errors: [],
			warnings: []
		};

		try {
			if (!fs.existsSync(config.sourcePath)) {
				result.errors.push(`Source path does not exist: ${config.sourcePath}`);
				return result;
			}

			// Process each included folder
			for (const folder of config.includedFolders) {
				const folderPath = path.join(config.sourcePath, folder);
				
				if (!fs.existsSync(folderPath)) {
					result.warnings.push(`Included folder not found: ${folder}`);
					continue;
				}

				const folderFiles = this.packageFolder(folderPath, folder, config);
				result.files.push(...folderFiles.files);
				result.errors.push(...folderFiles.errors);
				result.warnings.push(...folderFiles.warnings);
			}

			// Calculate total size
			result.totalSize = result.files.reduce((sum, file) => sum + file.size, 0);

			// Validate size limits
			if (result.totalSize > this.maxTotalSize) {
				result.errors.push(`Package size ${result.totalSize} exceeds limit ${this.maxTotalSize}`);
			}

			// Success if no errors
			result.success = result.errors.length === 0;

		} catch (error) {
			result.errors.push(`Packaging failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return result;
	}

	/**
	 * Packages files from a specific folder
	 */
	private packageFolder(
		folderPath: string, 
		relativeFolderName: string,
		config: PackagingConfig
	): PackagingResult {
		const result: PackagingResult = {
			success: false,
			files: [],
			totalSize: 0,
			errors: [],
			warnings: []
		};

		try {
			const items = fs.readdirSync(folderPath, { withFileTypes: true });

			for (const item of items) {
				const itemPath = path.join(folderPath, item.name);
				const relativeItemPath = path.join(relativeFolderName, item.name);

				if (item.isDirectory()) {
					// Recursively package subdirectories
					const subResult = this.packageFolder(itemPath, relativeItemPath, config);
					result.files.push(...subResult.files);
					result.errors.push(...subResult.errors);
					result.warnings.push(...subResult.warnings);
				} else if (item.isFile()) {
					// Package individual file
					const fileResult = this.packageFile(itemPath, relativeItemPath, config);
					if (fileResult) {
						result.files.push(fileResult);
					}
				}
			}

			result.success = result.errors.length === 0;

		} catch (error) {
			result.errors.push(`Failed to package folder ${relativeFolderName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return result;
	}

	/**
	 * Packages a single file
	 */
	private packageFile(
		filePath: string, 
		relativePath: string,
		config: PackagingConfig
	): PackagedFile | null {
		try {
			// Check exclude patterns
			if (this.shouldExcludeFile(relativePath, config.excludePatterns || [])) {
				return null;
			}

			const stats = fs.statSync(filePath);
			
			// Check file size
			if (stats.size > this.maxFileSize) {
				throw new Error(`File ${relativePath} exceeds size limit`);
			}

			// Read file content
			const content = fs.readFileSync(filePath, 'utf-8');

			return {
				relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
				content,
				size: stats.size
			};

		} catch (error) {
			throw new Error(`Failed to package file ${relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Checks if file should be excluded based on patterns
	 */
	private shouldExcludeFile(relativePath: string, excludePatterns: string[]): boolean {
		for (const pattern of excludePatterns) {
			if (this.matchesPattern(relativePath, pattern)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Simple pattern matching (supports * wildcards)
	 */
	private matchesPattern(filePath: string, pattern: string): boolean {
		// Convert glob-like pattern to regex
		const regexPattern = pattern
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*')
			.replace(/\?/g, '.');
		
		const regex = new RegExp(`^${regexPattern}$`, 'i');
		return regex.test(filePath);
	}

	/**
	 * Validates packaging configuration
	 */
	public validateConfig(config: PackagingConfig): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!config.sourcePath || config.sourcePath.trim().length === 0) {
			errors.push('Source path is required');
		}

		if (!config.includedFolders || config.includedFolders.length === 0) {
			errors.push('At least one included folder must be specified');
		}

		// Validate included folders
		for (const folder of config.includedFolders || []) {
			if (!folder || folder.trim().length === 0) {
				errors.push('Included folder names cannot be empty');
			}
			
			if (folder.includes('..') || folder.startsWith('/') || folder.includes('\\')) {
				errors.push(`Invalid folder name: ${folder}`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Gets default packaging configuration for Cursor Directory
	 */
	public static getDefaultConfig(projectPath: string): PackagingConfig {
		return {
			sourcePath: projectPath,
			includedFolders: ['dist', 'mcp-tools-generated'],
			excludePatterns: [
				'*.log',
				'*.tmp',
				'node_modules',
				'.git',
				'.env*',
				'*.map',
				'*.cache'
			]
		};
	}
}