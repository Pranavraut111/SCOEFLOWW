import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import axios from 'axios'

// Global axios configuration for production deployments
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

createRoot(document.getElementById("root")!).render(<App />);
