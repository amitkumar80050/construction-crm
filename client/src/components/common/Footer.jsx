import React from 'react';
import { FaLinkedin, FaTwitter, FaGithub } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer mt-auto py-3 bg-light border-top">
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div>
          <span className="text-muted">© {new Date().getFullYear()} Construction CRM.</span>
          <span className="text-muted ms-2">Built for better lead tracking.</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="text-muted">
            <FaLinkedin />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-muted">
            <FaTwitter />
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-muted">
            <FaGithub />
          </a>
          <small className="text-muted">v1.0</small>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
