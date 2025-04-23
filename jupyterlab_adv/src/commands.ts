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


async function showStatisticsDashboard(stats: {
  totalCells: number;
  codeCells: number;
  markdownCells: number;
  rawCells: number;
  totalLines: number;
  executedCells: number;
  libraries: Set<string>;
}) {
  const dialog = new Dialog({
    title: 'Notebook Statistics',
    body: new Widget(),
    buttons: [Dialog.okButton()]
  });

  const content = dialog.node.querySelector('.jp-Dialog-content');
  if (content) {
    content.innerHTML = `
      <style>
        .stats-container { padding: 15px; font-family: Arial, sans-serif; line-height: 1.6; }
        .stats-list { list-style: none; padding: 0; margin: 0; }
        .stats-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
        .stats-list li:last-child { border-bottom: none; }
        .chart-container { margin-top: 20px; }
        h3 { margin: 0 0 10px 0; color: #0056d2; }
      </style>
      <div class="stats-container">
        <h3>Notebook Statistics</h3>
        <ul class="stats-list">
          <li>Total Cells: ${stats.totalCells}</li>
          <li>Code Cells: ${stats.codeCells}</li>
          <li>Markdown Cells: ${stats.markdownCells}</li>
          <li>Raw Cells: ${stats.rawCells}</li>
          <li>Total Lines of Code: ${stats.totalLines}</li>
          <li>Executed Code Cells: ${stats.executedCells}</li>
          <li>Imported Libraries: ${Array.from(stats.libraries).join(', ') || 'None'}</li>
        </ul>
        <div class="chart-container">
          <canvas id="cellTypeChart" width="400" height="300"></canvas>
        </div>
      </div>
    `;

    const canvas = content.querySelector('#cellTypeChart') as HTMLCanvasElement;
    if (canvas) {
      new Chart(canvas.getContext('2d')!, {
        type: 'pie',
        data: {
          labels: ['Code Cells', 'Markdown Cells', 'Raw Cells'],
          datasets: [{
            data: [stats.codeCells, stats.markdownCells, stats.rawCells],
            backgroundColor: [
              'rgba(75, 192, 192, 0.4)',
              'rgba(255, 99, 132, 0.4)',
              'rgba(255, 206, 86, 0.4)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          plugins: { legend: { position: 'top' } }
        }
      });
    }
  }
  dialog.launch();
}
export async function showNotebookStatistics(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  if (!notebook.model) {
    await showDialog({
      title: 'Error',
      body: 'No notebook model available.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const kernel = notebookPanel.sessionContext.session?.kernel;
  if (!kernel) {
    await showDialog({
      title: 'Error',
      body: 'No kernel available.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Calculate basic statistics
  const cells = notebook.model.cells;
  const stats = {
    totalCells: cells.length,
    codeCells: 0,
    markdownCells: 0,
    rawCells: 0,
    totalLines: 0,
    executedCells: 0,
    libraries: new Set<string>()
  };

  for (let i = 0; i < cells.length; i++) {
    const cell = cells.get(i);
    if (cell.type === 'code') {
      stats.codeCells++;
      const code = cell.sharedModel.getSource();
      stats.totalLines += code.split('\n').length;
      if (cell.metadata && typeof (cell.metadata as any).get === 'function' && (cell.metadata as any).get('executionCount') !== undefined) {
        stats.executedCells++;
      }
      // Extract libraries (similar to showLibraryVersions)
      const importRegex = /(?:import\s+([\w, ]+)(?:\s+as\s+\w+)?|from\s+(\w+)\s+import\s+[\w, ]+)/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        const imports = (match[1] || match[2] || '').split(',').map(lib => lib.trim()).filter(lib => lib);
        imports.forEach(lib => stats.libraries.add(lib));
      }
    } else if (cell.type === 'markdown') {
      stats.markdownCells++;
    } else if (cell.type === 'raw') {
      stats.rawCells++;
    }
  }

  // Display the statistics dashboard
  await showStatisticsDashboard(stats);
}

function parseDependencyGraph(output: string): { nodes: number[]; edges: [number, number][] } | null {
  const startMarker = '===DEPENDENCY_GRAPH_START===';
  const endMarker = '===DEPENDENCY_GRAPH_END===';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  const graphOutput = output.substring(startIndex + startMarker.length, endIndex).trim();
  try {
    return JSON.parse(graphOutput);
  } catch (error) {
    console.error('Failed to parse dependency graph:', error);
    return null;
  }
}

async function showDependencyGraphDialog(graphData: { nodes: number[]; edges: [number, number][] }) {
  const dialog = new Dialog({
    title: 'Cell Dependency Graph',
    body: new Widget(),
    buttons: [Dialog.okButton()]
  });

  const content = dialog.node.querySelector('.jp-Dialog-content');
  if (content) {
    content.innerHTML = `
      <style>
        .graph-container { padding: 15px; font-family: Arial, sans-serif; }
        .graph-canvas { max-width: 600px; max-height: 400px; }
        h3 { margin: 0 0 10px 0; color: #0056d2; }
      </style>
      <div class="graph-container">
        <h3>Cell Dependency Graph</h3>
        <canvas id="dependencyGraph" width="600" height="400"></canvas>
      </div>
    `;

    const canvas = content.querySelector('#dependencyGraph') as HTMLCanvasElement;
    if (canvas) {
      // Use Chart.js to render a simple node-link diagram
      const nodes = graphData.nodes.map(idx => ({
        id: idx,
        label: `Cell ${idx + 1}`,
        x: Math.random() * 600, // Simplified layout
        y: Math.random() * 400
      }));
      const edges = graphData.edges.map(([from, to]) => ({
        source: nodes[from],
        target: nodes[to]
      }));

      new Chart(canvas.getContext('2d')!, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Nodes',
              data: nodes.map(node => ({ x: node.x, y: node.y })),
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              pointRadius: 10
            },
            {
              label: 'Edges',
              data: edges.flatMap((edge: { source: { x: number; y: number }; target: { x: number; y: number } }) => [
                { x: edge.source.x, y: edge.source.y },
                { x: edge.target.x, y: edge.target.y }
              ]),
              borderColor: 'rgba(255, 99, 132, 0.4)',
              showLine: true,
              pointRadius: 0
            }
          ]
        },
        options: {
          scales: {
            x: { display: false },
            y: { display: false }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  if (ctx.dataset.label === 'Nodes') {
                    return nodes[ctx.dataIndex].label;
                  }
                  return '';
                }
              }
            }
          }
        }
      });
    }
  }
  dialog.launch();
}

export async function generateDependencyGraph(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  if (!notebook.model) {
    await showDialog({
      title: 'Error',
      body: 'No notebook model available.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const kernel = notebookPanel.sessionContext.session?.kernel;
  if (!kernel) {
    await showDialog({
      title: 'Error',
      body: 'No kernel available.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Generate Python code to analyze variable definitions and usage
  const dependencyCode = `
import ast
import json

def analyze_cell_dependencies(cells):
    defined_vars = {}
    used_vars = {}
    dependencies = []

    for cell_idx, cell in enumerate(cells):
        defined_vars[cell_idx] = set()
        used_vars[cell_idx] = set()
        try:
            tree = ast.parse(cell)
            for node in ast.walk(tree):
                if isinstance(node, ast.Name):
                    if isinstance(node.ctx, ast.Store):
                        defined_vars[cell_idx].add(node.id)
                    elif isinstance(node.ctx, ast.Load):
                        used_vars[cell_idx].add(node.id)
        except SyntaxError:
            continue

    for cell_idx in range(len(cells)):
        for var in used_vars[cell_idx]:
            for prev_idx in range(cell_idx):
                if var in defined_vars[prev_idx]:
                    dependencies.append((prev_idx, cell_idx))
                    break

    return {'nodes': list(range(len(cells))), 'edges': dependencies}

cells = ${JSON.stringify(Array.from({ length: notebook.model?.cells.length || 0 }, (_, i) => notebook.model?.cells.get(i)?.sharedModel.getSource()))}
result = analyze_cell_dependencies(cells)
print("===DEPENDENCY_GRAPH_START===")
print(json.dumps(result, indent=2))
print("===DEPENDENCY_GRAPH_END===")
`;

  const future = kernel.requestExecute({ code: dependencyCode });
  let output = '';
  future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream' && (msg.content as any).name === 'stdout') {
      output += (msg.content as any).text;
    }
  };
  await future.done;

  // Parse the dependency graph data
  const graphData = parseDependencyGraph(output);
  if (!graphData) {
    await showDialog({
      title: 'Error',
      body: 'Failed to generate dependency graph.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Display the dependency graph
  await showDependencyGraphDialog(graphData);
}

function parseLibraryVersions(output: string): { library: string; version: string }[] {
  const startMarker = '===LIBRARY_VERSIONS_START===';
  const endMarker = '===LIBRARY_VERSIONS_END===';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return [];
  }

  const versionsOutput = output.substring(startIndex + startMarker.length, endIndex).trim();
  const lines = versionsOutput.split('\n').map(line => line.trim()).filter(line => line);
  return lines.map(line => {
    const [library, version] = line.split(':').map(part => part.trim());
    return { library, version };
  });
}

async function showLibraryVersionsDialog(versions: { library: string; version: string }[]) {
  const dialogBody = new Widget({ node: document.createElement('div') });
  dialogBody.node.innerHTML = `
    <style>
      .versions-container {
        padding: 15px;
        font-family: Arial, sans-serif;
        line-height: 1.6;
      }
      .versions-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .versions-list li {
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      .versions-list li:last-child {
        border-bottom: none;
      }
      h3 {
        margin: 0 0 10px 0;
        color: #0056d2;
      }
    </style>
    <div class="versions-container">
      <h3>Imported Library Versions</h3>
      <ul class="versions-list">
        ${versions.map(({ library, version }) => `<li><strong>${library}</strong>: ${version}</li>`).join('')}
      </ul>
    </div>
  `;

  await showDialog({
    title: 'Library Versions',
    body: dialogBody,
    buttons: [Dialog.okButton()]
  });
}

export async function showLibraryVersions(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  // Validate the active cell
  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const code = activeCell.model.sharedModel.getSource();
  if (!code.trim()) {
    await showDialog({
      title: 'Error',
      body: 'The code cell is empty.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Extract imported libraries using a simple regex (handles `import x`, `from x import y`, and `import x as z`)
  const importRegex = /(?:import\s+([\w, ]+)(?:\s+as\s+\w+)?|from\s+(\w+)\s+import\s+[\w, ]+)/g;
  const libraries = new Set<string>();
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const imports = (match[1] || match[2] || '').split(',').map(lib => lib.trim()).filter(lib => lib);
    imports.forEach(lib => libraries.add(lib));
  }

  if (libraries.size === 0) {
    await showDialog({
      title: 'No Libraries Found',
      body: 'No imported libraries detected in the active cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Generate Python code to check library versions
  const versionCheckCode = `
import pkg_resources
import sys

versions = {}
for lib in [${Array.from(libraries).map(lib => `'${lib}'`).join(', ')}]:
    try:
        module = sys.modules.get(lib) or __import__(lib)
        version = getattr(module, '__version__', None) or pkg_resources.get_distribution(lib).version
        versions[lib] = version
    except (ImportError, pkg_resources.DistributionNotFound, AttributeError):
        versions[lib] = 'Not installed or version unavailable'

print("===LIBRARY_VERSIONS_START===")
for lib, version in versions.items():
    print(f"{lib}: {version}")
print("===LIBRARY_VERSIONS_END===")
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

  // Execute the version check code
  const future = kernel.requestExecute({ code: versionCheckCode });
  let output = '';
  future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream' && (msg.content as any).name === 'stdout') {
      output += (msg.content as any).text;
    }
  };

  await future.done;

  // Parse the output to extract library versions
  const versions = parseLibraryVersions(output);
  if (versions.length === 0) {
    await showDialog({
      title: 'Error',
      body: 'Failed to retrieve library versions. The code may have errors or no versions were found.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Display the versions in a dialog
  await showLibraryVersionsDialog(versions);
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

function parsePlotMetadata(output: string): {
  title?: string;
  xlabel?: string;
  ylabel?: string;
  plot_type?: string;
  data?: any[];
  error?: string;
} | null {
  const startMarker = '===PLOT_METADATA_START===';
  const endMarker = '===PLOT_METADATA_END===';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  const metadataOutput = output.substring(startIndex + startMarker.length, endIndex).trim();
  try {
    return JSON.parse(metadataOutput);
  } catch (error) {
    console.error('Failed to parse plot metadata:', error);
    return null;
  }
}

async function showVisualizationReportDialog(report: string) {
  const dialogBody = new Widget({ node: document.createElement('div') });
  dialogBody.node.innerHTML = `
    <style>
      .report-container {
        padding: 15px;
        font-family: Arial, sans-serif;
        line-height: 1.6;
      }
      .report-container h1, .report-container h2, .report-container h3 {
        margin: 0 0 10px 0;
        color: #0056d2;
      }
      .report-container strong {
        font-weight: bold;
      }
      .report-container ul {
        list-style-type: disc;
        padding-left: 20px;
        margin: 10px 0;
      }
    </style>
    <div class="report-container">${convertMarkdownToHtml(report)}</div>
  `;

  await showDialog({
    title: 'Visualization Analysis Report',
    body: dialogBody,
    buttons: [Dialog.okButton()]
  });
}

export async function analyzeVisualizations(notebookPanel: NotebookPanel) {
  const notebook = notebookPanel.content;
  const activeCell = notebook.activeCell;

  // Validate the active cell
  if (!activeCell || activeCell.model.type !== 'code') {
    await showDialog({
      title: 'Error',
      body: 'Please select a code cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  const code = activeCell.model.sharedModel.getSource();
  if (!code.trim()) {
    await showDialog({
      title: 'Error',
      body: 'The code cell is empty.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Check if the code likely contains Matplotlib plotting
  if (!code.includes('matplotlib') && !code.includes('plt.')) {
    await showDialog({
      title: 'No Visualizations Found',
      body: 'No Matplotlib visualizations detected in the active cell.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Generate Python code to extract plot metadata
  const metadataCode = `
import matplotlib.pyplot as plt
import json

metadata = {
    'title': None,
    'xlabel': None,
    'ylabel': None,
    'plot_type': None,
    'data': None
}

try:
    # Assume the figure is already created in the cell
    fig = plt.gcf()
    axes = fig.get_axes()
    if axes:
        ax = axes[0]  // Analyze the first axis
        metadata['title'] = ax.get_title()
        metadata['xlabel'] = ax.get_xlabel()
        metadata['ylabel'] = ax.get_ylabel()
        // Attempt to infer plot type
        if any(isinstance(child, matplotlib.lines.Line2D) for child in ax.get_children()):
            metadata['plot_type'] = 'line'
        elif any(isinstance(child, matplotlib.patches.Rectangle) for child in ax.get_children()):
            metadata['plot_type'] = 'bar'
        elif any(isinstance(child, matplotlib.collections.PathCollection) for child in ax.get_children()):
            metadata['plot_type'] = 'scatter'
        // Extract data (simplified, assumes line or scatter plot)
        lines = ax.get_lines()
        if lines:
            data = [{'x': line.get_xdata().tolist(), 'y': line.get_ydata().tolist()} for line in lines]
            metadata['data'] = data
except Exception as e:
    metadata['error'] = str(e)

print("===PLOT_METADATA_START===")
print(json.dumps(metadata, indent=2))
print("===PLOT_METADATA_END===")
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

  // Execute the original code to ensure the plot is generated
  const future = kernel.requestExecute({ code });
  await future.done;

  // Execute the metadata extraction code
  const metadataFuture = kernel.requestExecute({ code: metadataCode });
  let metadataOutput = '';
  metadataFuture.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream' && (msg.content as any).name === 'stdout') {
      metadataOutput += (msg.content as any).text;
    }
  };
  await metadataFuture.done;

  // Parse the metadata output
  const metadata = parsePlotMetadata(metadataOutput);
  if (!metadata) {
    await showDialog({
      title: 'Error',
      body: 'Failed to extract plot metadata. Ensure the cell contains a valid Matplotlib plot.',
      buttons: [Dialog.okButton()]
    });
    return;
  }

  // Generate a report using the AI client
  const prompt = `
Analyze the following Matplotlib plot metadata and generate a detailed report in Markdown format. Include:
- A description of the plot type and its purpose.
- Insights about the axes labels and title.
- Observations about the data (e.g., trends, ranges, patterns).
- Potential improvements or issues with the visualization.

Metadata:
- Title: ${metadata?.title || 'None'}
- X-Label: ${metadata?.xlabel || 'None'}
- Y-Label: ${metadata?.ylabel || 'None'}
- Plot Type: ${metadata?.plot_type || 'Unknown'}
- Data: ${metadata ? JSON.stringify(metadata.data) || 'None' : 'None'}

Code:
${code}
  `;

  try {
    const report = await aiClient.explainCode(prompt); // Using explainCode for text analysis
    await showVisualizationReportDialog(report);
  } catch (error) {
    await showDialog({
      title: 'Error',
      body: `Failed to generate visualization report: ${(error as Error).message}`,
      buttons: [Dialog.okButton()]
    });
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