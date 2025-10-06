import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from '../config';

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
