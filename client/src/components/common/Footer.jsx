import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaLinkedin, FaTwitter, FaGithub, FaFacebook, FaInstagram, FaYoutube,
  FaArrowUp, FaCommentDots, FaMoon, FaSun, FaCircle, FaQuestionCircle,
  FaTimes, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaServer,
  FaDatabase, FaKeyboard
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import api from "../../services/api";
import "./Footer.css";

const APP_VERSION = "1.0.0";

const Footer = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const isAdmin = user?.role === "admin";

  const [now, setNow] = useState(new Date());
  const [serverStatus, setServerStatus] = useState("checking");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      await api.get("/health");
      setServerStatus("online");
    } catch (error) {
      setServerStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        setShowShortcuts(true);
      }
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowFeedback(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSubmitFeedback = () => {
    setShowFeedback(false);
    setFeedbackText("");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/clients", label: "Leads" },
    { to: "/users", label: "Users", adminOnly: true },
    { to: "/analytics", label: "Analytics" },
    { to: "/reminders", label: "Reminders" },
    { to: "/settings", label: "Settings" }
  ];

  const supportLinks = [
    { href: "#", label: "Documentation" },
    { href: "#", label: "Help Center" },
    { href: "mailto:support@buildtrackpro.com", label: "Contact Support" },
    { href: "#", label: "FAQ" },
    { href: "#", label: "Report a Bug" },
    { href: "#", label: "Feature Request" }
  ];

  const socialLinks = [
    { href: "https://www.linkedin.com", icon: FaLinkedin, label: "LinkedIn" },
    { href: "https://twitter.com", icon: FaTwitter, label: "Twitter" },
    { href: "https://github.com", icon: FaGithub, label: "GitHub" },
    { href: "https://www.facebook.com", icon: FaFacebook, label: "Facebook" },
    { href: "https://www.instagram.com", icon: FaInstagram, label: "Instagram" },
    { href: "https://www.youtube.com", icon: FaYoutube, label: "YouTube" }
  ];

  return (
    <>
      <footer className="footer-fade-in mt-auto bg-light border-top" style={{ fontSize: "14px" }} role="contentinfo">
        <div className="container-fluid px-4 py-4">
          <div className="row g-4">
            <div className="col-6 col-md-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span style={{ fontSize: "22px" }}>{"\uD83C\uDFD7\uFE0F"}</span>
                <strong style={{ color: "#1e293b" }}>BuildTrack Pro <br />Amit kumar</strong>
              </div>
              <p className="text-muted mb-1" style={{ fontSize: "12px" }}>Version {APP_VERSION}</p>
              <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
                (c) {new Date().getFullYear()} BuildTrack Pro.<br />All rights reserved.
              </p>
            </div>

            <div className="col-6 col-md-3">
              <strong className="d-block mb-2" style={{ color: "#1e293b", fontSize: "13px" }}>Quick Navigation</strong>
              <ul className="list-unstyled mb-0 d-grid gap-2">
                {navLinks.filter((link) => !link.adminOnly || isAdmin).map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="footer-link" style={{ fontSize: "13px" }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-6 col-md-3">
              <strong className="d-block mb-2" style={{ color: "#1e293b", fontSize: "13px" }}>Support</strong>
              <ul className="list-unstyled mb-0 d-grid gap-2">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="footer-link" style={{ fontSize: "13px" }}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-6 col-md-3">
              <strong className="d-block mb-2" style={{ color: "#1e293b", fontSize: "13px" }}>Contact</strong>
              <ul className="list-unstyled mb-0 d-grid gap-2" style={{ fontSize: "13px" }}>
                <li>
                  <a href="mailto:support@buildtrackpro.com" className="footer-link d-flex align-items-center gap-2">
                    <FaEnvelope size={11} /> amityadav50800@gmail.com
                  </a>
                </li>
                <li>
                  <a href="tel:+911234567890" className="footer-link d-flex align-items-center gap-2">
                    <FaPhone size={11} /> +91 9169137366
                  </a>
                </li>
                <li>
                  <a href="https://buildtrackpro.com" target="_blank" rel="noreferrer" className="footer-link d-flex align-items-center gap-2">
                    <FaGlobe size={11} /> buildtrackpro.com
                  </a>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <FaMapMarkerAlt size={11} style={{ marginTop: "2px" }} /> Lucknow, Uttar Pradesh, India
                </li>
              </ul>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-2 mt-4">
            {socialLinks.map((social) => {
              const IconComponent = social.icon;
              return React.createElement(
                "a",
                {
                  key: social.label,
                  href: social.href,
                  target: "_blank",
                  rel: "noreferrer",
                  className: "footer-social-icon",
                  title: social.label,
                  "aria-label": social.label
                },
                React.createElement(IconComponent, { size: 14 })
              );
            })}
          </div>
        </div>

        <div className="border-top py-2 px-4" style={{ background: "#f8fafc" }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ fontSize: "12px" }}>
            <div className="d-flex flex-wrap align-items-center gap-3 text-muted">
              <span>(c) {new Date().getFullYear()} BuildTrack Pro</span>
              <span className="d-none d-md-inline">v{APP_VERSION}</span>

              <span className="d-flex align-items-center gap-1" title={serverStatus === "online" ? "Server & database reachable" : "Server unreachable"}>
                <FaServer size={10} />
                <FaCircle size={7} color={serverStatus === "online" ? "#22c55e" : serverStatus === "offline" ? "#ef4444" : "#f59e0b"} />
                Server {serverStatus === "checking" ? "..." : serverStatus}
              </span>

              <span className="d-none d-lg-flex align-items-center gap-1" title="Database connection status">
                <FaDatabase size={10} />
                <FaCircle size={7} color={serverStatus === "online" ? "#22c55e" : serverStatus === "offline" ? "#ef4444" : "#f59e0b"} />
                DB {serverStatus === "checking" ? "..." : serverStatus}
              </span>

              <span className="d-none d-md-inline" title="Current date & time">
                {now.toLocaleString()}
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-3">
              {user && (
                <span className="text-muted d-flex align-items-center gap-1">
                  {user.name} <em className="text-capitalize">({user.role})</em>
                </span>
              )}

              <button type="button" onClick={() => setShowShortcuts(true)} className="btn btn-sm btn-outline-secondary footer-ripple py-0 px-2" title="Keyboard shortcuts (press ?)" aria-label="Keyboard shortcuts">
                <FaQuestionCircle size={11} />
              </button>

              <button type="button" onClick={toggleDarkMode} className="btn btn-sm btn-outline-secondary footer-ripple py-0 px-2" title={darkMode ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
                {darkMode ? <FaSun size={11} /> : <FaMoon size={11} />}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button onClick={scrollToTop} className="footer-scroll-top footer-ripple" title="Scroll to top" aria-label="Scroll to top">
          <FaArrowUp size={16} />
        </button>
      )}

      <button onClick={() => setShowFeedback(true)} className="footer-feedback-btn footer-ripple" title="Send feedback" aria-label="Send feedback">
        <FaCommentDots size={14} /> Feedback
      </button>

      {showFeedback && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 2000 }} onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-3 shadow p-4" style={{ maxWidth: "420px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Send Feedback</h6>
              <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setShowFeedback(false)}>
                <FaTimes />
              </button>
            </div>
            <textarea className="form-control mb-3" rows={4} placeholder="Tell us what's working, what's not, or what you'd like to see..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-sm btn-light" onClick={() => setShowFeedback(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleSubmitFeedback} disabled={!feedbackText.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 2000 }} onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-3 shadow p-4" style={{ maxWidth: "420px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 d-flex align-items-center gap-2"><FaKeyboard /> Keyboard Shortcuts</h6>
              <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setShowShortcuts(false)}>
                <FaTimes />
              </button>
            </div>
            <table className="table table-sm mb-0" style={{ fontSize: "13px" }}>
              <tbody>
                <tr><td><kbd>?</kbd></td><td>Open this shortcuts panel</td></tr>
                <tr><td><kbd>Esc</kbd></td><td>Close any open dialog</td></tr>
                <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Quick search (if enabled)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
