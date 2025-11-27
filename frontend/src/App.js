import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import DeviceManagementPage from './DeviceManagementPage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveView('dashboard');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <h2>⏳ Đang tải...</h2>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {user ? (
        activeView === 'deviceManagement' ? (
          <DeviceManagementPage
            user={user}
            onBack={() => setActiveView('dashboard')}
          />
        ) : (
          <DashboardPage
            user={user}
            onLogout={handleLogout}
            onManageDevices={() => setActiveView('deviceManagement')}
          />
        )
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;