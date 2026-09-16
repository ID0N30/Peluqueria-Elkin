import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  loginAnonymously, 
  logout, 
  subscribeToAuthState 
} from '../lib/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((enrichedUser) => {
      if (enrichedUser) {
        setUser(enrichedUser);
        setUserProfile(enrichedUser.profile);
        setIsAdmin(enrichedUser.isAdmin);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userProfile,
    isAdmin,
    loading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    loginAnonymously,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
