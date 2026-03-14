import { useRef } from 'react';
import type { JSX } from 'react';
import {
  BlockedSymbolsSection,
  type BlockedSymbolsSectionHandle,
} from '@/features/settings/components/BlockedSymbolsSection';
import {
  PositionSecuritySection,
  type PositionSecuritySectionHandle,
} from '@/features/settings/components/PositionSecuritySection';
import {
  RiskManagementSection,
  type RiskManagementSectionHandle,
} from '@/features/settings/components/RiskManagementSection';
import {
  TelegramChannelsSection,
  type TelegramChannelsSectionHandle,
} from '@/features/settings/components/TelegramChannelsSection';
import { TelegramRuntimeSection } from '@/features/settings/components/TelegramRuntimeSection';
import {
  TPStrategySection,
  type TPStrategySectionHandle,
} from '@/features/settings/components/TPStrategySection';

export function SettingsPage(): JSX.Element {
  const blockedSymbolsRef = useRef<BlockedSymbolsSectionHandle>(null);
  const positionSecurityRef = useRef<PositionSecuritySectionHandle>(null);
  const riskManagementRef = useRef<RiskManagementSectionHandle>(null);
  const telegramChannelsRef = useRef<TelegramChannelsSectionHandle>(null);
  const tpStrategyRef = useRef<TPStrategySectionHandle>(null);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-muted">Configure your trading preferences and signal sources</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RiskManagementSection ref={riskManagementRef} />

        <TelegramChannelsSection ref={telegramChannelsRef} />

        <TelegramRuntimeSection />

        <PositionSecuritySection ref={positionSecurityRef} />

        <TPStrategySection ref={tpStrategyRef} />

        <BlockedSymbolsSection ref={blockedSymbolsRef} />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            void Promise.all([
              blockedSymbolsRef.current?.save(),
              positionSecurityRef.current?.save(),
              riskManagementRef.current?.save(),
              telegramChannelsRef.current?.save(),
              tpStrategyRef.current?.save(),
            ]);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Changes
        </button>
      </div>
    </>
  );
}
