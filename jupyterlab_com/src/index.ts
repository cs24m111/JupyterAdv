import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Widget } from '@lumino/widgets';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

// Import CSS
import '../style/index.css';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_comments:plugin',
  autoStart: true,
  requires: [ICommandPalette, IMainMenu, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    mainMenu: IMainMenu,
    notebookTracker: INotebookTracker
  ) => {
    console.log('✅ JupyterLab extension jupyterlab_comments is activated!');

    const createCommentsWidget = (cellId: string, username: string) => {
      const commentsWidget = new Widget();
      commentsWidget.id = `comments-widget-${cellId}`;
      commentsWidget.title.label = `Comments for Cell ${cellId}`;
      commentsWidget.title.closable = true;
      commentsWidget.addClass('jp-CommentsWidget');

      const content = document.createElement('div');
      content.style.padding = '10px';
      content.innerHTML = `
        <h3>Comments for Cell ${cellId}</h3>
        <input type="text" id="comment-input-${cellId}" placeholder="Add a comment..." style="width: 100%; margin-bottom: 10px;" />
        <button id="add-btn-${cellId}">Add</button>
        <ul id="comments-list-${cellId}"></ul>
      `;
      commentsWidget.node.appendChild(content);

      const addButton = content.querySelector(`#add-btn-${cellId}`);
      const commentInput = content.querySelector(`#comment-input-${cellId}`) as HTMLInputElement;
      const commentsList = content.querySelector(`#comments-list-${cellId}`);

      const fetchComments = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/comments/${cellId}`, {
            headers: { 'x-username': username }
          });
          const comments = await response.json();

          commentsList!.innerHTML = ''; // Clear previous comments

          comments.forEach((comment: any) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${comment.user || 'Unknown'}</strong> <em>(${comment.timestamp})</em>: ${comment.comment || ''}`;
            if (comment.parentId) li.style.marginLeft = '20px';
            commentsList?.appendChild(li);
          });
        } catch (err) {
          console.error(`Error fetching comments for cell ${cellId}:`, err);
        }
      };
      fetchComments();

      addButton?.addEventListener('click', async () => {
        const commentText = commentInput.value.trim();
        if (!commentText) return;

        const newComment = {
          comment: commentText,
          cellId,
          parentId: null
        };

        try {
          const response = await fetch('http://localhost:3001/api/add-comment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-username': username
            },
            body: JSON.stringify(newComment)
          });
          const data = await response.json();
          const li = document.createElement('li');
          li.innerHTML = `<strong>${data.user}</strong> <em>(${data.timestamp})</em>: ${data.comment}`;
          commentsList?.appendChild(li);
          commentInput.value = '';
        } catch (err) {
          console.error(`Failed to add comment for cell ${cellId}:`, err);
        }
      });

      return commentsWidget;
    };

    notebookTracker.currentChanged.connect((sender, panel: NotebookPanel | null) => {
      if (panel) {
        const activeCell = panel.content.activeCell;
        if (activeCell) {
          const cellIndex = panel.content.widgets.indexOf(activeCell);
          const cellId = cellIndex !== -1 ? cellIndex.toString() : 'unknown';
          const username = 'authorized_user'; // Must match backend auth
          const commentsWidgets = [...app.shell.widgets('right')];
          const existingWidget = commentsWidgets.find(w => w.id === `comments-widget-${cellId}`);

          if (existingWidget) {
            app.shell.activateById(existingWidget.id);
          } else {
            const newWidget = createCommentsWidget(cellId, username);
            app.shell.add(newWidget, 'right', { mode: 'split-right' });
          }
        }
      } else {
        console.log('No active notebook panel');
      }
    });

    const command = 'comments:open';
    app.commands.addCommand(command, {
      label: 'Show Comments',
      execute: () => {
        const currentWidget = notebookTracker.currentWidget;
        if (!currentWidget || !currentWidget.content) {
          console.warn('No active notebook or content available.');
          return;
        }

        const activeCell = currentWidget.content.activeCell;
        if (!activeCell) {
          console.warn('No active cell in the current notebook.');
          return;
        }

        const cellIndex = currentWidget.content.widgets.indexOf(activeCell);
        const cellId = cellIndex !== -1 ? cellIndex.toString() : 'unknown';
        const username = 'authorized_user';
        const commentsWidgets = [...app.shell.widgets('right')];
        const existingWidget = commentsWidgets.find(w => w.id === `comments-widget-${cellId}`);

        if (existingWidget) {
          app.shell.activateById(existingWidget.id);
        } else {
          const newWidget = createCommentsWidget(cellId, username);
          app.shell.add(newWidget, 'right', { mode: 'split-right' });
        }
      }
    });

    palette.addItem({ command, category: 'Comments' });
    mainMenu.viewMenu.addGroup([{ command }], 10);
  }
};

export default extension;
