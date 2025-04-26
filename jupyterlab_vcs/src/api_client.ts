import { PageConfig } from '@jupyterlab/coreutils';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import axios, { AxiosInstance } from 'axios';
import { showSpinner } from './ui_elements';
import { Widget } from '@lumino/widgets';

export interface GitResponse {
  github_url?: string;
  pranay_url?: string;
}

export interface Repository {
  name: string;
  path: string;
}

export const HTTP: AxiosInstance = axios.create({
  baseURL: PageConfig.getBaseUrl(),
  timeout: 10000 // 10s timeout for API calls
});

HTTP.defaults.headers.post['X-CSRFToken'] = getCookie('_xsrf');

function getCookie(name: string): string | undefined {
  const r = document.cookie.match(`\\b${name}=([^;]*)\\b`);
  return r ? r[1] : undefined;
}

// Retry logic for API calls
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

export async function getServerConfig(): Promise<any> {
  try {
    const response = await withRetry(() => HTTP.get('vcs/expanded_server_root'));
    return response.data;
  } catch (error) {
    console.error('Failed to get server config:', error);
    const body = new Widget({ node: document.createElement('div') });
    body.node.textContent = 'Unable to fetch server configuration.';
    await showDialog({
      title: 'Server Config Error',
      body,
      buttons: [Dialog.okButton()]
    });
    throw error;
  }
}

export async function configureGit(data: { username: string; email: string; token?: string }): Promise<void> {
    try {
      console.log('Sending configuration data:', data);
      await withRetry(() => HTTP.post('vcs/configure', data));
      console.log('Configuration successful');
    } catch (error) {
      console.error('Failed to configure Git:')
      throw error;
    }
  }

export async function resetConfigureGit(): Promise<void> {
    try {
      await withRetry(() => HTTP.post('vcs/reset'));
      console.log('Configuration reset successful');
    } catch (error) {
      console.error('Failed to reset configure Git:')
      throw error;
    }
  }

export async function createAndPushCommit(
    data: { commit_message: string },
    showCommitPushedDialog: (githubUrl?: string, pranayUrl?: string) => void
  ): Promise<void> {
    showSpinner();
    try {
      const response = await withRetry(() => HTTP.post('vcs/commit', data));
      const result: GitResponse = response.data;
      Dialog.flush();
      showCommitPushedDialog(result.github_url, result.pranay_url);
    } catch (error) {
      console.error('Failed to create and push commit:', error);
      Dialog.flush();
      const body = new Widget({ node: document.createElement('div') });
      body.node.textContent = 'Failed to commit local changes. Please set Git Access details.';
      await showDialog({
        title: 'Commit Error',
        body,
        buttons: [Dialog.okButton()]
      });
      showCommitPushedDialog();
    }
  }

export async function cloneRepository(data: { repoUrl: string }): Promise<void> {
  try {
    await withRetry(() => HTTP.post('vcs/clone', data));
  } catch (error) {
    console.error('Failed to clone repository:', error);
    throw error;
  }
}

export async function tagVersion(data: { tag: string }): Promise<void> {
  try {
    await withRetry(() => HTTP.post('vcs/tag', data));
  } catch (error) {
    console.error('Failed to tag version:', error);
    throw error;
  }
}

export async function getModifiedRepositories(
  data: Record<string, any>,
  showRepositorySelectionDialog: (repos: string[][], command: string) => void,
  command: string,
  showRepositorySelectionFailureDialog: () => void
): Promise<void> {
  try {
    const response = await withRetry(() => HTTP.post('vcs/modified_repo', data));
    const repoList: Repository[] = response.data;
    const repoNames: string[][] = repoList.map(repo => [
      `${repo.name} (${repo.path})`,
      repo.path
    ]);
    showRepositorySelectionDialog(repoNames, command);
  } catch (error) {
    console.error('Failed to get modified repositories:', error);
    showRepositorySelectionFailureDialog();
  }
}




export async function getBranches(repoPath: string): Promise<string[]> {
  try {
    const response = await withRetry(() => HTTP.get(`vcs/branches?repo_path=${encodeURIComponent(repoPath)}`));
    return response.data.branches || [];
  } catch (error) {
    console.error('Failed to fetch branches:', error);
    const body = new Widget({ node: document.createElement('div') });
    body.node.textContent = 'Unable to fetch repository branches.';
    await showDialog({
      title: 'Branches Error',
      body,
      buttons: [Dialog.okButton()]
    });
    return [];
  }
}