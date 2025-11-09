import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getRemoteConfig } from 'firebase-admin/remote-config';
import { firebaseConfig } from '../config';

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firebaseRemoteConfig = getRemoteConfig(app);
