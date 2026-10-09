import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import MobileFrame from './components/MobileFrame';
import SideDrawer from './components/SideDrawer';
import Toast from './components/Toast';

// Production Screens (Firebase Email/Password Auth & Customer/Admin Portals)
import Screen2Login from './screens/Screen2Login';
import Screen4Register from './screens/Screen4Register';
import Screen5Home from './screens/Screen5Home';
import Screen6Fare from './screens/Screen6Fare';
import Screen6bCustomerDetails from './screens/Screen6bCustomerDetails';
import Screen7Payment from './screens/Screen7Payment';
import Screen8BookingStatus from './screens/Screen8BookingStatus';
import Screen9MyBookings from './screens/Screen9MyBookings';
import Screen10Profile from './screens/Screen10Profile';
import Screen11CompletedTrips from './screens/Screen11CompletedTrips';
import Screen12ContactUs from './screens/Screen12ContactUs';
import AppUpdateModal from './components/AppUpdateModal';
import { checkForAppUpdate } from './services/appUpdateService';

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [currentScreen, setCurrentScreen] = useState(() => {
    const hasToken = Boolean(localStorage.getItem('token') || localStorage.getItem('CabApp_Token'));
    const hasUser = Boolean(localStorage.getItem('user') || localStorage.getItem('CabApp_User'));
    if (hasToken && hasUser) {
      return 'HomeScreen';
    }
    return 'LoginScreen';
  });

  // Sync screen if auth state changes
  React.useEffect(() => {
    if (isLoggedIn && currentScreen === 'LoginScreen') {
      setCurrentScreen('HomeScreen');
    }
  }, [isLoggedIn, currentScreen]);
  const [screenParams, setScreenParams] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 3500);
  };

  const handleNavigate = (screenId, params = {}) => {
    setScreenParams(params);
    setCurrentScreen(screenId);
  };

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateModalAutoCheck, setUpdateModalAutoCheck] = useState(false);
  const [isStartupPrompt, setIsStartupPrompt] = useState(false);

  // Automatic, non-intrusive Google Play update check on application launch
  React.useEffect(() => {
    let isMounted = true;
    const runStartupCheck = async () => {
      try {
        const res = await checkForAppUpdate();
        if (!isMounted) return;
        if (res && (res.updateAvailable || res.isDownloaded)) {
          const lastDismissed = localStorage.getItem('CabApp_UpdatePromptDismissed');
          const now = Date.now();
          const isCritical = res.isImmediateAllowed && !res.isFlexibleAllowed;
          // Prompt if critical OR not dismissed in last 24h
          if (isCritical || !lastDismissed || (now - parseInt(lastDismissed, 10)) > 24 * 60 * 60 * 1000) {
            setIsStartupPrompt(true);
            setUpdateModalAutoCheck(false);
            setIsUpdateModalOpen(true);
          }
        }
      } catch (_) {
        // Silently continue if check fails so app launch is never impeded
      }
    };

    const timer = setTimeout(runStartupCheck, 1800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleOpenUpdateModal = () => {
    setIsStartupPrompt(false);
    setUpdateModalAutoCheck(true);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    if (isStartupPrompt) {
      try {
        localStorage.setItem('CabApp_UpdatePromptDismissed', Date.now().toString());
      } catch (_) {}
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'LoginScreen':
        return <Screen2Login onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'RegisterScreen':
        return <Screen4Register params={screenParams} onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'HomeScreen':
        return (
          <Screen5Home 
            onNavigate={handleNavigate} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onShowToast={showToast} 
          />
        );
      case 'FareScreen':
        return <Screen6Fare onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'CustomerDetailsScreen':
        return <Screen6bCustomerDetails onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'PaymentScreen':
        return <Screen7Payment onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'BookingStatusScreen':
        return <Screen8BookingStatus onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'MyBookingsScreen':
        return (
          <Screen9MyBookings 
            onNavigate={handleNavigate} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onShowToast={showToast} 
          />
        );
      case 'ProfileScreen':
        return (
          <Screen10Profile 
            onNavigate={handleNavigate} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onShowToast={showToast} 
            onCheckForUpdates={handleOpenUpdateModal}
          />
        );
      case 'CompletedTripsScreen':
        return (
          <Screen11CompletedTrips 
            onNavigate={handleNavigate} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onShowToast={showToast} 
          />
        );
      case 'ContactUsScreen':
        return (
          <Screen12ContactUs 
            onNavigate={handleNavigate} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onShowToast={showToast} 
          />
        );
      default:
        return <Screen2Login onNavigate={handleNavigate} onShowToast={showToast} />;
    }
  };

  return (
    <MobileFrame>
      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onNavigate={handleNavigate} 
        onCheckForUpdates={handleOpenUpdateModal}
      />
      {renderScreen()}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />
      <AppUpdateModal 
        isOpen={isUpdateModalOpen}
        onClose={handleCloseUpdateModal}
        onShowToast={showToast}
        autoCheck={updateModalAutoCheck}
        isStartup={isStartupPrompt}
      />
    </MobileFrame>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BookingProvider>
          <AppContent />
        </BookingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
