#!/usr/bin/env node
/**
 * Main CLI entry point for get page tool
 */

import { GetPageExecutor } from './get-page-executor.js';
import { GetPageFormatter } from './get-page-formatter.js';
import { CLIConfigHandler } from '../cli-config.js';
import { GetPageCLIOptions } from './get-page-types.js';
import { GetPageValidator } from './get-page-validator.js';
import { logger } from '../../utils/logger.js';

export class GetPageCLI {
    public static async main(): Promise<void> {
        try {
            // Parse command line arguments
            const options = this.parseArguments(process.argv);

            // Show help if requested
            if (options.help) {
                this.showHelp();
                process.exit(0);
            }

            // Validate CLI options
            const validationErrors = GetPageValidator.validateCLIOptions(options);
            if (validationErrors.length > 0) {
                console.error('Validation errors:');
                validationErrors.forEach(error => {
                    console.error(`  - ${error.field}: ${error.message}`);
                });
                process.exit(1);
            }

            // Load configuration
            const configHandler = new CLIConfigHandler();
            const config = await configHandler.loadConfig({
                format: options.format,
                browser: true,
                timeout: options.timeout.toString(),
                verbose: options.verbose
            });

            // Initialize executor
            const executor = new GetPageExecutor(config);

            // Execute get page request
            const request: any = {
                includeContent: options.includeContent ?? true
            };

            if (options.pageId) {
                request.pageId = options.pageId;
            }
            if (options.path) {
                request.path = options.path;
            }

            const result = await executor.execute(request);

            // Format and display output
            const formatter = new GetPageFormatter(config.format);
            const output = formatter.formatResult(result);

            console.log(output.content);
            process.exit(output.exitCode);

        } catch (error) {
            logger.error('CLI execution failed', { error });
            console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

            if (error instanceof Error && 'suggestions' in error) {
                console.error('Suggestions:');
                const suggestions = (error as any).suggestions as string[];
                suggestions.forEach(suggestion => {
                    console.error(`  - ${suggestion}`);
                });
            }

            process.exit(1);
        }
    }

    private static parseArguments(argv: string[]): GetPageCLIOptions {
        const options: GetPageCLIOptions = {
            format: 'table',
            timeout: 300,
            verbose: false,
            includeContent: true
        };

        try {
            // Parse arguments starting from index 2 (skip node and script name)
            for (let i = 2; i < argv.length; i++) {
                const arg = argv[i];

                switch (arg) {
                    case '--pageId':
                        options.pageId = this.getNextArgument(argv, i);
                        i++;
                        break;
                    case '--path':
                        options.path = this.getNextArgument(argv, i);
                        i++;
                        break;
                    case '--includeContent':
                        options.includeContent = GetPageValidator.parseBoolean(this.getNextArgument(argv, i));
                        i++;
                        break;
                    case '--format':
                        options.format = GetPageValidator.validateFormat(this.getNextArgument(argv, i));
                        i++;
                        break;
                    case '--timeout':
                        options.timeout = parseInt(this.getNextArgument(argv, i), 10);
                        i++;
                        break;
                    case '--verbose':
                        options.verbose = true;
                        break;
                    case '--help':
                        options.help = true;
                        break;
                    default:
                        throw new Error(`Unknown argument: ${arg}`);
                }
            }

            return options;
        } catch (error) {
            throw new Error(`Argument parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private static getNextArgument(argv: string[], currentIndex: number): string {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= argv.length) {
            throw new Error(`Missing value for argument: ${argv[currentIndex]}`);
        }
        return argv[nextIndex];
    }

    private static showHelp(): void {
        const helpText = `
Usage: npm run test-get-page -- [options]

Options:
  --pageId <id>           Page ID to retrieve
  --path <path>           Page path to retrieve (alternative to pageId)
  --includeContent <bool> Include page content (default: true)
  --format <format>       Output format: json, table, minimal (default: table)
  --timeout <seconds>     Request timeout in seconds (default: 300)
  --verbose               Enable verbose logging
  --help                  Show this help message

Examples:
  npm run test-get-page -- --pageId "123"
  npm run test-get-page -- --path "/home" --format json
  npm run test-get-page -- --pageId "456" --includeContent false --verbose
`;
        console.log(helpText);
    }
}

// Execute if called directly
GetPageCLI.main();