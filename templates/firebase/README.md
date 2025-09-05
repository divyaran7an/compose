# 🔥 Firebase Integration Template

A complete Firebase integration template featuring authentication, Firestore database, and real-time functionality using Firebase SDK v10+ with TypeScript support.

## ✨ Features

### 🔐 Authentication
- **Email/Password Authentication** - Complete sign-in and sign-up flows
- **Google OAuth Integration** - One-click Google sign-in
- **Password Reset** - Email-based password recovery
- **Real-time Auth State** - Automatic UI updates based on authentication status
- **User Profile Management** - Display user information and profile photos

### 📊 Firestore Database
- **Complete CRUD Operations** - Create, Read, Update, Delete documents
- **Real-time Data Sync** - Live updates with Firestore listeners
- **Advanced Querying** - Filtering, ordering, and pagination
- **User-specific Data Isolation** - Secure data separation by user
- **Server Timestamps** - Automatic created/updated tracking

### 🚀 Production Ready
- **TypeScript Support** - Full type safety and IntelliSense
- **Error Handling** - Comprehensive error management
- **Loading States** - Proper loading indicators
- **Responsive Design** - Mobile-friendly interface
- **Security Best Practices** - Secure Firebase configuration

## 🚀 Quick Start

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter your project name and follow the setup wizard
4. Choose your Google Analytics settings (optional)

### 2. Set Up Authentication

1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider:
   - Click on "Email/Password"
   - Toggle "Enable" and save
3. Enable **Google** provider:
   - Click on "Google"
   - Toggle "Enable"
   - Add your project's support email
   - Save the configuration

### 3. Create Firestore Database

1. Go to **Firestore Database** in your Firebase console
2. Click "Create database"
3. Choose **Start in production mode** (recommended)
4. Select a location for your database
5. Update security rules (see [Security Rules](#security-rules) section)

### 4. Get Firebase Configuration

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 5. Configure Environment Variables

Create a `.env.local` file in your project root and add your Firebase configuration:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Important:** All Firebase config variables must have the `NEXT_PUBLIC_` prefix to be accessible in the browser.

### 6. Install Dependencies

```bash
npm install firebase
```

### 7. Start Development

```bash
npm run dev
```

Visit `http://localhost:3000/firebase` to see the Firebase integration in action!

## 📁 Project Structure

```
src/
├── lib/
│   ├── firebase/
│   │   ├── config.ts          # Firebase configuration
│   │   ├── auth.ts            # Authentication functions
│   │   ├── firestore.ts       # Firestore operations
│   │   └── index.ts           # Main exports
├── components/
│   ├── AuthExample.tsx        # Authentication component
│   └── FirestoreExample.tsx   # Firestore CRUD component
└── pages/
    └── firebase.tsx           # Main Firebase page
```

## 🔧 Configuration

### Firebase Security Rules

Update your Firestore security rules to ensure proper data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /todos/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Add more collections as needed
    match /{document=**} {
      allow read, write: if false; // Deny all other access
    }
  }
}
```

### Google OAuth Setup

For Google OAuth to work properly:

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Google** provider
3. Add your domain to **Authorized domains** (e.g., `localhost`, `yourdomain.com`)
4. For production, ensure your domain is properly configured

## 💻 Usage Examples

### Authentication

```typescript
import { signIn, createUser, signOut, onAuthChange } from '../lib/firebase';

// Sign in with email/password
const handleSignIn = async () => {
  const result = await signIn(email, password);
  if (result.error) {
    console.error('Sign in failed:', result.error);
  } else {
    console.log('Signed in:', result.user);
  }
};

// Create new user
const handleSignUp = async () => {
  const result = await createUser(email, password, displayName);
  if (result.error) {
    console.error('Sign up failed:', result.error);
  } else {
    console.log('User created:', result.user);
  }
};

// Listen to auth state changes
useEffect(() => {
  const unsubscribe = onAuthChange((user) => {
    setUser(user);
  });
  return () => unsubscribe();
}, []);
```

### Firestore Operations

```typescript
import { 
  addDocument, 
  getDocuments, 
  updateDocument, 
  deleteDocument,
  subscribeToCollection 
} from '../lib/firebase';

// Add a document
const addTodo = async () => {
  const result = await addDocument('todos', {
    title: 'Learn Firebase',
    completed: false,
    userId: user.uid
  });
  
  if (result.error) {
    console.error('Failed to add todo:', result.error);
  } else {
    console.log('Todo added with ID:', result.data.id);
  }
};

// Get documents with filtering
const getTodos = async () => {
  const result = await getDocuments('todos', {
    whereConditions: [
      { field: 'userId', operator: '==', value: user.uid },
      { field: 'completed', operator: '==', value: false }
    ],
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });
  
  if (result.error) {
    console.error('Failed to get todos:', result.error);
  } else {
    setTodos(result.data);
  }
};

// Real-time listener
useEffect(() => {
  const unsubscribe = subscribeToCollection(
    'todos',
    (documents) => {
      setTodos(documents);
    },
    {
      whereConditions: [
        { field: 'userId', operator: '==', value: user.uid }
      ]
    }
  );
  
  return () => unsubscribe();
}, [user]);
```

## 🔒 Security Best Practices

### Environment Variables
- Never commit `.env.local` to version control
- Use different Firebase projects for development and production
- Regularly rotate API keys in production

### Firestore Security
- Always implement proper security rules
- Use user authentication for data access control
- Validate data on both client and server side
- Implement rate limiting for sensitive operations

### Authentication
- Enforce strong password requirements
- Implement email verification for new accounts
- Use multi-factor authentication for sensitive applications
- Monitor authentication logs for suspicious activity

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all `NEXT_PUBLIC_FIREBASE_*` variables
4. Deploy your application

### Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## 🧪 Testing

### Authentication Testing
- Test email/password sign-in and sign-up flows
- Verify Google OAuth integration
- Test password reset functionality
- Ensure proper error handling for invalid credentials

### Firestore Testing
- Test CRUD operations with different user accounts
- Verify real-time updates work correctly
- Test security rules with unauthorized access attempts
- Validate data persistence across sessions

### Integration Testing
- Test authentication state persistence
- Verify user-specific data isolation
- Test offline functionality (if implemented)
- Performance testing with large datasets

## 🛠️ Customization

### Adding New Collections

1. Create TypeScript interfaces for your data:
```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: any;
}
```

2. Update Firestore security rules:
```javascript
match /posts/{document} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == resource.data.authorId;
}
```

3. Use existing Firestore functions with your new collection:
```typescript
const addPost = async (postData: Omit<Post, 'id'>) => {
  return await addDocument('posts', postData);
};
```

### Styling Customization

The components use styled-jsx for styling. You can:
- Modify the existing styles in component files
- Replace styled-jsx with your preferred CSS solution
- Add a CSS framework like Tailwind CSS
- Implement a design system with styled-components

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## 🐛 Troubleshooting

### Common Issues

**Firebase not initialized:**
- Check that all environment variables are properly set
- Ensure variables have the `NEXT_PUBLIC_` prefix
- Restart your development server after adding environment variables

**Authentication not working:**
- Verify that authentication providers are enabled in Firebase Console
- Check that your domain is added to authorized domains
- Ensure API keys are correct and not expired

**Firestore permission denied:**
- Review your Firestore security rules
- Check that user is properly authenticated
- Verify that data structure matches security rule expectations

**Real-time updates not working:**
- Check browser console for WebSocket connection errors
- Verify Firestore rules allow read access
- Ensure proper cleanup of listeners to prevent memory leaks

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Review Firebase Console for authentication and database logs
3. Verify your configuration against this documentation
4. Check Firebase status page for service outages

## 📄 License

This template is part of the capx-compose project and follows the same license terms. 