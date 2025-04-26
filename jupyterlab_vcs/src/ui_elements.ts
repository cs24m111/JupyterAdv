import { Widget } from '@lumino/widgets';
import { Spinner } from '@jupyterlab/apputils';

export class SpinnerDialog extends Widget {
  constructor() {
    const spinnerStyle: Record<string, string> = {
      'margin-top': '6em',
      display: 'flex',
      'justify-content': 'center'
    };
    const body = document.createElement('div');
    const container = document.createElement('div');
    Private.applyStyle(container, spinnerStyle);
    body.appendChild(container);
    const spinner = new Spinner();
    container.appendChild(spinner.node);
    super({ node: body });
  }
}

export function showSpinner(): SpinnerDialog {
  const spinnerDialog = new SpinnerDialog();
  spinnerDialog.addClass('jp-Spinner');
  return spinnerDialog;
}

export class PRCreated extends Widget {
  constructor(githubUrl = '', pranayUrl = '') {
    const anchorStyle: Record<string, string> = {
      color: '#0052cc',
      'text-decoration': 'none',
      'font-weight': '500'
    };

    const body = document.createElement('div');
    const container = document.createElement('div');
    container.classList.add('vcs-dialog-body');
    body.appendChild(container);

    if (githubUrl) {
      container.appendChild(Private.buildLabel('Pull Request on GitHub:'));
      container.appendChild(Private.buildNewline());
      container.appendChild(Private.buildAnchor(githubUrl, githubUrl, anchorStyle));
      container.appendChild(Private.buildNewline());
      container.appendChild(Private.buildNewline());
    }
    if (pranayUrl) {
      container.appendChild(Private.buildLabel('Pull Request on pranay:'));
      container.appendChild(Private.buildNewline());
      container.appendChild(Private.buildAnchor(pranayUrl, pranayUrl, anchorStyle));
    }
    if (!githubUrl && !pranayUrl) {
      container.appendChild(Private.buildLabel('No links available.'));
    }

    super({ node: body });
  }
}

export class CommitPushed extends Widget {
  constructor(githubUrl = '', pranayUrl = '') {

    const body = document.createElement('div');
    const container = document.createElement('div');
    container.classList.add('vcs-dialog-body');
    body.appendChild(container);

    if (githubUrl) {
      container.appendChild(Private.buildLabel('Local commit: '+githubUrl+" created successfully."));
      container.appendChild(Private.buildNewline());
    }
    if (pranayUrl) {
      container.appendChild(Private.buildLabel(pranayUrl));
    }


    super({ node: body });
  }
}

export class DropDown extends Widget {
  constructor(
    options: string[][] = [],
    label = '',
    styles: Record<string, Record<string, string>> = {}
  ) {
    const body = document.createElement('div');
    const container = document.createElement('div');
    Private.applyStyle(body, styles.bodyStyle ?? {});
    body.appendChild(container);
    container.appendChild(Private.buildLabel(label, styles.labelStyle ?? {}));
    container.appendChild(Private.buildSelect(options, styles.selectStyle ?? {}));
    super({ node: body });
  }

  get toNode(): HTMLSelectElement {
    return this.node.querySelector('select') as HTMLSelectElement;
  }

  public getTo(): string {
    return this.toNode.value;
  }
}

export class CheckBoxes extends Widget {
  constructor(items: string[] = []) {
    const container = document.createElement('div');
    container.classList.add('vcs-dialog-body');
    for (const item of items) {
      container.appendChild(Private.buildCheckbox(item));
    }
    super({ node: container });
  }

  public getSelected(): string[] {
    return Array.from(this.node.querySelectorAll('input:checked')).map(
      input => (input as HTMLInputElement).id
    );
  }
}

export class CommitPRMessageDialog extends Widget {
  constructor() {
    const body = document.createElement('div');
    const container = document.createElement('div');
    container.classList.add('vcs-dialog-body');
    body.appendChild(container);

    container.appendChild(Private.buildLabel('Commit Message:'));
    container.appendChild(
      Private.buildTextarea('Enter your commit message', 'vcs-commit-message', 'vcs-textarea')
    );
    container.appendChild(Private.buildNewline());
    container.appendChild(Private.buildLabel('Pull Request Title:'));
    container.appendChild(
      Private.buildTextarea('Enter title for pull request', 'vcs-pr-title', 'vcs-textarea')
    );
    container.appendChild(Private.buildNewline());
    container.appendChild(Private.buildLabel('Branch:'));
    container.appendChild(Private.buildSelect([], { width: '100%' }, 'Select branch'));

    super({ node: body });
  }

  public getCommitMessage(): string {
    return (this.node.querySelector('#vcs-commit-message') as HTMLTextAreaElement)?.value || '';
  }

  public getPRTitle(): string {
    return (this.node.querySelector('#vcs-pr-title') as HTMLTextAreaElement)?.value || '';
  }

  public getBranch(): string {
    return (this.node.querySelector('select') as HTMLSelectElement)?.value || '';
  }

  public setBranches(branches: string[]): void {
    const select = this.node.querySelector('select') as HTMLSelectElement;
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Select branch';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    branches.forEach(branch => {
      const option = document.createElement('option');
      option.value = branch;
      option.text = branch;
      select.appendChild(option);
    });
  }
}

export class CommitMessageDialog extends Widget {
  constructor() {
    const body = document.createElement('div');
    const container = document.createElement('div');
    container.classList.add('vcs-dialog-body');
    body.appendChild(container);

    container.appendChild(Private.buildLabel('Commit Message:'));
    container.appendChild(
      Private.buildTextarea('Enter your commit message', 'vcs-commit-message', 'vcs-textarea')
    );

    super({ node: body });
  }

  public getCommitMessage(): string {
    return (this.node.querySelector('#vcs-commit-message') as HTMLTextAreaElement)?.value || '';
  }
}

namespace Private {
  export function buildLabel(text: string, style: Record<string, string> = {}): HTMLLabelElement {
    const label = document.createElement('label');
    label.textContent = text;
    applyStyle(label, style);
    return label;
  }

  export function buildAnchor(url: string, text: string, style: Record<string, string> = {}): HTMLAnchorElement {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.text = text;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    applyStyle(anchor, style);
    return anchor;
  }

  export function buildNewline(): HTMLBRElement {
    return document.createElement('br');
  }

  export function buildCheckbox(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.classList.add('vcs-checkbox');
    input.id = text;
    input.type = 'checkbox';
    label.htmlFor = text;
    label.textContent = text;
    span.appendChild(input);
    span.appendChild(label);
    return span;
  }

  export function buildTextarea(text: string, id: string, className: string): HTMLTextAreaElement {
    const area = document.createElement('textarea');
    area.placeholder = text;
    area.id = id;
    area.classList.add(className);
    return area;
  }

  export function buildSelect(
    list: string[][],
    style: Record<string, string> = {},
    defaultText?: string
  ): HTMLSelectElement {
    const select = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = defaultText || 'Select an option';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    list.forEach(([text, value]) => {
      const option = document.createElement('option');
      option.value = value;
      option.text = text;
      select.appendChild(option);
    });

    applyStyle(select, style);
    return select;
  }

  export function applyStyle(element: HTMLElement, style: Record<string, string>): HTMLElement {
    Object.entries(style).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
    return element;
  }
}