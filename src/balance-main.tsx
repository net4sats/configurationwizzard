import { render } from 'preact';
import './styles/variables.css';
import './styles/base.css';
import BalancePage from './routes/balance';

render(<BalancePage />, document.getElementById('app')!);
