import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/forced-colors.css';
import 'antd/dist/reset.css';
import 'react-quill/dist/quill.snow.css';
import './styles/quill-chinese.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);