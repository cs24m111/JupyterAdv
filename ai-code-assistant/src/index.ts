import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { INotebookTracker } from '@jupyterlab/notebook';

import { generateCodeFromDescription, explainSelectedCode } from './commands';

/**
 * Initialization data for the ai-code-assistant extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'ai-code-assistant:plugin',
  description: 'A JupyterLab extension with AI-powered code assistant.',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    notebookTracker: INotebookTracker
  ) => {
    console.log('JupyterLab extension ai-code-assistant is activated!');

    // Command to generate code from description
    const generateCommand = 'ai:generate-code';
    app.commands.addCommand(generateCommand, {
      label: 'Generate Code from Description',
      execute: () => {
        const current = notebookTracker.currentWidget;
        if (current) {
          generateCodeFromDescription(current);
        } else {
          console.warn('No active notebook found.');
        }
      }
    });
    palette.addItem({ command: generateCommand, category: 'AI Assistant' });

    // Command to explain selected code
    const explainCommand = 'ai:explain-code';
    app.commands.addCommand(explainCommand, {
      label: 'Explain Selected Code',
      execute: () => {
        const current = notebookTracker.currentWidget;
        if (current) {
          explainSelectedCode(current);
        } else {
          console.warn('No active notebook found.');
        }
      }
    });
    palette.addItem({ command: explainCommand, category: 'AI Assistant' });
  }
};

export default plugin;