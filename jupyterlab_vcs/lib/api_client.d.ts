import { AxiosInstance } from 'axios';
export interface GitResponse {
    github_url?: string;
    pranay_url?: string;
}
export interface Repository {
    name: string;
    path: string;
}
export declare const HTTP: AxiosInstance;
export declare function getServerConfig(): Promise<any>;
export declare function configureGit(data: {
    username: string;
    email: string;
    token?: string;
}): Promise<void>;
export declare function resetConfigureGit(): Promise<void>;
export declare function createAndPushCommit(data: {
    commit_message: string;
}, showCommitPushedDialog: (githubUrl?: string, pranayUrl?: string) => void): Promise<void>;
export declare function cloneRepository(data: {
    repoUrl: string;
}): Promise<void>;
export declare function tagVersion(data: {
    tag: string;
}): Promise<void>;
export declare function getModifiedRepositories(data: Record<string, any>, showRepositorySelectionDialog: (repos: string[][], command: string) => void, command: string, showRepositorySelectionFailureDialog: () => void): Promise<void>;
export declare function getBranches(repoPath: string): Promise<string[]>;
