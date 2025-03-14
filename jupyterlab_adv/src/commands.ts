import { Dialog, showDialog, InputDialog, Spinner } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { ISharedText } from '@jupyter/ydoc';
import { KernelMessage } from '@jupyterlab/services';
import Chart from 'chart.js/auto';
import aiClient from './ai-client';
import { Widget } from '@lumino/widgets';

/**
 * Generates code from a user-provided description and inserts it into the active code cell.
 * @param notebookPanel The current notebook panel
 */
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

  // Add spinner for UI feedback
  const spinner = new Spinner();
  notebookPanel.content.node.appendChild(spinner.node);

  const future = kernel.requestExecute({ code: wrappedCode });
  let output = '';
  future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream' && (msg.content as any).name === 'stdout') {
      output += (msg.content as any).text;
    }
  };

  await future.done;
  spinner.dispose();

  const metrics = parseMetrics(output);
  if (metrics) {
    showPerformanceDialog(metrics);
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
 * Displays performance metrics in a dialog with multiple charts and a summary.
 * @param metrics The performance metrics to display
 */
function showPerformanceDialog(metrics: {
  wallTime: number;
  cpuTime: number;
  memoryUsed: number;
  ioReadCount?: number;
  ioWriteCount?: number;
}) {
  const dialog = new Dialog({
    title: 'Performance Metrics',
    body: new Widget(),
    buttons: [Dialog.okButton()]
  });

  const content = dialog.node.querySelector('.jp-Dialog-content');
  if (content) {
    let html = `
      <style>
        .metrics-section { margin: 10px 0; }
        .metrics-list { list-style: none; padding: 0; }
        .metrics-list li { padding: 5px 0; }
        .chart-container { margin-top: 20px; }
        .summary { background: #f0f8ff; padding: 10px; border-radius: 5px; }
      </style>
      <div class="metrics-section">
        <h3>Performance Summary</h3>
        <div class="summary">
          The code executed in ${metrics.wallTime.toFixed(2)} seconds, using ${metrics.cpuTime.toFixed(2)} seconds of CPU time.
          It used approximately ${metrics.memoryUsed.toFixed(2)} MB of memory.
          ${metrics.ioReadCount !== undefined ? `It performed ${metrics.ioReadCount} I/O reads and ${metrics.ioWriteCount} I/O writes.` : ''}
        </div>
      </div>
      <div class="metrics-section">
        <h4>Detailed Metrics</h4>
        <ul class="metrics-list">
          <li>Wall Time: ${metrics.wallTime.toFixed(4)} seconds</li>
          <li>CPU Time: ${metrics.cpuTime.toFixed(4)} seconds</li>
          <li>Memory Used: ${metrics.memoryUsed.toFixed(2)} MB (approximation)</li>
          ${metrics.ioReadCount !== undefined ? `<li>I/O Read Count: ${metrics.ioReadCount}</li>` : ''}
          ${metrics.ioWriteCount !== undefined ? `<li>I/O Write Count: ${metrics.ioWriteCount}</li>` : ''}
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
            backgroundColor: ['rgba(75, 192, 192, 0.2)', 'rgba(255, 99, 132, 0.2)'],
            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } }
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
            backgroundColor: ['rgba(255, 206, 86, 0.2)'],
            borderColor: ['rgba(255, 206, 86, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } }
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
              backgroundColor: ['rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)'],
              borderColor: ['rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'],
              borderWidth: 1
            }]
          },
          options: {
            scales: { y: { beginAtZero: true } }
          }
        });
      }
    }
  }
  dialog.launch();
}