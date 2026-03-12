import { Modal } from '@/components/ui/Modal';
import { useAppShellStore } from '@/features/auth/auth.store';

export function LoginModal(): JSX.Element {
  const visible = useAppShellStore((state) => state.loginVisible);

  return (
    <Modal visible={visible} id="loginModal">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">TradingHub Login</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <input
              type="email"
              id="loginEmail"
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
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              required
            />
          </div>
          <div id="loginError" className="hidden mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm text-center"></p>
          </div>
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-400 text-xs text-center">{'\u{1F527} DEV MODE: Any email/password will work'}</p>
          </div>
          <button
            type="submit"
            id="loginBtn"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account? <a href="#" className="text-blue-500 hover:text-blue-400">Contact Support</a>
        </p>
      </div>
    </Modal>
  );
}
