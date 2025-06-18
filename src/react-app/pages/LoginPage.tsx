import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await loginUser(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <h2>Login</h2>
            <form onSubmit={handleSubmit} className="auth-form">
                {error && <p className="error-message">{error}</p>}
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </div>
    );
};
export default LoginPage;
