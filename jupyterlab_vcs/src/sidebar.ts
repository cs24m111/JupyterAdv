import { Widget } from '@lumino/widgets';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import {
  
  CommitMessageDialog,
  CommitPushed
} from './ui_elements';
import {
  createAndPushCommit,
  configureGit,
  resetConfigureGit
} from './api_client';

export class vcsSidebar extends Widget {
  private _statusElement: HTMLSpanElement;
  
  constructor() {
    super();
    this.id = 'vcs-sidebar';
    this.title.iconClass = 'jp-Icon jp-Icon-20 jp-vcsIcon';
    this.title.caption = 'vcs';
    this.addClass('vcs-sidebar-widget');

    const container = document.createElement('div');
    container.className = 'vcs-sidebar-container';

    // Header
    const header = document.createElement('div');
    header.className = 'vcs-sidebar-header';
    header.textContent = '';
    container.appendChild(header);

    // Status
    const statusContainer = document.createElement('div');
    statusContainer.className = 'vcs-status-container';
    this._statusElement = document.createElement('span');
    this._statusElement.className = 'vcs-status';
    this._statusElement.textContent = 'Ready';
    statusContainer.appendChild(this._statusElement);
    container.appendChild(statusContainer);

    // Buttons
    const configureGitButton = this._createButton('Set Git Access', () => this._onConfigureGit());
    //const cloneRepoButton = this._createButton('Clone Repository', () => this._onCloneRepo());
    const createCommitButton = this._createButton('Create Local Commit', () => this._onCreateCommit());
    //const viewReposButton = this._createButton('View Modified Repos', () => this._onViewRepos());
    const refreshButton = this._createButton('Reset Git Access', () => this._onRefresh());

    container.appendChild(configureGitButton);
    //container.appendChild(cloneRepoButton);
    container.appendChild(createCommitButton);
    //container.appendChild(viewReposButton);
    container.appendChild(refreshButton);

    this.node.appendChild(container);
  }

  private _createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = 'vcs-button';
    button.onclick = onClick;
    return button;
  }

  private _updateStatus(message: string, isError = false): void {
    this._statusElement.textContent = message;
    this._statusElement.className = `vcs-status ${isError ? 'error' : ''}`;
  }

  private async _onConfigureGit(): Promise<void> {
    this._updateStatus('Configuring Git...');
    const body = new Widget({ node: document.createElement('div') });
    body.node.className = 'vcs-dialog-body';

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.placeholder = 'Git Username';
    usernameInput.className = 'vcs-input';
    body.node.appendChild(document.createElement('label')).textContent = 'Username:';
    body.node.appendChild(usernameInput);
    body.node.appendChild(document.createElement('br'));

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Git Email';
    emailInput.className = 'vcs-input';
    body.node.appendChild(document.createElement('label')).textContent = 'Email:';
    body.node.appendChild(emailInput);
    body.node.appendChild(document.createElement('br'));

    const tokenInput = document.createElement('input');
    tokenInput.type = 'password';
    tokenInput.placeholder = 'GitHub Token ';
    tokenInput.className = 'vcs-input';
    body.node.appendChild(document.createElement('label')).textContent = 'GitHub Token:';
    body.node.appendChild(tokenInput);

    const result = await showDialog({
      title: 'Configure Git',
      body,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Save' })]
    });

    if (result.button.label !== 'Save') {
      this._updateStatus('Ready');
      return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const token = tokenInput.value.trim();

    if (!username || !email || !token) {
      this._updateStatus('Missing required fields', true);
      const errorBody = new Widget({ node: document.createElement('div') });
      errorBody.node.textContent = 'Please provide a username / email / token.';
      await showDialog({
        title: 'Invalid Input',
        body: errorBody,
        buttons: [Dialog.okButton()]
      });
      return;
    }

    try {
      await configureGit({ username, email, token });
      this._updateStatus('Git configured successfully');
    } catch (error) {
      this._updateStatus('Failed to configure Git', true);
      const errorBody = new Widget({ node: document.createElement('div') });
      errorBody.node.textContent = 'Failed to configure Git. Please check your inputs.';
      await showDialog({
        title: 'Configuration Error',
        body: errorBody,
        buttons: [Dialog.okButton()]
      });
    }
  }


  private async _onCreateCommit(): Promise<void> {
    const dialog = new CommitMessageDialog();
    const result = await showDialog({
      title: 'Push Commit',
      body: dialog,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Commit' })]
    });

    if (result.button.label !== 'Commit') {
      this._updateStatus('Ready');
      return;
    }

    const commitMessage = dialog.getCommitMessage().trim();
    if (!commitMessage) {
      this._updateStatus('Missing commit message', true);
      const body = new Widget({ node: document.createElement('div') });
      body.node.textContent = 'Please provide a commit message.';
      await showDialog({
        title: 'Invalid Input',
        body,
        buttons: [Dialog.okButton()]
      });
      return;
    }

    this._updateStatus('Creating commit...');
    await createAndPushCommit(
      { commit_message: commitMessage },
      async (githubUrl, pranayUrl) => {
        if (githubUrl) {
          this._showCommitDialog(githubUrl, pranayUrl);
        }
      }
    );
    this._updateStatus('Ready');
  }


  private async _onRefresh(): Promise<void> {
    this._updateStatus('Resetting config...');
    try {
        await resetConfigureGit();
        this._updateStatus('Reset Git configured successfully');
      } catch (error) {
        this._updateStatus('Failed to reseet configure Git', true);
      }
  }


  private _showCommitDialog(githubUrl?: string, pranayUrl?: string): void {
    const body = new CommitPushed(githubUrl, pranayUrl);
    void showDialog({
      title: 'Commit Created',
      body,
      buttons: [Dialog.okButton()]
    });
  }
}
