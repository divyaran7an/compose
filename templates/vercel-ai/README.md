# Vercel AI SDK Template

A production-ready Next.js template with Vercel AI SDK integration, featuring a modern chat interface powered by OpenAI's GPT models.

**Framework**: Next.js 14 with Pages Router  
**AI SDK**: Vercel AI SDK v3 with OpenAI integration

## 🚀 Features

- **AI Chat Interface**: Real-time streaming chat with OpenAI GPT models
- **Modern UI**: Clean, responsive chat interface with typing indicators
- **Error Handling**: Comprehensive error handling for API failures and edge cases
- **TypeScript Support**: Fully typed components and API routes
- **Streaming Responses**: Real-time AI response streaming for better UX
- **Production Ready**: Optimized for deployment with proper error boundaries

## 📋 Prerequisites

Before you begin, make sure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm**, **yarn**, or **pnpm** package manager
- An **OpenAI API account** - [Sign up here](https://platform.openai.com/)

## 🛠 Quick Start

### 1. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** in your dashboard
4. Click "Create new secret key"
5. Copy the API key (starts with `sk-...`)
6. **Important**: Keep this key secure and never commit it to version control

### 2. Configure Environment Variables

The Vercel AI SDK automatically uses the `OPENAI_API_KEY` environment variable. Create a `.env.local` file in your project root:

```bash
# OpenAI Configuration (automatically detected by @ai-sdk/openai)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Optional: Set to development for detailed error messages
NODE_ENV=development
```

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Your app will be running at `http://localhost:3000`

## 🧪 Testing Your Setup

### Chat Interface
1. Navigate to `/chat-example`
2. Type a message in the input field
3. Press Enter or click Send
4. Watch the AI response stream in real-time
5. Try different types of questions:
   - **Coding**: "How do I create a React component?"
   - **Explanations**: "Explain quantum computing simply"
   - **Creative**: "Write a short story about a robot"
   - **General**: "What's the weather like on Mars?"

### Error Testing
- Try using the chat without setting `OPENAI_API_KEY` to see error handling
- Check the browser console for detailed error logs in development mode

## 🔧 Customization

### Changing the AI Model

Edit `api-chat.ts` to use different OpenAI models:

```typescript
const result = await streamText({
  model: openai('gpt-3.5-turbo'), // Change from gpt-4o to gpt-3.5-turbo
  // ... other options
});
```

Available models:
- `gpt-4o` (default, latest and most capable model)
- `gpt-3.5-turbo` (faster and cheaper alternative)
- `gpt-4` (previous generation GPT-4 model)
- `gpt-4-turbo` (optimized GPT-4 variant)

### Adjusting Response Parameters

Modify the AI behavior in `api-chat.ts`:

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  temperature: 0.7,    // Creativity (0-1, higher = more creative)
  maxTokens: 500,      // Response length limit
  system: "Your custom system prompt here...",
});
```

### Styling the Chat Interface

The chat component uses inline styles for simplicity. You can:
- Replace with CSS modules or styled-components
- Add a CSS framework like Tailwind CSS
- Customize colors, fonts, and layout in `example.tsx`

### Adding Authentication

For production use, consider adding authentication:

```typescript
// In your API route
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add authentication check
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // ... rest of your chat logic
}
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com/) and import your repository
3. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
4. Deploy!

### Deploy to Other Platforms

For other platforms (Netlify, AWS, Railway, etc.):
1. Set the `OPENAI_API_KEY` environment variable
2. Ensure Node.js 18+ is available
3. Build with `npm run build`
4. Start with `npm start`

## 💰 Cost Considerations

### OpenAI API Pricing
- **GPT-4o**: ~$0.0025 per 1K input tokens, ~$0.01 per 1K output tokens (recommended)
- **GPT-3.5-turbo**: ~$0.0005 per 1K input tokens, ~$0.0015 per 1K output tokens (most affordable)
- **GPT-4**: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens (more expensive)
- **Tokens**: Roughly 1 token = 0.75 words

### Cost Optimization Tips
1. **Set `maxTokens`** to limit response length
2. **Use GPT-3.5-turbo** for cost-sensitive applications
3. **Use GPT-4o** for the best balance of performance and cost
4. **Implement rate limiting** to prevent abuse
5. **Monitor usage** in your OpenAI dashboard
6. **Set billing alerts** in your OpenAI account

## 🔒 Security Best Practices

### API Key Security
- Never expose API keys in client-side code
- Use environment variables for all secrets
- Rotate API keys regularly
- Set usage limits in OpenAI dashboard

### Rate Limiting
Consider adding rate limiting to prevent abuse:

```typescript
// Example rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### Input Validation
Always validate user inputs:

```typescript
// Validate message content
if (typeof message.content !== 'string' || message.content.length > 1000) {
  return res.status(400).json({ error: 'Invalid message content' });
}
```

## 🩹 Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Check that `OPENAI_API_KEY` is set in your `.env.local` file
- Ensure the key starts with `sk-`
- Restart your development server after adding the key

**"Invalid API key"**
- Verify your API key is correct and active
- Check your OpenAI account status and billing
- Try generating a new API key

**"Rate limit exceeded"**
- You've hit OpenAI's rate limits
- Wait a few minutes before trying again
- Consider upgrading your OpenAI plan for higher limits

**"Insufficient quota"**
- Your OpenAI account has no remaining credits
- Add billing information to your OpenAI account
- Check your usage in the OpenAI dashboard

**Chat not loading/working**
- Check browser console for JavaScript errors
- Verify the API route is accessible at `/api/chat`
- Ensure all dependencies are installed correctly

**Streaming not working**
- Check that your deployment platform supports streaming responses
- Verify the `maxDuration` export is properly configured
- Some platforms may require additional configuration for streaming

### Getting Help

If you're still having issues:

1. **Check OpenAI Status**: [status.openai.com](https://status.openai.com/)
2. **Review OpenAI Docs**: [platform.openai.com/docs](https://platform.openai.com/docs)
3. **Vercel AI SDK Docs**: [sdk.vercel.ai](https://sdk.vercel.ai/)
4. **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)

## 📁 Project Structure

```
src/
├── pages/
│   ├── chat-example.tsx       # Main chat interface component
│   └── api/
│       └── chat.ts           # API route for AI chat
├── components/               # (Add your custom components here)
└── styles/                  # (Add your custom styles here)
```

## 🎨 Advanced Features

### Adding Memory/Context
Implement conversation memory by storing chat history:

```typescript
// Store conversation context
const conversationHistory = messages.slice(-10); // Keep last 10 messages
```

### Multiple AI Providers
Switch between different AI providers:

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Use different models based on user preference
const model = provider === 'anthropic' 
  ? anthropic('claude-3-5-sonnet-20241022')
  : openai('gpt-4o');
```

### Function Calling
Add function calling capabilities:

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  tools: {
    weather: {
      description: 'Get weather information',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        // Implement weather API call
        return `Weather in ${location}: Sunny, 72°F`;
      },
    },
  },
});
```

## 📚 Learn More

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

Found an issue or want to contribute? Please check the repository for contribution guidelines.

## 📄 License

MIT License - feel free to use this template for your projects!

---

**Happy building with AI! 🤖✨** 