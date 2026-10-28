import React from 'react';
import { FaTimes, FaPhoneAlt, FaRobot, FaServer, FaCheckCircle, FaExternalLinkAlt, FaKey, FaWaveSquare } from 'react-icons/fa';

const TelephonyGuideModal = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2100,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          color: 'white',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', marginBottom: '8px' }}>
              <FaRobot color="#a5b4fc" /> AI Auto-Calling & PSTN Telephony Guide
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
              How Automated AI Calling Operates in this System
            </h2>
            <p style={{ margin: '6px 0 0', color: '#c7d2fe', fontSize: '13px', lineHeight: 1.5 }}>
              Connecting the CRM to real cellular/SIM phone networks and AI voice agents
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '28px', color: '#1e293b' }}>
          {/* Step 1: In-Browser Free Mode (Active Now) */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <FaCheckCircle color="#16a34a" size={18} />
              <h4 style={{ margin: 0, color: '#166534', fontSize: '15px', fontWeight: 700 }}>
                1. Free Built-In Browser Mode (Already Fully Active & Working)
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#15803d', lineHeight: 1.6 }}>
              This CRM includes a complete <strong>zero-cost real-time AI telecalling engine</strong> right in your browser. It uses <strong>Web Speech API (SpeechRecognition STT + SpeechSynthesis TTS)</strong> and dynamic Construction Sales Persuasion dialogue. It speaks to leads, handles objections, automatically upgrades pipeline stages, and notifies managers when site visits are confirmed without any paid telephony subscriptions.
            </p>
          </div>

          {/* Step 2: Architecture for Real PSTN Cellular Phone Calling */}
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            2. Connecting to Real Cellular Phone Numbers (SIM / PSTN Outbound Auto-Dialer)
          </h4>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
            To have the CRM automatically dial a lead's physical mobile number (+91 / +1), the system connects via a Telephony SIP / Webhook gateway:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            {/* Option A: Vapi / Bland AI */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                  <FaWaveSquare size={14} />
                </div>
                <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Option A: Turnkey AI Voice Agents (Vapi.ai / Bland.ai)</h5>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: '0 0 10px' }}>
                Ultra-low latency conversational AI that dials real phones. Has free trial credits ($10 free on sign-up).
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569' }}>
                <li>Sign up at <code>vapi.ai</code> or <code>bland.ai</code></li>
                <li>CRM triggers: <code>POST /call {"{phone, prompt}"}</code></li>
                <li>Returns live transcript + site visit webhook to this CRM!</li>
              </ul>
            </div>

            {/* Option B: Twilio / Exotel */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                  <FaPhoneAlt size={14} />
                </div>
                <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Option B: Twilio / Exotel Gateway</h5>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: '0 0 10px' }}>
                Direct telecom carrier. Twilio provides $15 free trial credit; Exotel provides Indian DID virtual numbers.
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569' }}>
                <li>Twilio Media Streams forwards audio to AI</li>
                <li>AI responds via TwiML <code>&lt;Say&gt;</code> or WebSocket</li>
                <li>Outcome automatically patches lead stage</li>
              </ul>
            </div>
          </div>

          {/* Workflow Diagram */}
          <div style={{
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.7,
            marginBottom: '20px'
          }}>
            <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>
              ⚡ End-to-End Automated Calling Workflow:
            </div>
            1. [CRM Lead Selected] → Reads Name, Budget, Property Interest, Stage<br />
            2. [AI Dialing] → Sophia AI introduces project with custom incentives<br />
            3. [Objection Handling] → Handles price, loans, RERA & structural warranty<br />
            4. [Site Visit Agreed] → Lead confirms inspection date & time<br />
            5. [Auto Stage Transition] → CRM auto-advances to SITE_VISIT_PLANNED<br />
            6. [Manager Alerted] → In-App & Email notification sent immediately<br />
            7. [Sales Executive Assigned] → Field agent dispatched with photo & GPS
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Understood, Return to Calling Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelephonyGuideModal;
