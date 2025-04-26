import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API REST endpoint for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint: string = '',
  init: RequestInit = {}
): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'jupyterlab-vcs',
    endPoint
  );

  try {
    const response = await ServerConnection.makeRequest(requestUrl, init, settings);
    const data = await response.text();

    if (!response.ok) {
      throw new ServerConnection.ResponseError(response, data || 'Request failed');
    }

    if (data.length > 0) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn('Not a JSON response body:', response);
        return data as T;
      }
    }

    return {} as T;
  } catch (error) {
    if (error instanceof ServerConnection.NetworkError) {
      throw error;
    }
    throw new ServerConnection.NetworkError(error as Error);
  }
}