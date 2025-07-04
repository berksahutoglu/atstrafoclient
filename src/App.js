import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import RequestForm from './pages/RequestForm';
import RequestApproval from './pages/ RequestApproval';
import RequestDelivery from './pages/RequestDelivery';
import SalesRequestForm from './pages/SalesRequestForm';
import MultiSalesRequestForm from './pages/MultiSalesRequestForm';
import ProductionDashboard from './pages/ProductionDashboard';
import ProjectManagement from './pages/ProjectManagement';
import MultiRequestForm from './pages/MultiRequestForm';
import Navbar from './components/Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Korumalı Route bileşeni
const ProtectedRoute = ({ children, roles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div className="container mt-4">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Navigate to="/requests" />
                </ProtectedRoute>
              } />
              
              <Route path="/requests" element={
                <ProtectedRoute roles={['ROLE_REQUESTER']}>
                  <MultiRequestForm />
                </ProtectedRoute>
              } />
              
              <Route path="/approvals" element={
                <ProtectedRoute roles={['ROLE_APPROVER']}>
                  <RequestApproval />
                </ProtectedRoute>
              } />
              
              <Route path="/deliveries" element={
                <ProtectedRoute roles={['ROLE_RECEIVER']}>
                  <RequestDelivery />
                </ProtectedRoute>
              } />
              
              <Route path="/sales" element={
                <ProtectedRoute roles={['ROLE_SALESANDMARKETING']}>
                  <MultiSalesRequestForm />
                </ProtectedRoute>
              } />
              
              <Route path="/projects" element={
                <ProtectedRoute roles={['ROLE_SALESANDMARKETING']}>
                  <ProjectManagement />
                </ProtectedRoute>
              } />
              
              <Route path="/production" element={
                <ProtectedRoute roles={['ROLE_PRODUCTION']}>
                  <ProductionDashboard />
                </ProtectedRoute>
              } />
              
              {/* Geçersiz yollar için ana sayfaya yönlendirme */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;