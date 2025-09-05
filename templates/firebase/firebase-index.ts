// Firebase configuration and services
export { auth, db } from './config';

// Authentication exports
export {
  signIn,
  createUser,
  signInWithGoogle,
  signOut,
  resetPassword,
  onAuthChange,
  getCurrentUser,
  isAuthenticated,
  type AuthUser,
  type SignInResult,
} from './auth';

// Firestore exports
export {
  addDocument,
  getDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  subscribeToCollection,
  subscribeToDocument,
  getDocumentsPaginated,
  createTimestamp,
  timestampToDate,
  type FirestoreDocument,
  type QueryOptions,
  type PaginationOptions,
} from './firestore';

// Re-export Firebase types that might be useful
export type { User, Unsubscribe } from 'firebase/auth';
export type { DocumentSnapshot, Timestamp } from 'firebase/firestore'; 