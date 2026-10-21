import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/ibm-plex-sans-condensed/400.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/600.css';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
