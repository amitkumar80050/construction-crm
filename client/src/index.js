
// Prevent browser passive event listener intervention warnings
if (typeof Event !== 'undefined' && Event.prototype) {
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (this && this.cancelable) {
      originalPreventDefault.call(this);
    }
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);