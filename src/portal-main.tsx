import { render } from 'preact';
import ParticleBg from './components/particle-bg';
import PwaModal from './components/pwa-modal';
import CaptivePortal from './routes/captive-portal';

function PortalApp() {
  return (
    <>
      <ParticleBg />
      <PwaModal />
      <CaptivePortal />
    </>
  );
}

render(<PortalApp />, document.getElementById('app')!);
