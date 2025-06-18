// src/react-app/pages/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage'; // Adjust path assuming it's in the same directory or ../pages/
import * as api from '../services/api';

// Mock react-router-dom's useNavigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal(); // vitest recommends this for partial mocks
  return {
    ...(actual as any), // Import and retain default behavior
    useNavigate: () => mockedNavigate, // Override useNavigate
  };
});

// Mock api service module
vi.mock('../services/api');

describe('LoginPage', () => {
    beforeEach(() => {
        vi.resetAllMocks(); // Reset mocks before each test

        // Ensure localStorage is clean for each test if not handled by global setup's afterEach
        // Or if specific mock states are needed per test.
        // window.localStorage.clear(); // Assuming localStorageMock from setupTests.ts has clear()

        // Reset fetch mock if it's globally defined and modified by tests
        if (global.fetch && (global.fetch as any).mockClear) {
            (global.fetch as ReturnType<typeof vi.fn>).mockClear();
        }
    });

    it('renders login form correctly', () => {
        render(<LoginPage />, { wrapper: BrowserRouter });
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('allows user to type into email and password fields', async () => {
        render(<LoginPage />, { wrapper: BrowserRouter });
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

        // userEvent is generally preferred for simulating user interactions
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        await fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(emailInput.value).toBe('test@example.com');
        expect(passwordInput.value).toBe('password123');
    });

    it('calls loginUser API on submit and navigates on success', async () => {
        // Ensure the mock is properly typed if using vi.mocked
        const mockedLoginUser = vi.mocked(api.loginUser);
        mockedLoginUser.mockResolvedValueOnce({
            token: 'fake_token', userId: '123', email: 'test@example.com'
        });

        render(<LoginPage />, { wrapper: BrowserRouter });

        await fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        await fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        await fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(mockedLoginUser).toHaveBeenCalledWith('test@example.com', 'password123');
        });
        await waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('displays error message on login failure', async () => {
        const mockedLoginUser = vi.mocked(api.loginUser);
        mockedLoginUser.mockRejectedValueOnce(new Error('Invalid credentials'));

        render(<LoginPage />, { wrapper: BrowserRouter });

        await fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        await fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
        await fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
             expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
        expect(mockedNavigate).not.toHaveBeenCalled();
    });
});
