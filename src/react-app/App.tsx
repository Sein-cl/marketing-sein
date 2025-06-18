import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DomainDetailsPage from './pages/DomainDetailsPage'; // Import the new page
import { isAuthenticated, logoutUser } from './services/api';
import './App.css'; // Ensure this file exists

const ProtectedRoute: React.FC = () => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

const AppHeader: React.FC = () => {
    const handleLogout = () => {
        logoutUser();
        // Force re-render or navigate. window.location.href is simple for now.
        window.location.href = '/login';
    };

    return (
        <header className="app-header">
            <h1>Certificate Manager</h1>
            <nav>
                {isAuthenticated() ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </>
                )}
            </nav>
        </header>
    );
};


function App() {
    return (
        <BrowserRouter>
            <AppHeader />
            <main className="app-main">
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/dashboard/domains/:domainId" element={<DomainDetailsPage />} /> {/* New Route */}
                    </Route>
                    <Route path="/" element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                    <Route path="*" element={<Navigate to="/" />} /> {/* Basic catch-all */}
                </Routes>
            </main>
        </BrowserRouter>
    );
}
export default App;
