# Supabase Template

A production-ready Next.js template with Supabase integration, featuring authentication, real-time database operations, and comprehensive CRUD functionality.

## 🚀 Features

- **Database Integration**: Full CRUD operations with real-time subscriptions
- **Authentication**: Email/password and social login (Google OAuth)
- **Real-time Updates**: Live data synchronization across multiple clients
- **TypeScript Support**: Fully typed Supabase operations
- **Modern UI**: Responsive design with inline editing and confirmation dialogs
- **Production Ready**: Comprehensive error handling and loading states

## 📋 Prerequisites

Before you begin, make sure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm**, **yarn**, or **pnpm** package manager
- A **Supabase account** - [Sign up here](https://supabase.com/)

## 🛠 Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign up
2. Click "New Project" in your dashboard
3. Fill in project details:
   - **Name**: Choose a descriptive name
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the region closest to your users
4. Wait 2-3 minutes for provisioning

### 2. Get Your API Keys

1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query" and run this SQL:

```sql
-- Create todos table for the example app
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON todos
  FOR ALL USING (auth.role() = 'authenticated');

-- Optional: Allow anonymous users (for demo purposes)
-- Remove this in production and require authentication
CREATE POLICY "Allow all operations for anonymous users" ON todos
  FOR ALL USING (true);
```

### 4. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
# Get these values from your Supabase project dashboard

# Your Supabase project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anon/public key
SUPABASE_ANON_KEY=your-anon-key-here

# Next.js Public Environment Variables
# These are exposed to the browser and must be prefixed with NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Your app will be running at `http://localhost:3000`

## 🧪 Testing Your Setup

### Database Operations
1. Navigate to `/supabase-example`
2. Try adding, editing, and deleting todos
3. Open multiple browser tabs to see real-time updates
4. Check the connection indicator (🟢 Live / 🔴 Offline)

### Authentication
1. Navigate to `/supabase-auth`
2. Create a new account or sign in
3. Test profile management features
4. Try social login if configured

## 🔐 Authentication Setup (Optional)

### Email Authentication
1. Go to **Authentication** → **Settings** in Supabase
2. Configure email settings as needed
3. Enable/disable email confirmations based on your requirements

### Google OAuth Setup
1. Go to **Authentication** → **Providers**
2. Find **Google** and click "Configure"
3. Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
4. Add authorized redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com/) and import your repository
3. Add environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Update Supabase for Production

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add your production domain to **Site URL**
3. Update OAuth redirect URLs for social providers

## 🔒 Security Best Practices

### Row Level Security (RLS)
Customize RLS policies for your use case:

```sql
-- Example: User-specific data
ALTER TABLE todos ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can only see their own todos" ON todos
  FOR ALL USING (auth.uid() = user_id);
```

### Environment Variables
- Never commit `.env.local` files to version control
- Use different Supabase projects for development and production
- Regularly rotate your API keys
- Use service role key only for server-side operations

## 📁 Project Structure

```
src/
├── pages/
│   ├── supabase-example.tsx    # CRUD operations demo
│   └── supabase-auth.tsx       # Authentication demo
├── lib/
│   └── supabase.ts            # Supabase client configuration
└── types/
    └── supabase.ts            # TypeScript definitions
```

## 🩹 Troubleshooting

### Common Issues

**"Invalid API key" or "Project not found"**
- Double-check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` values
- Ensure you're using the correct project

**"relation 'todos' does not exist"**
- Run the SQL schema creation script from step 3
- Verify the table exists in the Table Editor

**Real-time not working**
- Ensure RLS is enabled with appropriate policies
- Check browser console for JavaScript errors
- Verify authentication state in production

**Authentication issues**
- Check authentication settings in Supabase dashboard
- Verify redirect URLs are correctly configured
- Email confirmation might be required

**Build/deployment errors**
- Ensure all environment variables are set
- Check build logs for specific error messages
- Verify TypeScript compilation

## 🎨 Customization

### Styling
The template uses inline styles for simplicity. You can:
- Replace with your preferred CSS framework (Tailwind, Styled Components, etc.)
- Customize the color scheme and layout
- Add your own design system

### Database Schema
Extend the database for your needs:
- Add more tables and relationships
- Implement user profiles and roles
- Add file storage with Supabase Storage

### Features
Build upon the foundation:
- Add more complex queries and filters
- Implement pagination and search
- Add file upload functionality
- Integrate with external APIs

## 📚 Learn More

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## 🤝 Contributing

Found an issue or want to contribute? Please check the repository for contribution guidelines.

## 📄 License

MIT License - feel free to use this template for your projects!

---

**Happy building with Supabase! 🎉** 