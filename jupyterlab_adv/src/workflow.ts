import aiClient from './ai-client';

export async function suggestNextWorkflowStep(code: string): Promise<string> {
  const hasDataLoad = /pandas\.read_/.test(code);
  const hasModel = /sklearn\./.test(code);
  const heuristic = hasDataLoad ? 'Next: Clean data (e.g., df.dropna())' : hasModel ? 'Next: Evaluate model' : 'Next: Load data';

  const prompt = `Suggest the next workflow step for this Python code:\n${code}\nProvide a brief suggestion.`;
  try {
    const aiPrediction = await aiClient.predictInsight(prompt);
    return `${heuristic}; ${aiPrediction} (AI)`;
  } catch {
    return heuristic;
  }
}