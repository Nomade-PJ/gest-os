import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Removendo as importações que causam problemas no build da Vercel
// A Vercel irá automaticamente injetar o Analytics e o Speed Insights
// durante o processo de deploy quando ativados no painel da Vercel

createRoot(document.getElementById("root")).render(<App />);
