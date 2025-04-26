import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { vcsSidebar } from './sidebar';
import { requestAPI } from './handler';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

/**
 * Initialization data for the @pranay/jupyterlab_vcs extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@pranay/jupyterlab_vcs:plugin',
  description: 'JupyterLab extension to create GitHub pull requests & commits.',
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    console.log('vcs extension is activated!');

    try {
      // Verify server extension is available
      const data = await requestAPI<any>('get-example');
      console.log('Server extension response:', data);

      // Initialize and add sidebar
      const sidebar = new vcsSidebar();
      app.shell.add(sidebar, 'left', { rank: 600 });
    } catch (error) {
      console.error('Failed to initialize vcs extension:', error);
      // Show error dialog to user
      const body = new Widget({ node: document.createElement('div') });
      body.node.textContent = 'The vcs server extension is unavailable. Please check your setup.';
      await showDialog({
        title: 'vcs Initialization Error',
        body,
        buttons: [Dialog.okButton()]
      });
    }
  }
};

export default plugin;