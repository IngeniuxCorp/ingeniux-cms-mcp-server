export interface DocumentationValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	readmeAnalysis: ReadmeAnalysis;
	licenseCheck: LicenseCheck;
}

export interface ReadmeAnalysis {
	exists: boolean;
	hasProjectDescription: boolean;
	hasInstallation: boolean;
	hasConfiguration: boolean;
	hasUsage: boolean;
	hasAuthentication: boolean;
	hasToolsDocumentation: boolean;
	hasTroubleshooting: boolean;
	hasExamples: boolean;
	wordCount: number;
	sections: string[];
}

export interface LicenseCheck {
	exists: boolean;
	type: string | null;
	isValidOssLicense: boolean;
}

import * as fs from 'fs';
import * as path from 'path';

export class DocumentationValidator {
	private readonly requiredReadmeSections = [
		'installation',
		'configuration',
		'usage',
		'authentication'
	];

	private readonly validOssLicenses = [
		'MIT',
		'Apache-2.0',
		'GPL-3.0',
		'BSD-3-Clause',
		'ISC',
		'LGPL-2.1'
	];

	/**
	 * Validates documentation completeness for Cursor Directory requirements
	 */
	public validateDocumentation(projectPath: string): DocumentationValidationResult {
		const result: DocumentationValidationResult = {
			isValid: false,
			errors: [],
			warnings: [],
			readmeAnalysis: this.initializeReadmeAnalysis(),
			licenseCheck: this.initializeLicenseCheck()
		};

		try {
			// Validate README.md
			this.validateReadme(projectPath, result);

			// Validate LICENSE file
			this.validateLicense(projectPath, result);

			// Check for additional documentation
			this.validateAdditionalDocs(projectPath, result);

			// Set overall validation status
			result.isValid = result.errors.length === 0;

		} catch (error) {
			result.errors.push(`Documentation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return result;
	}

	/**
	 * Validates README.md structure and content
	 */
	private validateReadme(projectPath: string, result: DocumentationValidationResult): void {
		const readmePath = path.join(projectPath, 'README.md');
		
		if (!fs.existsSync(readmePath)) {
			result.errors.push('README.md file is missing');
			return;
		}

		result.readmeAnalysis.exists = true;

		try {
			const content = fs.readFileSync(readmePath, 'utf-8');
			this.analyzeReadmeContent(content, result.readmeAnalysis);
			this.validateReadmeRequirements(result.readmeAnalysis, result);

		} catch (error) {
			result.errors.push(`Failed to read README.md: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Analyzes README.md content structure and sections
	 */
	private analyzeReadmeContent(content: string, analysis: ReadmeAnalysis): void {
		const lowercaseContent = content.toLowerCase();
		
		// Count words
		analysis.wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

		// Extract sections (headers)
		const headerRegex = /^#+\s+(.+)$/gm;
		let match;
		while ((match = headerRegex.exec(content)) !== null) {
			analysis.sections.push(match[1].trim());
		}

		// Check for required content patterns
		analysis.hasProjectDescription = this.hasProjectDescription(content);
		analysis.hasInstallation = this.hasInstallationSection(lowercaseContent);
		analysis.hasConfiguration = this.hasConfigurationSection(lowercaseContent);
		analysis.hasUsage = this.hasUsageSection(lowercaseContent);
		analysis.hasAuthentication = this.hasAuthenticationSection(lowercaseContent);
		analysis.hasToolsDocumentation = this.hasToolsDocumentation(lowercaseContent);
		analysis.hasTroubleshooting = this.hasTroubleshootingSection(lowercaseContent);
		analysis.hasExamples = this.hasExamples(content);
	}

	/**
	 * Checks if README has a proper project description
	 */
	private hasProjectDescription(content: string): boolean {
		const lines = content.split('\n').slice(0, 10); // Check first 10 lines
		const descriptionPatterns = [
			/mcp server/i,
			/model context protocol/i,
			/ingeniux cms/i,
			/production.{0,20}ready/i
		];

		return descriptionPatterns.some(pattern => 
			lines.some(line => pattern.test(line))
		);
	}

	/**
	 * Checks for installation instructions
	 */
	private hasInstallationSection(content: string): boolean {
		const patterns = [
			/#+\s*install/,
			/npm install/,
			/npm i /,
			/npx /,
			/installation/
		];

		return patterns.some(pattern => pattern.test(content));
	}

	/**
	 * Checks for configuration documentation
	 */
	private hasConfigurationSection(content: string): boolean {
		const patterns = [
			/#+\s*config/,
			/environment/,
			/\.env/,
			/configuration/,
			/setup/
		];

		return patterns.some(pattern => pattern.test(content));
	}

	/**
	 * Checks for usage examples and instructions
	 */
	private hasUsageSection(content: string): boolean {
		const patterns = [
			/#+\s*usage/,
			/#+\s*examples?/,
			/#+\s*getting started/,
			/mcpservers/,
			/cursor.*config/
		];

		return patterns.some(pattern => pattern.test(content));
	}

	/**
	 * Checks for authentication documentation
	 */
	private hasAuthenticationSection(content: string): boolean {
		const patterns = [
			/#+\s*auth/,
			/oauth/,
			/authentication/,
			/client.{0,10}id/,
			/client.{0,10}secret/
		];

		return patterns.some(pattern => pattern.test(content));
	}

	/**
	 * Checks for tools documentation
	 */
	private hasToolsDocumentation(content: string): boolean {
		const patterns = [
			/#+\s*tools/,
			/#+\s*available.{0,10}tools/,
			/cms_.*:/,
			/tool.*list/,
			/endpoints?.*available/
		];

		return patterns.some(pattern => pattern.test(content));
	}

	/**
	 * Checks for troubleshooting section
	 */
	private hasTroubleshootingSection(content: string): boolean {
		const patterns = [
			/#+\s*troubleshoot/,
			/#+\s*common.{0,10}issues?/,
			/#+\s*problems?/,
			/#+\s*faq/
		];

		return patterns.some(pattern => pattern.test(content));
	}

	/**
	 * Checks for code examples
	 */
	private hasExamples(content: string): boolean {
		const patterns = [
			/```\w*\n[\s\S]*?```/,
			/`[^`\n]+`/,
			/#+\s*examples?/
		];

		return patterns.some(pattern => pattern.test(content)) || content.includes('```');
	}

	/**
	 * Validates README requirements and adds errors/warnings
	 */
	private validateReadmeRequirements(analysis: ReadmeAnalysis, result: DocumentationValidationResult): void {
		if (!analysis.hasProjectDescription) {
			result.errors.push('README.md must include a clear project description mentioning MCP server');
		}

		if (!analysis.hasInstallation) {
			result.errors.push('README.md must include installation instructions');
		}

		if (!analysis.hasConfiguration) {
			result.errors.push('README.md must include configuration documentation');
		}

		if (!analysis.hasUsage) {
			result.errors.push('README.md must include usage examples');
		}

		if (!analysis.hasAuthentication) {
			result.warnings.push('README.md should include authentication setup instructions');
		}

		if (!analysis.hasToolsDocumentation) {
			result.warnings.push('README.md should document available tools');
		}

		if (!analysis.hasTroubleshooting) {
			result.warnings.push('README.md should include troubleshooting section');
		}

		if (!analysis.hasExamples) {
			result.warnings.push('README.md should include code examples');
		}

		if (analysis.wordCount < 300) {
			result.warnings.push('README.md appears to be too brief (< 300 words)');
		}

		if (analysis.sections.length < 4) {
			result.warnings.push('README.md should have more structured sections');
		}
	}

	/**
	 * Validates LICENSE file
	 */
	private validateLicense(projectPath: string, result: DocumentationValidationResult): void {
		const licensePath = path.join(projectPath, 'LICENSE');
		
		if (!fs.existsSync(licensePath)) {
			result.errors.push('LICENSE file is missing');
			return;
		}

		result.licenseCheck.exists = true;

		try {
			const content = fs.readFileSync(licensePath, 'utf-8');
			const licenseType = this.detectLicenseType(content);
			
			result.licenseCheck.type = licenseType;
			result.licenseCheck.isValidOssLicense = this.validOssLicenses.includes(licenseType || '');

			if (!result.licenseCheck.isValidOssLicense) {
				result.warnings.push(`License type '${licenseType || 'unknown'}' may not be suitable for open source distribution`);
			}

		} catch (error) {
			result.errors.push(`Failed to read LICENSE file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Detects license type from content
	 */
	private detectLicenseType(content: string): string | null {
		const licensePatterns = [
			{ type: 'MIT', pattern: /MIT License/i },
			{ type: 'Apache-2.0', pattern: /Apache License.*Version 2\.0/i },
			{ type: 'GPL-3.0', pattern: /GNU GENERAL PUBLIC LICENSE.*Version 3/i },
			{ type: 'BSD-3-Clause', pattern: /BSD 3-Clause/i },
			{ type: 'ISC', pattern: /ISC License/i },
			{ type: 'LGPL-2.1', pattern: /GNU LESSER GENERAL PUBLIC LICENSE.*Version 2\.1/i }
		];

		for (const { type, pattern } of licensePatterns) {
			if (pattern.test(content)) {
				return type;
			}
		}

		return null;
	}

	/**
	 * Validates additional documentation files
	 */
	private validateAdditionalDocs(projectPath: string, result: DocumentationValidationResult): void {
		const additionalDocs = [
			'.env.example',
			'CHANGELOG.md',
			'CONTRIBUTING.md'
		];

		for (const doc of additionalDocs) {
			const docPath = path.join(projectPath, doc);
			if (!fs.existsSync(docPath)) {
				if (doc === '.env.example') {
					result.warnings.push(`${doc} file recommended for environment configuration example`);
				} else {
					result.warnings.push(`${doc} file recommended for better project documentation`);
				}
			}
		}
	}

	/**
	 * Initializes README analysis structure
	 */
	private initializeReadmeAnalysis(): ReadmeAnalysis {
		return {
			exists: false,
			hasProjectDescription: false,
			hasInstallation: false,
			hasConfiguration: false,
			hasUsage: false,
			hasAuthentication: false,
			hasToolsDocumentation: false,
			hasTroubleshooting: false,
			hasExamples: false,
			wordCount: 0,
			sections: []
		};
	}

	/**
	 * Initializes license check structure
	 */
	private initializeLicenseCheck(): LicenseCheck {
		return {
			exists: false,
			type: null,
			isValidOssLicense: false
		};
	}
}