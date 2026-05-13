import { render } from 'preact';
import App from './app';
import './styles/variables.css';
import './styles/base.css';

render(<App />, document.getElementById('app')!);
