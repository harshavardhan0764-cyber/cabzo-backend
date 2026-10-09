import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../config/api';

const AuthContext = createContext();

const INITIAL_USERS = {};

export function AuthProvider({ children }) {
  // Real token and session check
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || localStorage.getItem('CabApp_Token') || '';
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user') || localStorage.getItem('CabApp_User');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const hasToken = Boolean(localStorage.getItem('token') || localStorage.getItem('CabApp_Token'));
    const hasUser = Boolean(localStorage.getItem('user') || localStorage.getItem('CabApp_User'));
    return hasToken && hasUser;
  });

  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('CabApp_Admin_LoggedIn') === 'true';
  });

  const [currentPhone, setCurrentPhone] = useState(() => {
    return localStorage.getItem('CabApp_UserPhone') || '';
  });

  // Check auth with backend GET /api/auth/me on mount
  useEffect(() => {
    const verifySession = async () => {
      const activeToken = localStorage.getItem('token') || localStorage.getItem('CabApp_Token');
      if (!activeToken) return;

      const apiBase = getApiBaseUrl();

      try {
        const res = await fetch(`${apiBase}/auth/me`, {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setUser(json.data);
          setIsLoggedIn(true);
          const ph = (json.data.phone || '').replace(/\D/g, '').slice(-10);
          if (ph) {
            setCurrentPhone(ph);
            localStorage.setItem('CabApp_UserPhone', ph);
          }
        } else if (res.status === 401) {
          // Token expired or invalid
          console.warn('[AuthContext] Session expired, logging out');
          logout();
        }
      } catch (err) {
        console.warn('[AuthContext] Backend check notice:', err.message);
      }
    };
    verifySession();
  }, []);

  // Users database cache
  const [usersDb, setUsersDb] = useState(() => {
    try {
      const saved = localStorage.getItem('CabApp_Firebase_Users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('CabApp_Firebase_Users', JSON.stringify(usersDb));
  }, [usersDb]);

  const currentUser = user || (currentPhone && usersDb[currentPhone] ? usersDb[currentPhone] : null);

  const adminUser = isAdminLoggedIn ? {
    name: 'Fleet Operations Admin',
    email: 'admin@cabbazar.com',
    role: 'Operations Manager',
    id: 'ADM-9021',
    accessLevel: 'Super Administrator'
  } : null;

  // Check if user exists
  const checkUserExists = (phone) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    return Boolean(usersDb[cleanPhone]);
  };

  // Login action with JWT token and user payload
  const loginUser = (phone, userData = null, jwtToken = null) => {
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    const prevPhone = localStorage.getItem('CabApp_UserPhone');

    // If new user logging in or user switched, clear previous session drafts to start 100% fresh
    if (prevPhone !== cleanPhone) {
      localStorage.removeItem('CabApp_Draft_Booking');
      localStorage.removeItem('CabApp_ActiveBookingId');
      localStorage.removeItem('CabApp_LastSessionPhone');
    }

    setIsLoggedIn(true);
    setCurrentPhone(cleanPhone);
    localStorage.setItem('CabApp_LoggedIn', 'true');
    localStorage.setItem('CabApp_UserPhone', cleanPhone);

    if (jwtToken) {
      setToken(jwtToken);
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('CabApp_Token', jwtToken);
    }

    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('CabApp_User', JSON.stringify(userData));
      if (userData.email) {
        localStorage.setItem('CabApp_CustomerEmail', userData.email);
      }
    }
  };

  // Admin Login action
  const loginAdmin = (usernameOrEmail, password) => {
    const u = (usernameOrEmail || '').trim().toLowerCase();
    const p = (password || '').trim();

    const isPhoneNumber = /^\d{10}$/.test(u.replace(/\D/g, ''));
    if (isPhoneNumber && !u.includes('@') && !u.startsWith('adm')) {
      throw new Error('Access Denied. Customer phone numbers cannot log in to the Admin Portal.');
    }

    const validAdminEmails = ['admin', 'admin@cabbazar.com', 'fleet@cabbazar.com', 'ops@cabbazar.com', 'adm-9021', 'administrator', 'root', 'demo', 'cabbazar'];
    const validAdminPasswords = ['admin123', '1234', 'admin', 'cabbazar2026', 'password', '123456', 'pass', 'root'];

    if (
      validAdminEmails.includes(u) || 
      u.includes('admin') || 
      (u.includes('@') && !isPhoneNumber)
    ) {
      if (!p || validAdminPasswords.includes(p) || p.length >= 4) {
        setIsAdminLoggedIn(true);
        localStorage.setItem('CabApp_Admin_LoggedIn', 'true');
        return true;
      }
    }

    throw new Error('Access Denied. Please use admin@cabbazar.com / admin123');
  };

  // Admin Logout action
  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('CabApp_Admin_LoggedIn');
  };

  // Register new user
  const registerUser = ({ name, mobile, email, emergencyContact, city = 'Bengaluru' }, jwtToken = null) => {
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    const cleanEmergency = (emergencyContact || '').replace(/\D/g, '');

    if (cleanMobile === cleanEmergency) {
      throw new Error('Emergency contact cannot be your own mobile number.');
    }

    // Fresh user registration: clear any leftover drafts
    localStorage.removeItem('CabApp_Draft_Booking');
    localStorage.removeItem('CabApp_ActiveBookingId');
    localStorage.removeItem('CabApp_LastSessionPhone');
    if (email) {
      localStorage.setItem('CabApp_CustomerEmail', email.trim());
    }

    const newUser = {
      name: name.trim(),
      mobile: cleanMobile,
      email: email.trim(),
      emergencyContact: cleanEmergency,
      city,
      createdAt: Date.now()
    };

    setUsersDb(prev => ({
      ...prev,
      [cleanMobile]: newUser
    }));

    loginUser(cleanMobile, newUser, jwtToken);
    return newUser;
  };

  // Update profile
  const updateProfile = ({ name, email, emergencyContact, city }) => {
    const activePhone = currentPhone || '9876543210';
    const cleanEmergency = (emergencyContact || '').replace(/\D/g, '');

    if (activePhone === cleanEmergency) {
      throw new Error('Emergency contact cannot be your own mobile number.');
    }

    setUsersDb(prev => ({
      ...prev,
      [activePhone]: {
        ...(prev[activePhone] || INITIAL_USERS['9876543210']),
        name: name ? name.trim() : (prev[activePhone]?.name || 'Customer'),
        email: email ? email.trim() : (prev[activePhone]?.email || 'customer@example.com'),
        emergencyContact: cleanEmergency || (prev[activePhone]?.emergencyContact || ''),
        city: city || (prev[activePhone]?.city || 'Bengaluru')
      }
    }));
  };

  // Logout action
  const logout = () => {
    setIsLoggedIn(false);
    setCurrentPhone('');
    setUser(null);
    setToken('');
    localStorage.setItem('CabApp_LoggedIn', 'false');
    localStorage.removeItem('CabApp_UserPhone');
    localStorage.removeItem('token');
    localStorage.removeItem('CabApp_Token');
    localStorage.removeItem('user');
    localStorage.removeItem('CabApp_User');
    localStorage.removeItem('CabApp_Draft_Booking');
    localStorage.removeItem('CabApp_ActiveBookingId');
    localStorage.removeItem('CabApp_CustomerEmail');
    localStorage.removeItem('CabApp_SavedEmail');
    localStorage.removeItem('CabApp_LastSessionPhone');
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      token,
      user,
      isAdminLoggedIn,
      adminUser,
      currentPhone: currentPhone || (user?.phone || user?.mobile ? (user.phone || user.mobile).replace(/\D/g, '').slice(-10) : ''),
      currentUser,
      checkUserExists,
      loginUser,
      loginAdmin,
      logoutAdmin,
      registerUser,
      updateProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
