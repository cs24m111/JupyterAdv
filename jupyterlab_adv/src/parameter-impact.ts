import aiClient from './ai-client';

export async function predictParameterImpact(code: string): Promise<string> {
  const hasModel = /sklearn\./.test(code);
  const heuristic = hasModel ? 'Changing epochs may increase accuracy' : 'No ML parameters detected';

  const prompt = `Predict how changing parameters affects outcomes for this Python code:\n${code}\nFocus on ML parameters if present.`;
  try {
    const aiPrediction = await aiClient.predictInsight(prompt);
    return `${heuristic}; ${aiPrediction} (AI)`;
  } catch {
    return heuristic;
  }
}