/**
 * Mock Anthropic API server for E2E testing
 *
 * Provides a local HTTP server that mimics the Anthropic API's /v1/messages endpoint,
 * allowing E2E tests to run CLI as subprocess without real API calls.
 */

import * as http from 'http';

/**
 * Mock API response to queue for sequential calls
 */
export interface MockResponse {
  /** Text content for the response */
  content: string;
  /** Optional stop reason (defaults to 'end_turn') */
  stopReason?: string;
  /** Optional input token count */
  inputTokens?: number;
  /** Optional output token count */
  outputTokens?: number;
  /** Optional HTTP status code (defaults to 200) */
  statusCode?: number;
  /** Optional error response body */
  errorBody?: Record<string, unknown>;
}

/**
 * Recorded request from API calls
 */
export interface RecordedRequest {
  /** Request body parsed as JSON */
  body: Record<string, unknown>;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Timestamp when request was received */
  timestamp: number;
}

/**
 * Mock Anthropic API server
 */
export class MockAnthropicServer {
  private server: http.Server | null = null;
  private responseQueue: MockResponse[] = [];
  private recordedRequests: RecordedRequest[] = [];
  private port: number = 0;

  /**
   * Starts the mock server on an available port
   *
   * @returns Promise resolving to the server URL
   */
  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);

      // Use port 0 to get random available port
      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server!.address();
        if (typeof address === 'object' && address !== null) {
          this.port = address.port;
          resolve(`http://127.0.0.1:${this.port}`);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });
  }

  /**
   * Stops the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Queues a mock response for the next API call
   *
   * @param response - Response to queue
   */
  queueResponse(response: MockResponse): void {
    this.responseQueue.push(response);
  }

  /**
   * Queues multiple mock responses for sequential API calls
   *
   * @param responses - Responses to queue
   */
  queueResponses(responses: MockResponse[]): void {
    this.responseQueue.push(...responses);
  }

  /**
   * Gets all recorded requests
   *
   * @returns Array of recorded requests
   */
  getRecordedRequests(): RecordedRequest[] {
    return [...this.recordedRequests];
  }

  /**
   * Clears the response queue and recorded requests
   */
  reset(): void {
    this.responseQueue = [];
    this.recordedRequests = [];
  }

  /**
   * Gets the current port the server is running on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Handles incoming HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Only handle POST /v1/messages
    if (req.method !== 'POST' || req.url !== '/v1/messages') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // Collect request body
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8');
        const body = JSON.parse(bodyStr) as Record<string, unknown>;

        // Record the request
        this.recordedRequests.push({
          body,
          headers: req.headers,
          timestamp: Date.now(),
        });

        // Get next queued response or return default
        const mockResponse = this.responseQueue.shift();

        if (!mockResponse) {
          // Default response if no queued response
          this.sendSuccessResponse(res, {
            content: 'Default mock response',
            stopReason: 'end_turn',
            inputTokens: 100,
            outputTokens: 50,
          });
          return;
        }

        // Handle error responses
        if (mockResponse.statusCode && mockResponse.statusCode >= 400) {
          res.writeHead(mockResponse.statusCode, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify(
              mockResponse.errorBody || {
                type: 'error',
                error: {
                  type: 'api_error',
                  message: 'Mock API error',
                },
              }
            )
          );
          return;
        }

        // Send success response
        this.sendSuccessResponse(res, mockResponse);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            type: 'error',
            error: {
              type: 'invalid_request_error',
              message: 'Invalid JSON body',
            },
          })
        );
      }
    });
  }

  /**
   * Sends a successful API response in Anthropic format
   */
  private sendSuccessResponse(res: http.ServerResponse, mockResponse: MockResponse): void {
    const response = {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: mockResponse.content,
        },
      ],
      model: 'claude-sonnet-4-20250514',
      stop_reason: mockResponse.stopReason || 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: mockResponse.inputTokens ?? 100,
        output_tokens: mockResponse.outputTokens ?? 50,
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }
}

/**
 * Creates and starts a new mock server
 *
 * @returns Promise resolving to the mock server instance and its URL
 */
export async function createMockServer(): Promise<{ server: MockAnthropicServer; url: string }> {
  const server = new MockAnthropicServer();
  const url = await server.start();
  return { server, url };
}
