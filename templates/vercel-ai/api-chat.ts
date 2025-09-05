import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Use edge runtime for streaming responses
export const runtime = 'edge';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Extract messages from request body
    const { messages } = await req.json();

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Note: @ai-sdk/openai automatically uses OPENAI_API_KEY environment variable
    
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a chat completion stream using the official AI SDK pattern
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: messages.map((message: any) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
      maxTokens: 500,
      // Add system message for better responses
      system: `You are a helpful AI assistant. Provide clear, concise, and helpful responses. 
               If asked about coding, provide practical examples. 
               If asked about complex topics, break them down into understandable parts.
               Be friendly and conversational while remaining informative.`,
    });

    // Return the streaming response using the official AI SDK method
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle specific OpenAI errors
    if (error?.code === 'insufficient_quota') {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API quota exceeded. Please check your OpenAI account billing.' 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error?.code === 'invalid_api_key') {
      return new Response(JSON.stringify({ 
        error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error?.code === 'model_not_found') {
      return new Response(JSON.stringify({ 
        error: 'The specified model was not found. Please check your model configuration.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle rate limiting
    if (error?.status === 429) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle network errors
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return new Response(JSON.stringify({ 
        error: 'Unable to connect to OpenAI. Please check your internet connection.' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generic error response
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 