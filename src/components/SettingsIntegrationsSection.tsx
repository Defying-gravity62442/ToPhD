import CalendarSettings from './CalendarSettings';

interface SettingsIntegrationsSectionProps {
  decryptedGoals: any[];
}

export default function SettingsIntegrationsSection({ decryptedGoals }: SettingsIntegrationsSectionProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-['Nanum_Myeongjo']">Integrations</h2>
      <CalendarSettings decryptedGoals={decryptedGoals} />
    </div>
  );
} 