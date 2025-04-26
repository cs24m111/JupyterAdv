import { Widget } from '@lumino/widgets';
export declare class SpinnerDialog extends Widget {
    constructor();
}
export declare function showSpinner(): SpinnerDialog;
export declare class PRCreated extends Widget {
    constructor(githubUrl?: string, pranayUrl?: string);
}
export declare class CommitPushed extends Widget {
    constructor(githubUrl?: string, pranayUrl?: string);
}
export declare class DropDown extends Widget {
    constructor(options?: string[][], label?: string, styles?: Record<string, Record<string, string>>);
    get toNode(): HTMLSelectElement;
    getTo(): string;
}
export declare class CheckBoxes extends Widget {
    constructor(items?: string[]);
    getSelected(): string[];
}
export declare class CommitPRMessageDialog extends Widget {
    constructor();
    getCommitMessage(): string;
    getPRTitle(): string;
    getBranch(): string;
    setBranches(branches: string[]): void;
}
export declare class CommitMessageDialog extends Widget {
    constructor();
    getCommitMessage(): string;
}
