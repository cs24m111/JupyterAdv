import aiClient from './ai-client';

export async function suggestTypes(code: string): Promise<string> {
  const variables = code.match(/\b\w+\s*=/g)?.map(v => v.replace('=', '').trim()) || [];
  const heuristic = variables.length > 0 ? `Variables: ${variables.join(', ')}` : 'No variables detected';

  const prompt = `Infer variable types for this Python code:\n${code}\nSuggest types for each variable.`;
  try {
    const aiPrediction = await aiClient.predictInsight(prompt);
    return `${heuristic}; ${aiPrediction} (AI)`;
  } catch {
    return heuristic;
  }
}