import aiClient from './ai-client';

export async function predictExecutionTime(code: string): Promise<string> {
  const lines = code.split('\n').length;
  const loops = (code.match(/(for|while)/g) || []).length;
  const heuristicTime = (lines * 0.01 + loops * 0.5).toFixed(2); // Simple heuristic

  const prompt = `Estimate execution time for this Python code:\n${code}\nProvide a brief prediction in seconds.`;
  try {
    const aiPrediction = await aiClient.predictInsight(prompt);
    return `${heuristicTime} seconds (heuristic), ${aiPrediction} (AI)`;
  } catch {
    return `${heuristicTime} seconds (heuristic)`;
  }
}

export async function predictErrors(code: string): Promise<string> {
  const undefinedVars = code.match(/\b\w+\b(?!\s*=)/g)?.filter(w => !code.includes(`${w} =`)) || [];
  const heuristic = undefinedVars.length > 0 ? `Possible errors: undefined variables (${undefinedVars.join(', ')})` : 'No obvious errors';

  const prompt = `Predict potential errors in this Python code:\n${code}\nList likely issues.`;
  try {
    const aiPrediction = await aiClient.predictInsight(prompt);
    return `${heuristic}; ${aiPrediction} (AI)`;
  } catch {
    return heuristic;
  }
}