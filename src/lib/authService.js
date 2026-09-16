import { auth, db } from '../firebase.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { isSuperAdmin, HARDCODED_ADMIN_EMAILS } from './adminConfigService.js';

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

export const registerWithEmail = async (email, password, displayName, phone) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await syncUserProfile(result.user, { phone });
    return result.user;
  } catch (error) {
    console.error("Error registering with email:", error);
    throw error;
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error("Error logging in with email:", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error("Error logging in anonymously:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

const syncUserProfile = async (user, additionalData = {}) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || 'Anónimo',
    isAnonymous: user.isAnonymous,
    updatedAt: serverTimestamp(),
    ...additionalData
  };

  if (user.email && HARDCODED_ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) {
    userData.role = 'admin';
  }

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // Determine initial role if not hardcoded
      if (!userData.role) {
        const superAdminStatus = await isSuperAdmin(user);
        userData.role = superAdminStatus ? 'admin' : 'user';
      }
      await setDoc(userRef, userData);
    } else {
      await setDoc(userRef, userData, { merge: true });
    }
  } catch (error) {
    console.warn("No se pudo sincronizar perfil en Firestore:", error.message);
  }
};

export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        await syncUserProfile(user);
        
        let userProfile = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userProfile = userDoc.data();
          }
        } catch (err) {
          console.warn("Could not read user profile for state:", err.message);
        }

        const isHardcodedAdmin = user.email && HARDCODED_ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
        const superAdminStatus = isHardcodedAdmin || await isSuperAdmin(user);
        
        const enrichedUser = {
          ...user,
          profile: userProfile,
          isAdmin: superAdminStatus || (userProfile && userProfile.role === 'admin')
        };
        callback(enrichedUser);
      } else {
        callback(null);
      }
    } catch (error) {
      console.error("Error in auth state change:", error);
      callback(null);
    }
  });
};

export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No hay una sesión activa con correo para cambiar la contraseña.");
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  return true;
};

export const saveClientContactData = async (phone, name) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      phone: phone || '',
      displayName: name || user.displayName || 'Cliente',
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("No se pudo guardar el teléfono en Firestore:", err.message);
  }
};
