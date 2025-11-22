import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Components/Login';
import DealerStaff from './Components/DealerStaff';
import DealerManager from './Components/DealerManager';
import Admin from './Components/Admin';
import EVMStaff from './Components/EVMStaff';
import NotificationContainer from './Components/Notification';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in when app starts
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        const storedUser = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          
          if (userData.username && (userData.roleName || userData.role)) {
            setUser(userData);
            window.authToken = storedToken;
          } else {
            clearStoredAuth();
          }
        }
      } catch (error) {
        clearStoredAuth();
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAuth();
  }, []);

  const clearStoredAuth = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('token');
    delete window.authToken;
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      clearStoredAuth();
      setUser(null);
      // Clear URL hash when logging out
      window.location.hash = '';
    } catch (error) {
      clearStoredAuth();
      setUser(null);
      // Clear URL hash when logging out
      window.location.hash = '';
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  // Show login if no user
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderUserInterface = () => {
    const userRole = user.roleName || user.role;
    
    switch (userRole) {
      case 'DealerStaff':
        return <DealerStaff user={user} onLogout={handleLogout} />;
      
      case 'DealerManager':
        return <DealerManager user={user} onLogout={handleLogout} />;
      
      case 'EVMStaff':
        return <EVMStaff user={user} onLogout={handleLogout} />;
      
      case 'Admin':
        return <Admin user={user} onLogout={handleLogout} />;
      
      default:
        handleLogout();
        return <Login onLogin={handleLogin} />;
    }
  };

  return (
    <div className="App">
      <NotificationContainer />
      {renderUserInterface()}
    </div>
  );
}

export default App;
