import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp,
  doc,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { QuizConfig, Question } from '../types';

export interface SavedQuiz {
  id: string;
  subject: string;
  topic: string;
  config: QuizConfig;
  questions: Question[];
  createdAt: any;
}

export const saveQuiz = async (config: QuizConfig, questions: Question[]) => {
  if (!auth.currentUser) return null;

  const userId = auth.currentUser.uid;
  const path = 'quizzes';

  try {
    // Check limit: 60 per topic
    const topic = config.topic || 'General';
    const q = query(
      collection(db, path), 
      where('userId', '==', userId), 
      where('topic', '==', topic)
    );
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;

    if (count >= 60) {
      console.warn(`Limit reached for topic: ${topic}. Quiz not saved to Firebase.`);
      return null;
    }

    const docRef = await addDoc(collection(db, path), {
      userId,
      subject: config.subject,
      topic: topic,
      config,
      questions,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getUserQuizzes = async () => {
  if (!auth.currentUser) return [];

  const userId = auth.currentUser.uid;
  const path = 'quizzes';

  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedQuiz[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};
