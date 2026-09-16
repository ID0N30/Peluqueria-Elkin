import { db } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_CONFIG_DOC = 'admin';

export const HARDCODED_ADMIN_EMAILS = [
  'jaomp3@gmail.com',
  'peluqueriaelkin@gmail.com'
];

export const getAdminConfig = async () => {
  const docRef = doc(db, 'config', ADMIN_CONFIG_DOC);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.warn("Could not read admin config (likely permission denied):", e.message);
    return { superAdminEmail: 'jaompe@gmail.com', secondaryAdmins: ['peluqueriaelkin@gmail.com'] };
  }

  // Default if doesn't exist
  const defaultConfig = {
    superAdminEmail: 'peluqueriaelkin@gmail.com',
    secondaryAdmins: []
  };
  // We do not attempt to write it here to avoid permission denied errors
  return defaultConfig;
};

export const isSuperAdmin = async (user) => {
  if (!user || (!user.email && !user.uid)) return false;

  if (user.email && HARDCODED_ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) {
    return true;
  }

  try {
    const config = await getAdminConfig();
    if (user.email && config.superAdminEmail === user.email) {
      return true;
    }
    if (user.email && config.secondaryAdmins && config.secondaryAdmins.includes(user.email)) {
      return true;
    }

    // Also check user document
    if (user.uid) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        return true;
      }
    }
  } catch (e) {
    console.warn("Error checking super admin status in Firestore:", e.message);
  }

  return false;
};

export const updateSuperAdminEmail = async (newEmail) => {
  const docRef = doc(db, 'config', ADMIN_CONFIG_DOC);
  await setDoc(docRef, { superAdminEmail: newEmail }, { merge: true });
};
