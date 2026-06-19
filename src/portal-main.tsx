import { render } from 'preact';
import './styles/variables.css';
import './styles/base.css';
import ParticleBg from './components/particle-bg';
import CaptivePortal from './routes/captive-portal';

function PortalApp() {
  return (
    <>
      <ParticleBg />
      <CaptivePortal />
    </>
  );
}

render(<PortalApp />, document.getElementById('app')!);
