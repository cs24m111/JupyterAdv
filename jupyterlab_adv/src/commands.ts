import { Dialog, showDialog, InputDialog } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { ISharedText } from '@jupyter/ydoc';
import { KernelMessage } from '@jupyterlab/services';
import Chart from 'chart.js/auto';
import aiClient from './ai-client';
import { Widget } from '@lumino/widgets';
import { predictExecutionTime, predictErrors } from './predictive';
import { suggestTypes } from './type-inference';
import { suggestNextWorkflowStep } from './workflow';
import { predictParameterImpact } from './parameter-impact';
import { debounce } from 'lodash';
import { Panel } from '@lumino/widgets';

/**
 * Generates code from a user-provided description and inserts it into the active code cell.
 * @param notebookPanel The current notebook panel
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(\n<li>.*<\/li>)+/g, '<ul>$&</ul>')
    .replace(/\n/g, '<br>');

  // Ensure standalone text is wrapped properly
  html = html.replace(/(^[^<].*?(?=<|$))/gm, '<p>$1</p>');
  return html;
}

let floatingPanel: Panel | null = null;

function showFloatingPanel(issues: string) {
  if (!floatingPanel) {
    floatingPanel = new Panel();
    floatingPanel.id = 'error-feedback-panel';
    floatingPanel.title.label = 'Potential Errors';
    floatingPanel.addClass('floating-panel');
    document.body.appendChild(floatingPanel.node);
  }
  floatingPanel.node.innerHTML = issues; // Assume issues are in HTML or Markdown format
  floatingPanel.show();
}

const debouncedDetectErrors = debounce(async (code: string) => {
  try {
    const issues = await aiClient.detectErrors(code); // Assume aiClient is defined
    showFloatingPanel(issues);
  } catch (error) {
    console.error('Error detecting issues:', error);
  }
}, 1000); // 1-second debounce

export function setupRealTimeFeedback(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  notebook.model?.cells.changed.connect(() => {
    const activeCell = notebook.activeCell;
    if (activeCell && activeCell.model.type === 'code') {
      const code = activeCell.model.sharedModel.getSource();
      debouncedDetectErrors(code);
    }
  });
}

export async function detectAndResolveErrors(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  // Validate the active cell
  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({ title: 'Error', body: 'Please select a code cell.', buttons: [Dialog.okButton()] });
    return;
  }

  const code = activeCell.model.sharedModel.getSource();
  if (!code.trim()) {
    await showDialog({ title: 'Error', body: 'The code cell is empty.', buttons: [Dialog.okButton()] });
    return;
  }

  try {
    // Step 1: Detect errors
    const issues = await aiClient.detectErrors(code);
    const dialogBody = new Widget({ node: document.createElement('div') });
    dialogBody.node.innerHTML = `
      <style>
        .error-report { padding: 15px; font-family: Arial, sans-serif; line-height: 1.6; }
        .error-report h1, .error-report h2, .error-report h3 { margin: 0 0 10px 0; color: #0056d2; }
        .error-report strong { font-weight: bold; }
        .error-report ul { list-style-type: disc; padding-left: 20px; margin: 10px 0; }
      </style>
      <div class="error-report">${convertMarkdownToHtml(issues)}</div>
    `;

    const result = await showDialog({
      title: 'Potential Runtime Errors',
      body: dialogBody,
      buttons: [Dialog.okButton({ label: 'Apply Patches' }), Dialog.cancelButton()]
    });

    // Step 2: Generate and display patches if the user opts in
    if (result.button.accept) {
      const patches = (await Promise.all(issues.split('\n').map(async (issue) => {
        if (issue.startsWith('- ')) {
          const patch = await aiClient.suggestPatch(code, issue.substring(2));
          return { issue: issue.substring(2), patch };
        }
        return null;
      }))).filter((patch): patch is { issue: string; patch: string } => patch !== null);

      const patchDialogBody = new Widget({ node: document.createElement('div') });
      patchDialogBody.node.innerHTML = patches.map(({ issue, patch }) => `
        <div>
          <h3>Issue: ${issue}</h3>
          <pre>${patch}</pre>
        </div>
      `).join('');

      await showDialog({
        title: 'Suggested Patches',
        body: patchDialogBody,
        buttons: [Dialog.okButton()]
      });
    }
  } catch (error) {
    await showDialog({ title: 'Error', body: `Failed to detect errors: ${(error as Error).message}`, buttons: [Dialog.okButton()] });
  }
}
export async function detectBugsInCell(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  // Check if the active cell is a code cell
  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const code = activeCell.model.sharedModel.getSource();

  // Check if the code is empty
  if (!code.trim()) {
    await showDialog({
      title: 'Error',
      body: 'The code cell is empty.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  try {
    const issues = await aiClient.detectBugs(code);
    const dialogBody = new Widget({ node: document.createElement('div') });
    dialogBody.node.innerHTML = `
      <style>
        .bug-report {
          padding: 15px;
          font-family: Arial, sans-serif;
          line-height: 1.6;
        }
        .bug-report h1, .bug-report h2, .bug-report h3 {
          margin: 0 0 10px 0;
          color: #0056d2;
        }
        .bug-report strong {
          font-weight: bold;
        }
        .bug-report ul {
          list-style-type: disc;
          padding-left: 20px;
          margin: 10px 0;
        }
      </style>
      <div class="bug-report">${convertMarkdownToHtml(issues)}</div>
    `;

    await showDialog({
      title: 'Potential Bugs',
      body: dialogBody,
      buttons: [Dialog.okButton()]
    });
  } catch (error) {
    await showDialog({
      title: 'Error',
      body: `Failed to detect bugs: ${(error as Error).message}`,
      buttons: [Dialog.okButton()]
    });
  }
}

export async function generateCodeFromDescription(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const result = await InputDialog.getText({
    title: 'Generate Code from Description',
    placeholder: 'Enter your description'
  });

  if (result.button.accept && result.value) {
    const description = result.value;
    try {
      const generatedCode = await aiClient.generateCode(description);
      const sharedModel = activeCell.model.sharedModel as ISharedText;
      sharedModel.setSource(generatedCode);
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

  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  if (!activeCell.editor) {
    await showDialog({
      title: 'Error',
      body: 'No editor available for the selected cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const editor = activeCell.editor as CodeMirrorEditor;
  const selection = editor.editor.state.selection.main;
  const selectedCode = selection.from !== selection.to 
    ? editor.editor.state.sliceDoc(selection.from, selection.to) 
    : '';

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
    if (!notebook.model) {
      await showDialog({
        title: 'Error',
        body: 'Notebook model is not available.',
        buttons: [Dialog.okButton()]
      });
      return;
    }
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

/**
 * Measures performance metrics for the active code cell and displays them.
 * @param notebookPanel The current notebook panel
 */
export async function measurePerformance(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const code = activeCell.model.sharedModel.getSource();
  const wrappedCode = `
import time
import resource
try:
    import psutil
    process = psutil.Process()
    start_io = process.io_counters()
except ImportError:
    psutil = None
    start_io = None
try:
    from memory_profiler import memory_usage
except ImportError:
    memory_usage = None

start_wall_time = time.time()
start_cpu_time = time.process_time()
if memory_usage:
    start_memory = memory_usage()[0]
else:
    start_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss

${code}

end_wall_time = time.time()
end_cpu_time = time.process_time()
if memory_usage:
    end_memory = memory_usage()[0]
else:
    end_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
if psutil:
    end_io = process.io_counters()
    io_read_count = end_io.read_count - start_io.read_count
    io_write_count = end_io.write_count - start_io.write_count
else:
    io_read_count = None
    io_write_count = None

wall_time = end_wall_time - start_wall_time
cpu_time = end_cpu_time - start_cpu_time
memory_used = end_memory - start_memory

print("===PERFORMANCE_METRICS_START===")
print(f"Wall time: {wall_time:.4f}")
print(f"CPU time: {cpu_time:.4f}")
print(f"Memory used: {memory_used}")
if io_read_count is not None:
    print(f"I/O read count: {io_read_count}")
    print(f"I/O write count: {io_write_count}")
print("===PERFORMANCE_METRICS_END===")
`;

  const kernel = notebookPanel.sessionContext.session?.kernel;
  if (!kernel) {
    await showDialog({
      title: 'Error',
      body: 'No kernel available.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const future = kernel.requestExecute({ code: wrappedCode });
  let output = '';
  future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream' && (msg.content as any).name === 'stdout') {
      output += (msg.content as any).text;
    }
  };

  await future.done;
  const metrics = parseMetrics(output);
  if (metrics) {
    await showPerformanceDialog(metrics);
  } else {
    await showDialog({
      title: 'Error',
      body: 'Failed to parse performance metrics. The code may have errors.',
      buttons: [Dialog.okButton()]
    });
  }
}

/**
 * Parses the kernel output to extract performance metrics.
 * @param output The output from the kernel
 * @returns Metrics object or null if parsing fails
 */
function parseMetrics(output: string): {
  wallTime: number;
  cpuTime: number;
  memoryUsed: number;
  ioReadCount?: number;
  ioWriteCount?: number;
} | null {
  const startMarker = '===PERFORMANCE_METRICS_START===';
  const endMarker = '===PERFORMANCE_METRICS_END===';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  const metricsOutput = output.substring(startIndex + startMarker.length, endIndex).trim();
  const lines = metricsOutput.split('\n');

  const wallTimeLine = lines.find(line => line.startsWith('Wall time:'));
  const cpuTimeLine = lines.find(line => line.startsWith('CPU time:'));
  const memoryLine = lines.find(line => line.startsWith('Memory used:'));
  const ioReadLine = lines.find(line => line.startsWith('I/O read count:'));
  const ioWriteLine = lines.find(line => line.startsWith('I/O write count:'));

  if (!wallTimeLine || !cpuTimeLine || !memoryLine) return null;

  const metrics = {
    wallTime: parseFloat(wallTimeLine.split(':')[1].trim()),
    cpuTime: parseFloat(cpuTimeLine.split(':')[1].trim()),
    memoryUsed: parseFloat(memoryLine.split(':')[1].trim()),
    ioReadCount: ioReadLine ? parseInt(ioReadLine.split(':')[1].trim(), 10) : undefined,
    ioWriteCount: ioWriteLine ? parseInt(ioWriteLine.split(':')[1].trim(), 10) : undefined
  };

  return metrics;
}

/**
 * Generates a summary report in Markdown format using the Gemini AI API.
 * @param metrics The performance metrics to summarize
 * @returns A Markdown-formatted summary string
 */
async function generateSummary(metrics: {
  wallTime: number;
  cpuTime: number;
  memoryUsed: number;
  ioReadCount?: number;
  ioWriteCount?: number;
}): Promise<string> {
  const prompt = `
    Provide a performance summary in Markdown format for the following metrics:
    - Wall Time: ${metrics.wallTime.toFixed(4)} seconds
    - CPU Time: ${metrics.cpuTime.toFixed(4)} seconds
    - Memory Used: ${metrics.memoryUsed.toFixed(2)} MB
    ${metrics.ioReadCount !== undefined ? `- I/O Read Count: ${metrics.ioReadCount}` : ''}
    ${metrics.ioWriteCount !== undefined ? `- I/O Write Count: ${metrics.ioWriteCount}` : ''}
    Include headings, bold text, and bullet points where appropriate, and highlight potential performance issues.
  `;

  try {
    const summary = await aiClient.explainCode(prompt); // Assuming explainCode can handle general text prompts
    return summary || '## Summary\nFailed to generate summary from Gemini AI.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return `## Summary\nFailed to generate summary: ${(error as Error).message}`;
  }
}

/**
 * Displays performance metrics in a dialog with multiple charts and a Markdown-formatted summary.
 * @param metrics The performance metrics to display
 */
async function showPerformanceDialog(metrics: {
  wallTime: number;
  cpuTime: number;
  memoryUsed: number;
  ioReadCount?: number;
  ioWriteCount?: number;
}) {
  const summary = await generateSummary(metrics);

  const dialog = new Dialog({
    title: 'Performance Metrics',
    body: new Widget(),
    buttons: [Dialog.okButton()]
  });

  const content = dialog.node.querySelector('.jp-Dialog-content');
  if (content) {
    let html = `
      <style>
        .metrics-container { 
          max-height: 500px; 
          overflow-y: auto; 
          padding: 10px; 
          font-family: Arial, sans-serif; 
        }
        .metrics-section { 
          margin: 15px 0; 
          border: 1px solid #e0e0e0; 
          border-radius: 5px; 
          padding: 10px; 
          background: #fafafa; 
        }
        .metrics-list { 
          list-style: none; 
          padding: 0; 
          margin: 0; 
        }
        .metrics-list li { 
          padding: 8px 0; 
          border-bottom: 1px solid #eee; 
        }
        .metrics-list li:last-child { 
          border-bottom: none; 
        }
        .chart-container { 
          margin-top: 20px; 
          padding: 10px; 
          background: #fff; 
          border: 1px solid #ddd; 
          border-radius: 5px; 
        }
        .summary { 
          padding: 15px; 
          border-radius: 5px; 
          background: #f0f8ff; 
          line-height: 1.6; 
        }
        .summary h1, .summary h2, .summary h3 { 
          margin: 0 0 10px 0; 
          color: #0056d2; 
        }
        .summary strong { 
          font-weight: bold; 
        }
        .summary ul { 
          list-style-type: disc; 
          padding-left: 20px; 
          margin: 10px 0; 
        }
        h3, h4 { 
          margin: 0 0 10px 0; 
          color: #0056d2; 
        }
      </style>
      <div class="metrics-container">
        <div class="metrics-section">
          <h3>Performance Summary</h3>
          <div class="summary">${convertMarkdownToHtml(summary)}</div>
        </div>
        <div class="metrics-section">
          <h4>Detailed Metrics</h4>
          <ul class="metrics-list">
            <li><strong>Wall Time:</strong> ${metrics.wallTime.toFixed(4)} seconds</li>
            <li><strong>CPU Time:</strong> ${metrics.cpuTime.toFixed(4)} seconds</li>
            <li><strong>Memory Used:</strong> ${metrics.memoryUsed.toFixed(2)} MB (approximation)</li>
            ${metrics.ioReadCount !== undefined ? `<li><strong>I/O Read Count:</strong> ${metrics.ioReadCount}</li>` : ''}
            ${metrics.ioWriteCount !== undefined ? `<li><strong>I/O Write Count:</strong> ${metrics.ioWriteCount}</li>` : ''}
          </ul>
        </div>
        <div class="chart-container">
          <h4>Time Metrics</h4>
          <canvas id="timeChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-container">
          <h4>Memory Metrics</h4>
          <canvas id="memoryChart" width="400" height="200"></canvas>
        </div>
        ${metrics.ioReadCount !== undefined || metrics.ioWriteCount !== undefined ? `
        <div class="chart-container">
          <h4>I/O Metrics</h4>
          <canvas id="ioChart" width="400" height="200"></canvas>
        </div>
        ` : ''}
      </div>
    `;
    content.innerHTML = html;

    // Time Chart
    const timeCanvas = content.querySelector('#timeChart') as HTMLCanvasElement;
    if (timeCanvas) {
      new Chart(timeCanvas.getContext('2d')!, {
        type: 'bar',
        data: {
          labels: ['Wall Time', 'CPU Time'],
          datasets: [{
            label: 'Time (seconds)',
            data: [metrics.wallTime, metrics.cpuTime],
            backgroundColor: ['rgba(75, 192, 192, 0.4)', 'rgba(255, 99, 132, 0.4)'],
            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          scales: { y: { beginAtZero: true, title: { display: true, text: 'Seconds' } } },
          plugins: { legend: { display: false } }
        }
      });
    }

    // Memory Chart
    const memoryCanvas = content.querySelector('#memoryChart') as HTMLCanvasElement;
    if (memoryCanvas) {
      new Chart(memoryCanvas.getContext('2d')!, {
        type: 'bar',
        data: {
          labels: ['Memory Used (MB)'],
          datasets: [{
            label: 'Memory',
            data: [metrics.memoryUsed],
            backgroundColor: ['rgba(255, 206, 86, 0.4)'],
            borderColor: ['rgba(255, 206, 86, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          scales: { y: { beginAtZero: true, title: { display: true, text: 'Megabytes' } } },
          plugins: { legend: { display: false } }
        }
      });
    }

    // I/O Chart
    if (metrics.ioReadCount !== undefined || metrics.ioWriteCount !== undefined) {
      const ioCanvas = content.querySelector('#ioChart') as HTMLCanvasElement;
      if (ioCanvas) {
        const labels = [];
        const data = [];
        if (metrics.ioReadCount !== undefined) {
          labels.push('I/O Reads');
          data.push(metrics.ioReadCount);
        }
        if (metrics.ioWriteCount !== undefined) {
          labels.push('I/O Writes');
          data.push(metrics.ioWriteCount);
        }
        new Chart(ioCanvas.getContext('2d')!, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'I/O Operations',
              data,
              backgroundColor: ['rgba(153, 102, 255, 0.4)', 'rgba(255, 159, 64, 0.4)'],
              borderColor: ['rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'],
              borderWidth: 1
            }]
          },
          options: {
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
  }
  dialog.launch();
}

/**
 * Converts basic Markdown to HTML for display in the dialog.
 * @param markdown The Markdown text to convert
 * @returns HTML string
 */

export async function predictCodeBehavior(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({ title: 'Error', body: 'Please select a code cell.', buttons: [Dialog.okButton()] });
    return;
  }

  const code = activeCell.model.sharedModel.getSource();
  let execTime: string, errors: string, types: string, workflow: string, paramImpact: string;
  try { execTime = await predictExecutionTime(code) || 'Not available'; } catch (e: any) { execTime = `Error: ${e.message}`; }
  try { errors = await predictErrors(code) || 'Not available'; } catch (e: any) { errors = `Error: ${e.message}`; }
  try { types = await suggestTypes(code) || 'Not available'; } catch (e: any) { types = `Error: ${e.message}`; }
  try { workflow = await suggestNextWorkflowStep(code) || 'Not available'; } catch (e: any) { workflow = `Error: ${e.message}`; }
  try { paramImpact = await predictParameterImpact(code) || 'Not available'; } catch (e: any) { paramImpact = `Error: ${e.message}`; }

  const markdownReport = `
## Code Behavior Predictions

- **Predicted Execution Time**: ${execTime}
- **Error Likelihood**: ${errors}
- **Type Suggestions**: ${types}
- **Next Workflow Step**: ${workflow}
- **Parameter Impact**: ${paramImpact}
  `;

  const dialogBody = new Widget({ node: document.createElement('div') });
  dialogBody.node.innerHTML = `
    <style>
      .prediction-report { 
        padding: 15px; 
        font-family: Arial, sans-serif; 
        line-height: 1.6; 
      }
      .prediction-report h1, .prediction-report h2, .prediction-report h3 { 
        margin: 0 0 10px 0; 
        color: #0056d2; 
      }
      .prediction-report strong { 
        font-weight: bold; 
      }
      .prediction-report ul { 
        list-style-type: disc; 
        padding-left: 20px; 
        margin: 10px 0; 
      }
    </style>
    <div class="prediction-report">${convertMarkdownToHtml(markdownReport)}</div>
  `;

  await showDialog({
    title: 'Code Behavior Predictions',
    body: dialogBody,
    buttons: [Dialog.okButton()]
  });
}

