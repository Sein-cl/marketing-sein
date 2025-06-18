import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            await registerUser(email, password);
            setSuccess('Registration successful! Please login.');
            // navigate('/login'); // Or show success message and let user click link
        } catch (err: any) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <h2>Register</h2>
            <form onSubmit={handleSubmit} className="auth-form">
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                 <div>
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
            </form>
            <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
    );
};
export default RegisterPage;
