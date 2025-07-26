import { invokeBedrockWithRetry, createBedrockCommand } from './bedrock-utils';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Mock the Bedrock client for testing
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(),
  InvokeModelCommand: jest.fn()
}));

describe('Bedrock Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createBedrockCommand creates command with correct parameters', () => {
    const modelId = 'test-model';
    const input = { test: 'data' };
    
    createBedrockCommand(modelId, input);
    
    expect(InvokeModelCommand).toHaveBeenCalledWith({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(input)
    });
  });

  test('invokeBedrockWithRetry handles throttling with exponential backoff', async () => {
    const mockCommand = {} as InvokeModelCommand;
    const mockBedrockClient = {
      send: jest.fn()
    };

    // Mock the Bedrock client to throw throttling exception twice, then succeed
    mockBedrockClient.send
      .mockRejectedValueOnce({ name: 'ThrottlingException' })
      .mockRejectedValueOnce({ name: 'ThrottlingException' })
      .mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({ content: [{ text: 'success' }] }))
      });

    // Mock the bedrockClient import
    jest.doMock('./bedrock-utils', () => ({
      ...jest.requireActual('./bedrock-utils'),
      bedrockClient: mockBedrockClient
    }));

    const result = await invokeBedrockWithRetry(mockCommand, 2);
    
    expect(mockBedrockClient.send).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ content: [{ text: 'success' }] });
  });

  test('invokeBedrockWithRetry throws after max retries', async () => {
    const mockCommand = {} as InvokeModelCommand;
    const mockBedrockClient = {
      send: jest.fn().mockRejectedValue({ name: 'ThrottlingException' })
    };

    // Mock the bedrockClient import
    jest.doMock('./bedrock-utils', () => ({
      ...jest.requireActual('./bedrock-utils'),
      bedrockClient: mockBedrockClient
    }));

    await expect(invokeBedrockWithRetry(mockCommand, 2)).rejects.toThrow();
    expect(mockBedrockClient.send).toHaveBeenCalledTimes(3);
  });
}); 