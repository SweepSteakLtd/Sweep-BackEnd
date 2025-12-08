import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getRemoteConfig } from 'firebase-admin/remote-config';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '../config';

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firebaseRemoteConfig = getRemoteConfig(app);
export const firebaseStorage = getStorage(app);
