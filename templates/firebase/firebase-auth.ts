import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './config';

// Types for better TypeScript support
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface SignInResult {
  user: AuthUser | null;
  error: string | null;
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string
): Promise<SignInResult> => {
  if (!auth) {
    return {
      user: null,
      error: 'Firebase is not configured. Please add your Firebase configuration.',
    };
  }
  
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return {
      user: formatUser(userCredential.user),
      error: null,
    };
  } catch (error: any) {
    return {
      user: null,
      error: error.message || 'Failed to sign in',
    };
  }
};

/**
 * Create a new user account with email and password
 */
export const createUser = async (
  email: string,
  password: string,
  displayName?: string
): Promise<SignInResult> => {
  if (!auth) {
    return {
      user: null,
      error: 'Firebase is not configured. Please add your Firebase configuration.',
    };
  }
  
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update profile with display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    return {
      user: formatUser(userCredential.user),
      error: null,
    };
  } catch (error: any) {
    return {
      user: null,
      error: error.message || 'Failed to create account',
    };
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<SignInResult> => {
  if (!auth) {
    return {
      user: null,
      error: 'Firebase is not configured. Please add your Firebase configuration.',
    };
  }
  
  try {
    const userCredential: UserCredential = await signInWithPopup(
      auth,
      googleProvider
    );
    return {
      user: formatUser(userCredential.user),
      error: null,
    };
  } catch (error: any) {
    return {
      user: null,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  if (!auth) {
    return { error: 'Firebase is not configured. Please add your Firebase configuration.' };
  }
  
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to sign out' };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (
  email: string
): Promise<{ error: string | null }> => {
  if (!auth) {
    return { error: 'Firebase is not configured. Please add your Firebase configuration.' };
  }
  
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to send reset email' };
  }
};

/**
 * Listen to authentication state changes
 */
export const onAuthChange = (callback: (user: AuthUser | null) => void) => {
  // Return no-op unsubscribe if auth is not initialized
  if (!auth) {
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, (user: User | null) => {
    callback(user ? formatUser(user) : null);
  });
};

/**
 * Get current user
 */
export const getCurrentUser = (): AuthUser | null => {
  if (!auth) return null;
  const user = auth.currentUser;
  return user ? formatUser(user) : null;
};

/**
 * Format Firebase user object to our AuthUser interface
 */
const formatUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
});

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth && auth.currentUser !== null;
}; 