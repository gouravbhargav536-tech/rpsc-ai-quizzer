import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { User } from '../types';

export const authService = {
  signup: async (name: string, email: string, password: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return { name, email: userCredential.user.email! };
  },
  login: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { name: userCredential.user.displayName || email.split('@')[0], email: userCredential.user.email! };
  },
  logout: async () => {
    await signOut(auth);
  },
  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        callback({ 
          name: firebaseUser.displayName || firebaseUser.email!.split('@')[0], 
          email: firebaseUser.email! 
        });
      } else {
        callback(null);
      }
    });
  }
};
