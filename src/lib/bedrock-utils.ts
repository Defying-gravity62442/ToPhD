import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Retry mechanism with exponential backoff for Bedrock API calls
 * @param command - The InvokeModelCommand to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise<any> - The parsed response from Bedrock
 */
export async function invokeBedrockWithRetry(command: InvokeModelCommand, maxRetries = 3): Promise<any> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await bedrockClient.send(command);
      const responseBody = new TextDecoder().decode(response.body);
      return JSON.parse(responseBody);
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a throttling exception
      if (error.name === 'ThrottlingException' || error.$metadata?.httpStatusCode === 429) {
        if (attempt < maxRetries) {
          // Exponential backoff: 2^attempt * baseDelay (in milliseconds)
          const baseDelay = 1000; // 1 second
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
          
          console.log(`Bedrock throttling, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-throttling errors, don't retry
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Create a Bedrock command with the specified model and input
 * @param modelId - The Bedrock model ID or inference profile ID
 * @param input - The model input payload
 * @returns InvokeModelCommand
 */
export function createBedrockCommand(modelId: string, input: any): InvokeModelCommand {
  return new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(input)
  });
}

export { bedrockClient }; 