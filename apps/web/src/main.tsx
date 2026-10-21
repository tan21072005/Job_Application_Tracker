import React from 'react';
import { createRoot } from 'react-dom/client';
import JobTrack from './JobTrack';
import ErrorBoundary from './components/ErrorBoundary';
import './jobtrack.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><JobTrack /></ErrorBoundary></React.StrictMode>);
