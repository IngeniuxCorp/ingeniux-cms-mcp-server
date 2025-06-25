export interface ForkResult {
	success: boolean;
	forkUrl?: string;
	forkName?: string;
	error?: string;
}

export interface PullRequestResult {
	success: boolean;
	prUrl?: string;
	prNumber?: number;
	error?: string;
}

export interface BranchResult {
	success: boolean;
	branchName?: string;
	error?: string;
}

export interface FileResult {
	success: boolean;
	filePath?: string;
	error?: string;
}

export interface GitHubApiConfig {
	token: string;
	baseUrl?: string;
	timeout?: number;
}

export interface PullRequestData {
	title: string;
	body: string;
	headBranch: string;
	baseBranch: string;
}

export interface FileChange {
	path: string;
	content: string;
	encoding?: string;
}

export class GitHubApiClient {
	private readonly token: string;
	private readonly baseUrl: string;
	private readonly timeout: number;
	private readonly headers: Record<string, string>;

	constructor(config: GitHubApiConfig) {
		this.token = config.token;
		this.baseUrl = config.baseUrl || 'https://api.github.com';
		this.timeout = config.timeout || 30000;
		
		this.headers = {
			'Authorization': `token ${this.token}`,
			'Accept': 'application/vnd.github.v3+json',
			'Content-Type': 'application/json',
			'User-Agent': 'Ingeniux-CMS-MCP-Server'
		};
	}

	/**
	 * Forks a repository
	 */
	public async forkRepository(owner: string, repo: string): Promise<ForkResult> {
		try {
			const endpoint = `${this.baseUrl}/repos/${owner}/${repo}/forks`;
			
			const response = await this.makeRequest('POST', endpoint, {});
			
			if (response.ok) {
				const data = await response.json() as any;
				return {
					success: true,
					forkUrl: data.clone_url,
					forkName: data.full_name
				};
			} else {
				const errorData = await response.json().catch(() => ({})) as any;
				return {
					success: false,
					error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
				};
			}

		} catch (error) {
			return {
				success: false,
				error: `Fork failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Creates a new branch from base branch
	 */
	public async createBranch(owner: string, repo: string, branchName: string, baseBranch: string = 'main'): Promise<BranchResult> {
		try {
			// First, get the SHA of the base branch
			const baseRefEndpoint = `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`;
			const baseRefResponse = await this.makeRequest('GET', baseRefEndpoint);
			
			if (!baseRefResponse.ok) {
				return {
					success: false,
					error: `Failed to get base branch ${baseBranch}`
				};
			}

			const baseRefData = await baseRefResponse.json() as any;
			const baseSha = baseRefData.object.sha;

			// Create new branch
			const createBranchEndpoint = `${this.baseUrl}/repos/${owner}/${repo}/git/refs`;
			const createBranchData = {
				ref: `refs/heads/${branchName}`,
				sha: baseSha
			};

			const response = await this.makeRequest('POST', createBranchEndpoint, createBranchData);
			
			if (response.ok) {
				return {
					success: true,
					branchName
				};
			} else {
				const errorData = await response.json().catch(() => ({})) as any;
				return {
					success: false,
					error: errorData.message || `Failed to create branch: HTTP ${response.status}`
				};
			}

		} catch (error) {
			return {
				success: false,
				error: `Branch creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Creates or updates a file in the repository
	 */
	public async createOrUpdateFile(
		owner: string, 
		repo: string, 
		filePath: string, 
		content: string, 
		commitMessage: string,
		branch: string = 'main'
	): Promise<FileResult> {
		try {
			const endpoint = `${this.baseUrl}/repos/${owner}/${repo}/contents/${filePath}`;
			
			// Check if file exists to get SHA for update
			let sha: string | undefined;
			try {
				const existingFileResponse = await this.makeRequest('GET', `${endpoint}?ref=${branch}`);
				if (existingFileResponse.ok) {
					const existingFileData = await existingFileResponse.json() as any;
					sha = existingFileData.sha;
				}
			} catch {
				// File doesn't exist, that's ok for creation
			}

			const fileData = {
				message: commitMessage,
				content: Buffer.from(content, 'utf8').toString('base64'),
				branch,
				...(sha && { sha })
			};

			const response = await this.makeRequest('PUT', endpoint, fileData);
			
			if (response.ok) {
				return {
					success: true,
					filePath
				};
			} else {
				const errorData = await response.json().catch(() => ({})) as any;
				return {
					success: false,
					error: errorData.message || `Failed to create/update file: HTTP ${response.status}`
				};
			}

		} catch (error) {
			return {
				success: false,
				error: `File operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Creates a pull request
	 */
	public async createPullRequest(
		owner: string, 
		repo: string, 
		prData: PullRequestData,
		headOwner?: string
	): Promise<PullRequestResult> {
		try {
			const endpoint = `${this.baseUrl}/repos/${owner}/${repo}/pulls`;
			
			const head = headOwner ? `${headOwner}:${prData.headBranch}` : prData.headBranch;
			
			const payload = {
				title: prData.title,
				body: prData.body,
				head,
				base: prData.baseBranch,
				maintainer_can_modify: true
			};

			const response = await this.makeRequest('POST', endpoint, payload);
			
			if (response.ok) {
				const data = await response.json() as any;
				return {
					success: true,
					prUrl: data.html_url,
					prNumber: data.number
				};
			} else {
				const errorData = await response.json().catch(() => ({})) as any;
				return {
					success: false,
					error: errorData.message || `Failed to create PR: HTTP ${response.status}`
				};
			}

		} catch (error) {
			return {
				success: false,
				error: `PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Gets repository information
	 */
	public async getRepository(owner: string, repo: string): Promise<any> {
		try {
			const endpoint = `${this.baseUrl}/repos/${owner}/${repo}`;
			const response = await this.makeRequest('GET', endpoint);
			
			if (response.ok) {
				return await response.json();
			} else {
				throw new Error(`Failed to get repository: HTTP ${response.status}`);
			}

		} catch (error) {
			throw new Error(`Get repository failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Gets user information
	 */
	public async getUser(): Promise<any> {
		try {
			const endpoint = `${this.baseUrl}/user`;
			const response = await this.makeRequest('GET', endpoint);
			
			if (response.ok) {
				return await response.json();
			} else {
				throw new Error(`Failed to get user: HTTP ${response.status}`);
			}

		} catch (error) {
			throw new Error(`Get user failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Validates the GitHub token
	 */
	public async validateToken(): Promise<boolean> {
		try {
			await this.getUser();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Makes HTTP request to GitHub API
	 */
	private async makeRequest(method: string, url: string, body?: any): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const options: RequestInit = {
				method,
				headers: this.headers,
				signal: controller.signal
			};

			if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
				options.body = JSON.stringify(body);
			}

			const response = await fetch(url, options);
			clearTimeout(timeoutId);
			
			return response;

		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Request timeout after ${this.timeout}ms`);
			}
			throw error;
		}
	}

	/**
	 * Batch creates multiple files
	 */
	public async createFiles(
		owner: string,
		repo: string,
		files: FileChange[],
		branch: string,
		commitMessagePrefix: string = 'Add'
	): Promise<{ success: boolean; results: FileResult[] }> {
		const results: FileResult[] = [];
		let allSuccessful = true;

		for (const file of files) {
			const commitMessage = `${commitMessagePrefix} ${file.path}`;
			const result = await this.createOrUpdateFile(
				owner,
				repo,
				file.path,
				file.content,
				commitMessage,
				branch
			);
			
			results.push(result);
			if (!result.success) {
				allSuccessful = false;
			}
		}

		return {
			success: allSuccessful,
			results
		};
	}

	/**
	 * Gets rate limit information
	 */
	public async getRateLimit(): Promise<any> {
		try {
			const endpoint = `${this.baseUrl}/rate_limit`;
			const response = await this.makeRequest('GET', endpoint);
			
			if (response.ok) {
				return await response.json();
			} else {
				throw new Error(`Failed to get rate limit: HTTP ${response.status}`);
			}

		} catch (error) {
			throw new Error(`Get rate limit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}