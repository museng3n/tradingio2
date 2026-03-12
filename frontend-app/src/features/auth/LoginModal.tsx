import { Modal } from '@/components/ui/Modal';
import { useAppShellStore } from '@/features/auth/auth.store';

export function LoginModal(): JSX.Element {
  const visible = useAppShellStore((state) => state.loginVisible);

  return (
    <Modal visible={visible} id="loginModal">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">TradingHub Login</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
          <input
            type="email"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            disabled
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
          <input
            type="password"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            disabled
          />
        </div>
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-xs text-center">DEV MODE: Any email/password will work</p>
        </div>
        <button
          type="button"
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors opacity-50 cursor-not-allowed"
          disabled
        >
          Login
        </button>
      </div>
    </Modal>
  );
}
