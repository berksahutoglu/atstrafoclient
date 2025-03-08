import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgilerini kontrol et
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (error) {
        // localStorage'daki veri JSON formatında değilse temizle
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setAuthError(null);
    try {
      const response = await authAPI.login({ username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        // Server tarafından dönen hata mesajı
        setAuthError(error.response.data.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      } else if (error.request) {
        // İstek yapıldı ama cevap alınamadı
        setAuthError('Sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.');
      } else {
        // İstek hazırlanırken bir hata oluştu
        setAuthError('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    authError,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};