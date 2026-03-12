import { useState } from 'react';
import type { JSX } from 'react';
import { Modal } from '@/components/ui/Modal';
import { login } from '@/features/auth/auth.api';
import { useAppShellStore } from '@/features/auth/auth.store';
import { ApiError } from '@/lib/api/client';

export function LoginModal(): JSX.Element {
  const visible = useAppShellStore((state) => state.loginVisible);
  const hideLogin = useAppShellStore((state) => state.hideLogin);
  const setAuthSession = useAppShellStore((state) => state.setAuthSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal visible={visible} id="loginModal">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">TradingHub Login</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();

            setErrorText('');

            if (!email || !password) {
              setErrorText('Please enter email and password');
              return;
            }

            setSubmitting(true);

            try {
              const response = await login({ email, password });

              if ('requires2FA' in response && response.requires2FA) {
                setErrorText('Two-factor verification is required for this account. This frontend slice does not implement the second-step 2FA screen yet.');
                return;
              }

              if ('accessToken' in response) {
                setAuthSession({
                  accessToken: response.accessToken,
                  refreshToken: response.refreshToken,
                  user: response.user,
                });
                hideLogin();
                return;
              }

              setErrorText('Login failed');
            } catch (error) {
              console.error('Login error:', error);

              if (error instanceof ApiError) {
                setErrorText(error.message);
              } else {
                setErrorText('An error occurred. Please try again.');
              }
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <input
              type="email"
              id="loginEmail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <input
              type="password"
              id="loginPassword"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              required
            />
          </div>
          <div id="loginError" className={`${errorText ? '' : 'hidden '}mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg`}>
            <p className="text-red-400 text-sm text-center">{errorText}</p>
          </div>
          <button
            type="submit"
            id="loginBtn"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            disabled={submitting}
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account? <a href="#" className="text-blue-500 hover:text-blue-400">Contact Support</a>
        </p>
      </div>
    </Modal>
  );
}
