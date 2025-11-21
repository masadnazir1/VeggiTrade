import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { DEFAULT_PORTFOLIO_DATA } from '../constants';
import { Portfolio } from '../types';

// Initialize Firebase only if config is available and valid
let db: any = null;
let auth: any = null;
let appId: string | undefined;

const initFirebase = () => {
  if (typeof window === 'undefined') return;
  
  const config = window.__firebase_config;
  appId = window.__app_id;

  if (config && !getApps().length) {
    try {
      const app = initializeApp(config);
      db = getFirestore(app);
      auth = getAuth(app);
    } catch (e) {
      console.error("Firebase initialization error:", e);
    }
  } else if (getApps().length) {
    const app = getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  }
};

initFirebase();

export const authenticateUser = async (): Promise<User | null> => {
  if (!auth) {
    console.warn("Firebase Auth not initialized. Running in offline/demo mode.");
    return null;
  }

  try {
    if (window.__initial_auth_token) {
      const userCredential = await signInWithCustomToken(auth, window.__initial_auth_token);
      return userCredential.user;
    } else {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    }
  } catch (error) {
    console.error("Authentication failed:", error);
    return null;
  }
};

export const subscribeToPortfolio = (
  userId: string, 
  onUpdate: (data: Portfolio) => void
) => {
  if (!db || !appId) return () => {};

  const docPath = `artifacts/${appId}/users/${userId}/veggietrade_data/portfolio`;
  const portfolioRef = doc(db, docPath);

  return onSnapshot(portfolioRef, async (docSnapshot) => {
    if (docSnapshot.exists()) {
      onUpdate(docSnapshot.data() as Portfolio);
    } else {
      // Initialize default if not exists
      await setDoc(portfolioRef, DEFAULT_PORTFOLIO_DATA);
      onUpdate(DEFAULT_PORTFOLIO_DATA);
    }
  }, (error) => {
    console.error("Error fetching portfolio:", error);
  });
};

export const updatePortfolio = async (userId: string, newPortfolio: Portfolio) => {
  if (!db || !appId) return;
  const docPath = `artifacts/${appId}/users/${userId}/veggietrade_data/portfolio`;
  const portfolioRef = doc(db, docPath);
  
  try {
    await updateDoc(portfolioRef, { ...newPortfolio });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    throw error;
  }
};