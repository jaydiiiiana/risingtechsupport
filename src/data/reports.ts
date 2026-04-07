export interface TroubleshootingReport {
  id: string;
  problem: string;
  description: string;
  possibleError: string;
  suggestedSolution: string;
  frequency: string;
  icon: string;
  estimatedCost?: string;
}

export const reports: TroubleshootingReport[] = [
  {
    id: 'pc-power',
    problem: 'PC not turning on',
    description: 'The device fails to power up or show signs of life when the power button is pressed.',
    possibleError: 'Loose power cable, faulty PSU (Power Supply Unit), motherboard failure, or drained battery (for laptops).',
    suggestedSolution: 'Check all power connections, try a different outlet, perform a hard reset, or test with a known good power adapter.',
    frequency: '85% (High)',
    icon: 'MonitorOff',
    estimatedCost: '₱0 - ₱7,500 (Depending on part)',
  },
  {
    id: 'no-internet',
    problem: 'No internet connection',
    description: 'The device is unable to access the local network or the internet, showing "No internet" or disconnected status.',
    possibleError: 'Router/Modem issues, ISP outage, incorrect Wi-Fi password, or faulty network drivers.',
    suggestedSolution: 'Restart the router, toggle Airplane mode, forget and reconnect to the network, or flush DNS settings.',
    frequency: '92% (Very High)',
    icon: 'WifiOff',
    estimatedCost: 'Free (In-house fix)',
  },
  {
    id: 'app-loading',
    problem: 'Application not loading once opened',
    description: 'The application launches, but either crashes immediately, hangs on a splash screen, or fails to initialize.',
    possibleError: 'Corrupted application files, insufficient system resources, incompatible OS version, or background process conflicts.',
    suggestedSolution: 'Update the application, clear cache/temporary files, reinstall the app, or check for system updates.',
    frequency: '78% (Moderate)',
    icon: 'AppWindow',
    estimatedCost: 'Free (Software fix)',
  },
];
