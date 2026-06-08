import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { User } from '../types';

export const mockAuth = {
  signup: async (name: string, email: string, password?: string): Promise<User> => {
    const pass = password || "defaultpassword123";
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = credential.user.uid;
      
      const userDoc = {
        uid,
        name,
        email,
        streak: 0,
        badges: [] as string[],
        quizCount: 0,
        lastQuizDate: '',
        lastDailyDate: '',
        isAdmin: email === 'gk4100777@gmail.com'
      };

      try {
        await setDoc(doc(db, 'users', uid), {
          ...userDoc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
      }

      localStorage.setItem('user', JSON.stringify(userDoc));
      return userDoc;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  },

  login: async (email: string, password?: string): Promise<User> => {
    const pass = password || "defaultpassword123";
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const uid = credential.user.uid;

      let userDoc: any = null;
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          userDoc = docSnap.data();
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${uid}`);
      }

      if (!userDoc) {
        userDoc = {
          uid,
          name: email.split('@')[0],
          email,
          streak: 0,
          badges: [] as string[],
          quizCount: 0,
          lastQuizDate: '',
          lastDailyDate: '',
          isAdmin: email === 'gk4100777@gmail.com'
        };
        try {
          await setDoc(doc(db, 'users', uid), {
            ...userDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
        }
      }

      localStorage.setItem('user', JSON.stringify(userDoc));
      return userDoc;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  loginWithGoogle: async (): Promise<User> => {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const uid = credential.user.uid;
      const email = credential.user.email || "";
      const name = credential.user.displayName || email.split('@')[0];

      let userDoc: any = null;
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          userDoc = docSnap.data();
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${uid}`);
      }

      if (!userDoc) {
        userDoc = {
          uid,
          name,
          email,
          streak: 0,
          badges: [] as string[],
          quizCount: 0,
          lastQuizDate: '',
          lastDailyDate: '',
          isAdmin: email === 'gk4100777@gmail.com'
        };
        try {
          await setDoc(doc(db, 'users', uid), {
            ...userDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
        }
      }

      localStorage.setItem('user', JSON.stringify(userDoc));
      return userDoc;
    } catch (error) {
      console.error("Google Login error:", error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
    localStorage.removeItem('user');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
};
