import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
