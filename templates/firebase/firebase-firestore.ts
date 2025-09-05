import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// Types for better TypeScript support
export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

export interface QueryOptions {
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  whereConditions?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
    value: any;
  }>;
}

export interface PaginationOptions extends QueryOptions {
  lastDoc?: DocumentSnapshot;
}

/**
 * Helper to check if Firestore is initialized
 */
const checkFirestoreInitialized = () => {
  if (!db) {
    return 'Firebase is not configured. Please add your Firebase configuration.';
  }
  return null;
};

/**
 * Add a new document to a collection
 */
export const addDocument = async (
  collectionName: string,
  data: DocumentData
): Promise<{ id: string | null; error: string | null }> => {
  const initError = checkFirestoreInitialized();
  if (initError) {
    return { id: null, error: initError };
  }
  
  try {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, collectionName), docData);
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message || 'Failed to add document' };
  }
};

/**
 * Get a single document by ID
 */
export const getDocument = async (
  collectionName: string,
  id: string
): Promise<{ data: FirestoreDocument | null; error: string | null }> => {
  const initError = checkFirestoreInitialized();
  if (initError) {
    return { data: null, error: initError };
  }
  
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        data: { id: docSnap.id, ...docSnap.data() } as FirestoreDocument,
        error: null,
      };
    } else {
      return { data: null, error: 'Document not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to get document' };
  }
};

/**
 * Get multiple documents from a collection with optional filtering
 */
export const getDocuments = async (
  collectionName: string,
  options: QueryOptions = {}
): Promise<{ data: FirestoreDocument[]; error: string | null }> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Add where conditions
    if (options.whereConditions) {
      options.whereConditions.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }
    
    // Add ordering
    if (options.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
    }
    
    // Add limit
    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }
    
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents: FirestoreDocument[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return { data: documents, error: null };
  } catch (error: any) {
    return { data: [], error: error.message || 'Failed to get documents' };
  }
};

/**
 * Update a document
 */
export const updateDocument = async (
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, collectionName, id);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to update document' };
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (
  collectionName: string,
  id: string
): Promise<{ error: string | null }> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete document' };
  }
};

/**
 * Subscribe to real-time updates for a collection
 */
export const subscribeToCollection = (
  collectionName: string,
  callback: (documents: FirestoreDocument[]) => void,
  options: QueryOptions = {}
): Unsubscribe => {
  const constraints: QueryConstraint[] = [];
  
  // Add where conditions
  if (options.whereConditions) {
    options.whereConditions.forEach(condition => {
      constraints.push(where(condition.field, condition.operator, condition.value));
    });
  }
  
  // Add ordering
  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
  }
  
  // Add limit
  if (options.limitCount) {
    constraints.push(limit(options.limitCount));
  }
  
  const q = query(collection(db, collectionName), ...constraints);
  
  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const documents: FirestoreDocument[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(documents);
  }, (error) => {
    console.error('Error in collection subscription:', error);
  });
};

/**
 * Subscribe to real-time updates for a single document
 */
export const subscribeToDocument = (
  collectionName: string,
  id: string,
  callback: (document: FirestoreDocument | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionName, id);
  
  return onSnapshot(docRef, (snapshot: DocumentSnapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as FirestoreDocument);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in document subscription:', error);
  });
};

/**
 * Get documents with pagination support
 */
export const getDocumentsPaginated = async (
  collectionName: string,
  options: PaginationOptions = {}
): Promise<{ 
  data: FirestoreDocument[]; 
  lastDoc: DocumentSnapshot | null; 
  error: string | null 
}> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Add where conditions
    if (options.whereConditions) {
      options.whereConditions.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }
    
    // Add ordering
    if (options.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
    }
    
    // Add pagination
    if (options.lastDoc) {
      constraints.push(startAfter(options.lastDoc));
    }
    
    // Add limit
    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }
    
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents: FirestoreDocument[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    return { data: documents, lastDoc, error: null };
  } catch (error: any) {
    return { data: [], lastDoc: null, error: error.message || 'Failed to get documents' };
  }
};

/**
 * Utility function to create server timestamp
 */
export const createTimestamp = () => serverTimestamp();

/**
 * Utility function to convert Firestore timestamp to Date
 */
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
}; 