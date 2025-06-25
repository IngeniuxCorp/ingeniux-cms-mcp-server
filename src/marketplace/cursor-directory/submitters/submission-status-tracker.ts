export interface SubmissionStatus {
	id: string;
	entryName: string;
	slug: string;
	status: SubmissionStatusType;
	phase: string;
	timestamp: Date;
	prUrl?: string;
	prNumber?: number;
	errors: string[];
	warnings: string[];
}

export enum SubmissionStatusType {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	SUCCESS = 'success',
	FAILED = 'failed',
	CANCELLED = 'cancelled'
}

export interface StatusUpdate {
	status?: SubmissionStatusType;
	phase?: string;
	prUrl?: string;
	prNumber?: number;
	errors?: string[];
	warnings?: string[];
}

export interface SubmissionHistory {
	submissions: SubmissionStatus[];
	lastUpdated: Date;
}

import * as fs from 'fs';
import * as path from 'path';

export class SubmissionStatusTracker {
	private readonly statusFile: string;
	private submissions: Map<string, SubmissionStatus> = new Map();

	constructor(statusFilePath?: string) {
		this.statusFile = statusFilePath || this.getDefaultStatusFile();
		this.loadStatus();
	}

	/**
	 * Creates a new submission tracking entry
	 */
	public createSubmission(entryName: string, slug: string): string {
		const id = this.generateSubmissionId(slug);
		
		const submission: SubmissionStatus = {
			id,
			entryName,
			slug,
			status: SubmissionStatusType.PENDING,
			phase: 'Initialization',
			timestamp: new Date(),
			errors: [],
			warnings: []
		};

		this.submissions.set(id, submission);
		this.saveStatus();
		
		return id;
	}

	/**
	 * Updates submission status
	 */
	public updateSubmission(id: string, update: StatusUpdate): boolean {
		const submission = this.submissions.get(id);
		if (!submission) {
			return false;
		}

		// Update fields if provided
		if (update.status !== undefined) {
			submission.status = update.status;
		}
		
		if (update.phase !== undefined) {
			submission.phase = update.phase;
		}
		
		if (update.prUrl !== undefined) {
			submission.prUrl = update.prUrl;
		}
		
		if (update.prNumber !== undefined) {
			submission.prNumber = update.prNumber;
		}
		
		if (update.errors) {
			submission.errors.push(...update.errors);
		}
		
		if (update.warnings) {
			submission.warnings.push(...update.warnings);
		}

		// Update timestamp
		submission.timestamp = new Date();

		this.submissions.set(id, submission);
		this.saveStatus();
		
		return true;
	}

	/**
	 * Gets submission status by ID
	 */
	public getSubmission(id: string): SubmissionStatus | null {
		return this.submissions.get(id) || null;
	}

	/**
	 * Gets all submissions
	 */
	public getAllSubmissions(): SubmissionStatus[] {
		return Array.from(this.submissions.values())
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}

	/**
	 * Gets submissions by status
	 */
	public getSubmissionsByStatus(status: SubmissionStatusType): SubmissionStatus[] {
		return this.getAllSubmissions().filter(s => s.status === status);
	}

	/**
	 * Gets recent submissions (last N)
	 */
	public getRecentSubmissions(count: number = 10): SubmissionStatus[] {
		return this.getAllSubmissions().slice(0, count);
	}

	/**
	 * Marks submission as successful
	 */
	public markSuccess(id: string, prUrl: string, prNumber: number): boolean {
		return this.updateSubmission(id, {
			status: SubmissionStatusType.SUCCESS,
			phase: 'Completed',
			prUrl,
			prNumber
		});
	}

	/**
	 * Marks submission as failed
	 */
	public markFailed(id: string, errors: string[], phase?: string): boolean {
		return this.updateSubmission(id, {
			status: SubmissionStatusType.FAILED,
			phase: phase || 'Failed',
			errors
		});
	}

	/**
	 * Marks submission as cancelled
	 */
	public markCancelled(id: string, reason?: string): boolean {
		const errors = reason ? [reason] : ['Submission cancelled by user'];
		return this.updateSubmission(id, {
			status: SubmissionStatusType.CANCELLED,
			phase: 'Cancelled',
			errors
		});
	}

	/**
	 * Removes old submissions (older than specified days)
	 */
	public cleanupOldSubmissions(daysToKeep: number = 30): number {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
		
		let removedCount = 0;
		
		for (const [id, submission] of this.submissions.entries()) {
			if (submission.timestamp < cutoffDate) {
				this.submissions.delete(id);
				removedCount++;
			}
		}
		
		if (removedCount > 0) {
			this.saveStatus();
		}
		
		return removedCount;
	}

	/**
	 * Gets submission statistics
	 */
	public getStatistics(): {
		total: number;
		byStatus: Record<string, number>;
		recentActivity: { date: string; count: number }[];
	} {
		const submissions = this.getAllSubmissions();
		
		const byStatus: Record<string, number> = {};
		Object.values(SubmissionStatusType).forEach(status => {
			byStatus[status] = 0;
		});
		
		submissions.forEach(s => {
			byStatus[s.status]++;
		});
		
		// Recent activity (last 7 days)
		const recentActivity: { date: string; count: number }[] = [];
		for (let i = 6; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];
			
			const count = submissions.filter(s => 
				s.timestamp.toISOString().split('T')[0] === dateStr
			).length;
			
			recentActivity.push({ date: dateStr, count });
		}
		
		return {
			total: submissions.length,
			byStatus,
			recentActivity
		};
	}

	/**
	 * Exports submission history
	 */
	public exportHistory(): SubmissionHistory {
		return {
			submissions: this.getAllSubmissions(),
			lastUpdated: new Date()
		};
	}

	/**
	 * Imports submission history
	 */
	public importHistory(history: SubmissionHistory): void {
		this.submissions.clear();
		
		history.submissions.forEach(submission => {
			// Ensure timestamp is a Date object
			if (typeof submission.timestamp === 'string') {
				submission.timestamp = new Date(submission.timestamp);
			}
			this.submissions.set(submission.id, submission);
		});
		
		this.saveStatus();
	}

	/**
	 * Generates unique submission ID
	 */
	private generateSubmissionId(slug: string): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `${slug}-${timestamp}-${random}`;
	}

	/**
	 * Gets default status file path
	 */
	private getDefaultStatusFile(): string {
		return path.join(process.cwd(), '.cursor-directory-submissions.json');
	}

	/**
	 * Loads status from file
	 */
	private loadStatus(): void {
		try {
			if (fs.existsSync(this.statusFile)) {
				const data = fs.readFileSync(this.statusFile, 'utf8');
				const parsed = JSON.parse(data);
				
				if (parsed.submissions && Array.isArray(parsed.submissions)) {
					parsed.submissions.forEach((submission: any) => {
						// Ensure timestamp is a Date object
						if (typeof submission.timestamp === 'string') {
							submission.timestamp = new Date(submission.timestamp);
						}
						this.submissions.set(submission.id, submission);
					});
				}
			}
		} catch (error) {
			// If loading fails, start with empty state
			console.warn(`Failed to load submission status: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Saves status to file
	 */
	private saveStatus(): void {
		try {
			const history = this.exportHistory();
			const data = JSON.stringify(history, null, 2);
			
			// Ensure directory exists
			const dir = path.dirname(this.statusFile);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			
			fs.writeFileSync(this.statusFile, data, 'utf8');
		} catch (error) {
			console.error(`Failed to save submission status: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Checks if submission exists for a given slug
	 */
	public hasSubmissionForSlug(slug: string): boolean {
		return Array.from(this.submissions.values()).some(s => s.slug === slug);
	}

	/**
	 * Gets latest submission for a slug
	 */
	public getLatestSubmissionForSlug(slug: string): SubmissionStatus | null {
		const submissions = Array.from(this.submissions.values())
			.filter(s => s.slug === slug)
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		
		return submissions.length > 0 ? submissions[0] : null;
	}

	/**
	 * Validates submission status data
	 */
	public validateSubmission(submission: SubmissionStatus): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];
		
		if (!submission.id || submission.id.trim().length === 0) {
			errors.push('Submission ID is required');
		}
		
		if (!submission.entryName || submission.entryName.trim().length === 0) {
			errors.push('Entry name is required');
		}
		
		if (!submission.slug || submission.slug.trim().length === 0) {
			errors.push('Slug is required');
		}
		
		if (!Object.values(SubmissionStatusType).includes(submission.status)) {
			errors.push('Invalid submission status');
		}
		
		if (!submission.timestamp || !(submission.timestamp instanceof Date)) {
			errors.push('Valid timestamp is required');
		}
		
		return {
			isValid: errors.length === 0,
			errors
		};
	}
}