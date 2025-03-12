import { Dialog, showDialog, InputDialog } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { ISharedText } from '@jupyter/ydoc';
import aiClient from './ai-client';

/**
 * Generates code from a user-provided description and inserts it into the active code cell.
 * @param notebookPanel The current notebook panel
 */
export async function generateCodeFromDescription(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  // Check if there’s an active cell and it’s a code cell
  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Prompt user for a description
  const result = await InputDialog.getText({
    title: 'Generate Code from Description',
    placeholder: 'Enter your description'
  });

  // If the user provides a description, generate and insert the code
  if (result.button.accept && result.value) {
    const description = result.value;
    try {
      const generatedCode = await aiClient.generateCode(description);
      const sharedModel = activeCell.model.sharedModel as ISharedText;
      sharedModel.setSource(generatedCode); // Update cell content using sharedModel
    } catch (error) {
      await showDialog({
        title: 'Error',
        body: `Failed to generate code: ${(error as Error).message}`,
        buttons: [Dialog.okButton()]
      });
    }
  }
}

/**
 * Explains the selected code in the active cell and inserts the explanation as a markdown cell.
 * @param notebookPanel The current notebook panel
 */
export async function explainSelectedCode(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  // Check if there’s an active code cell
  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Ensure the editor is available
  if (!activeCell.editor) {
    await showDialog({
      title: 'Error',
      body: 'No editor available for the selected cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Get the selected code from the editor
  const editor = activeCell.editor as CodeMirrorEditor;
  const selection = editor.editor.state.selection.main;
  const selectedCode = selection.from !== selection.to 
    ? editor.editor.state.sliceDoc(selection.from, selection.to) 
    : '';

  // Check if code is selected
  if (!selectedCode) {
    await showDialog({
      title: 'Error',
      body: 'Please select some code to explain.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  try {
    const explanation = await aiClient.explainCode(selectedCode);

    // Ensure notebook model is available
    if (!notebook.model) {
      await showDialog({
        title: 'Error',
        body: 'Notebook model is not available.',
        buttons: [Dialog.okButton()]
      });
      return;
    }

    // Insert a new markdown cell with the explanation
    notebook.model.sharedModel.insertCell(notebook.activeCellIndex + 1, {
      cell_type: 'markdown',
      source: explanation
    });
  } catch (error) {
    await showDialog({
      title: 'Error',
      body: `Failed to explain code: ${(error as Error).message}`,
      buttons: [Dialog.okButton()]
    });
  }
}