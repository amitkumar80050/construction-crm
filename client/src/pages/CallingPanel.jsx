import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  FaPhone, FaPhoneAlt, FaPhoneSlash, FaUser, FaClock, FaCheck, FaTimes,
  FaHistory, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaRobot, FaVolumeUp, FaVolumeMute, FaPaperPlane, FaMagic,
  FaCalendarCheck, FaUserTie, FaBuilding, FaSearch, FaFilter,
  FaInfoCircle, FaShieldAlt, FaComments, FaPlay, FaPause, FaCog, FaQuestionCircle,
  FaLanguage, FaKeyboard
} from 'react-icons/fa';
import leadService from '../services/leadService';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getMediaStreamSafely, createVirtualStream } from '../utils/virtualMedia';
import {
  formatCurrency, getLeadCredentials, generateOpeningPitch,
  generateAutoDialogue, generateAIResponse, analyzeCallOutcome
} from '../utils/aiConversationEngine';
import { advanceLeadPipelineSequentially } from '../utils/pipelineAutoAdvancer';
import AssignSalesExecutiveModal from '../components/calling/AssignSalesExecutiveModal';
import TelephonyGuideModal from '../components/calling/TelephonyGuideModal';

const STAGE_COLORS = {
  NEW: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  CONNECTED: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  INTERESTED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  FOLLOW_UP: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  SITE_VISIT_PLANNED: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  SITE_VISIT_DONE: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  QUOTATION: { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  CONVERTED: { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
};

const CallingPanel = () => {
  const { user } = useAuth();

  // State: Leads & Data
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  // State: Dual Language Selection ('hi' for Hindi, 'en-IN' for Indian English)
  const [selectedLanguage, setSelectedLanguage] = useState('hi');

  // State: Active Call Session
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAiCall, setIsAiCall] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // State: AI Interactive Telecalling
  const [transcript, setTranscript] = useState([]);
  const [userReplyText, setUserReplyText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSimulationActive, setAutoSimulationActive] = useState(false);
  const [autoSimStep, setAutoSimStep] = useState(0);
  const autoSimTimerRef = useRef(null);

  // State: Call Outcome & Modals
  const [callOutcome, setCallOutcome] = useState(null);
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTelephonyGuide, setShowTelephonyGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('crm_gemini_api_key') || '');
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [calls, setCalls] = useState([
    {
      id: 1,
      Lead: 'Amit yadav',
      phone: '9169137366',
      status: 'completed',
      duration: '3:15',
      date: new Date().toISOString().split('T')[0],
      notes: 'AI Telecaller: Customer confirmed site visit for Saturday 11 AM.',
      type: 'ai',
      stage: 'SITE_VISIT_PLANNED'
    }
  ]);

  // Video / Audio Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const transcriptBottomRef = useRef(null);

  // Load Leads from Backend
  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await leadService.getLeads();
      const fetched = res.data?.data || res.data || [];
      if (Array.isArray(fetched) && fetched.length > 0) {
        setLeads(fetched);
        if (!selectedLead) setSelectedLead(fetched[0]);
      } else {
        const LeadRes = await Leadservice.getLeads({ limit: 50 });
        const LeadData = LeadRes.data?.data || LeadRes.data || [];
        if (Array.isArray(LeadData) && LeadData.length > 0) {
          const mapped = LeadData.map(c => ({
            _id: c._id,
            name: c.name || c.company || 'Customer Lead',
            phone: c.phone || '9169137366',
            email: c.email || '',
            company: c.company || 'Green Valley Residences 3BHK',
            pipelineStage: c.pipelineStage || 'NEW',
            projectValue: c.projectValue || 5500000,
            address: c.address || { city: 'Noida' },
          }));
          setLeads(mapped);
          if (!selectedLead) setSelectedLead(mapped[0]);
        }
      }
    } catch (err) {
      console.warn('Unable to load leads, using fallback:', err.message);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Duration Timer
  useEffect(() => {
    let timer;
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  // Scroll transcript to bottom on new messages
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Initialize Web Speech Recognition with Hindi or Indian English
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (text) {
          handleLeadResponse(text);
        }
      };

      speechRecognitionRef.current = recognition;
    }
  }, [selectedLead, selectedLanguage]);

  // Format Duration seconds -> mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Text-To-Speech (TTS) with Language Support (Hindi or Indian English)
  const speakAI = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = selectedLanguage === 'hi' ? 0.95 : 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = null;

    if (selectedLanguage === 'hi') {
      utterance.lang = 'hi-IN';
      preferredVoice = voices.find(v => (v.lang && v.lang.includes('hi')) || (v.name && (v.name.includes('Hindi') || v.name.includes('हिन्दी') || v.name.includes('Kalpana') || v.name.includes('Swara'))));
    } else {
      utterance.lang = 'en-IN';
      preferredVoice = voices.find(v => (v.lang && v.lang.includes('en-IN')) || (v.name && (v.name.includes('India') || v.name.includes('Neerja') || v.name.includes('Prabhat') || v.name.includes('Google') || v.name.includes('Female'))));
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Trigger Real Cellular PSTN Outbound Call via Vapi (Indian English or Hindi)
  const triggerCellularCall = async (lead) => {
    const targetLead = lead || selectedLead;
    if (!targetLead) {
      toast.error('Please select a lead first');
      return;
    }
    const leadId = targetLead._id || targetLead.id || 'sample_lead_1';
    try {
      const langName = selectedLanguage === 'hi' ? 'Hindi (हिंदी)' : 'English (Indian)';
      toast.info(`Connecting Vapi.ai to dial ${targetLead.name}'s phone (${targetLead.phone}) in ${langName}...`);

      const res = await api.post(`/vapi/call/${leadId}`, {
        language: selectedLanguage,
        name: targetLead.name,
        phone: targetLead.phone,
        company: targetLead.company,
        projectValue: targetLead.projectValue,
      });

      if (res.data?.success) {
        toast.success(`📞 Cellular Call Dispatched! Sophia AI is now ringing ${res.data.dialedNumber || targetLead.phone} in ${langName}!`);
        loadLeads();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      if (errMsg.includes('Free Vapi numbers') || errMsg.includes('international')) {
        toast.warning(errMsg, { autoClose: 9000 });
        setShowTelephonyGuide(true);
      } else if (errMsg.includes('VAPI_API_KEY')) {
        toast.error('VAPI_API_KEY not found in server/.env. Please follow the Telephony Guide.');
        setShowTelephonyGuide(true);
      } else {
        toast.error(`Cellular dispatch notice: ${errMsg}`);
      }
    }
  };

  // Start Call (Audio, Video, or In-Browser Free AI Smart Call)
  const startCall = async (lead, mode = 'audio') => {
    const isVideo = mode === 'video';
    const isAi = mode === 'ai';

    setSelectedLead(lead);
    setIsCallActive(true);
    setIsAiCall(isAi);
    setIsVideoCall(isVideo);
    setCallDuration(0);
    setCallNotes('');
    setTranscript([]);
    setCallOutcome(null);
    setAutoSimulationActive(false);
    setAutoSimStep(0);

    const langName = selectedLanguage === 'hi' ? 'Hindi' : 'Indian English';
    toast.info(`Dialing ${lead.name} (${isAi ? `AI Smart Call • ${langName}` : mode.toUpperCase()})...`);

    // Safe Media Stream initialization (Prevents NotFoundError)
    const media = await getMediaStreamSafely(isVideo, 'You');
    localStreamRef.current = media.stream;

    if (localVideoRef.current && media.stream) {
      localVideoRef.current.srcObject = media.stream;
    }

    if (isVideo) {
      setTimeout(() => {
        if (remoteVideoRef.current) {
          const remoteStream = createVirtualStream(lead.name, true, true);
          remoteStreamRef.current = remoteStream;
          remoteVideoRef.current.srcObject = remoteStream;
        }
      }, 500);
    }

    // Initialize AI Telecaller Dialogue in chosen language
    if (isAi) {
      const openingPitch = generateOpeningPitch(lead, selectedLanguage);
      const firstEntry = {
        sender: 'ai',
        text: openingPitch,
        timestamp: '00:02',
        sentiment: 'warm_intro',
      };
      setTranscript([firstEntry]);
      speakAI(openingPitch);
    }
  };

  // Handle customer/lead spoken or typed response
  const handleLeadResponse = async (text) => {
    if (!text || !text.trim() || !selectedLead) return;

    const customerEntry = {
      sender: 'lead',
      text: text.trim(),
      timestamp: formatDuration(callDuration),
      sentiment: 'customer_input',
    };

    const updatedHistory = [...transcript, customerEntry];
    setTranscript(updatedHistory);
    setUserReplyText('');

    // Generate intelligent AI counter-response in selected language
    const aiAnswer = await generateAIResponse(selectedLead, text.trim(), updatedHistory, geminiApiKey, selectedLanguage);
    const aiEntry = {
      sender: 'ai',
      text: aiAnswer,
      timestamp: formatDuration(callDuration + 2),
      sentiment: 'persuasion',
    };

    setTranscript(prev => [...prev, aiEntry]);
    speakAI(aiAnswer);
  };

  // Run Autonomous Auto-Simulation Mode (Lead Discussion Bot in Hindi or English)
  const toggleAutoSimulation = () => {
    if (autoSimulationActive) {
      clearInterval(autoSimTimerRef.current);
      setAutoSimulationActive(false);
      toast.info('Auto-dialogue paused');
      return;
    }

    if (!selectedLead) return;

    setAutoSimulationActive(true);
    const langLabel = selectedLanguage === 'hi' ? 'Hindi (हिंदी)' : 'Indian English';
    toast.success(`Autonomous AI Lead discussion running in ${langLabel}!`);

    const script = generateAutoDialogue(selectedLead, selectedLanguage);
    setTranscript(script.slice(0, 2));
    speakAI(script[0].text);

    let currentIdx = 2;
    autoSimTimerRef.current = setInterval(() => {
      if (currentIdx < script.length) {
        const nextItem = script[currentIdx];
        setTranscript(prev => [...prev, nextItem]);
        if (nextItem.sender === 'ai') {
          speakAI(nextItem.text);
        }
        currentIdx += 1;
      } else {
        clearInterval(autoSimTimerRef.current);
        setAutoSimulationActive(false);
        toast.success('AI Call discussion complete! Customer agreed to Site Visit.');
      }
    }, 4500);
  };

  // Toggle Microphone for STT
  const toggleListening = () => {
    if (!speechRecognitionRef.current) {
      toast.warning('Web Speech Recognition is not supported in this browser. You can type customer responses.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
    } else {
      try {
        speechRecognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start error:', e.message);
      }
    }
  };

  // End Call & Trigger Automated CRM Lead Stage Progression
  const endCall = async () => {
    if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
    if (speechRecognitionRef.current && isListening) speechRecognitionRef.current.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      if (remoteStreamRef.current.stopAllTracks) remoteStreamRef.current.stopAllTracks();
      remoteStreamRef.current.getTracks().forEach(t => t.stop());
      remoteStreamRef.current = null;
    }

    setIsCallActive(false);
    setIsVideoCall(false);
    setAutoSimulationActive(false);

    if (selectedLead) {
      const outcome = analyzeCallOutcome(transcript, selectedLead);
      setCallOutcome(outcome);

      const newCallLog = {
        id: calls.length + 1,
        Lead: selectedLead.name,
        phone: selectedLead.phone,
        status: 'completed',
        duration: formatDuration(callDuration),
        date: new Date().toISOString().split('T')[0],
        notes: outcome.summary || callNotes || 'Call completed',
        type: isAiCall ? 'ai' : isVideoCall ? 'video' : 'audio',
        stage: outcome.recommendedStage,
        sentiment: outcome.sentimentTag,
      };

      setCalls([newCallLog, ...calls]);

      if (selectedLead._id) {
        leadService.addNote(selectedLead._id, outcome.summary).catch(() => { });
      }

      // Automated Sequential Lead Stage Progression
      if (selectedLead._id && outcome.recommendedStage && outcome.recommendedStage !== selectedLead.pipelineStage) {
        setIsAdvancingStage(true);
        toast.info(`🤖 Auto-advancing ${selectedLead.name} stage to ${outcome.recommendedStage.replace(/_/g, ' ')}...`);

        try {
          const advanceResult = await advanceLeadPipelineSequentially(
            selectedLead,
            outcome.recommendedStage,
            outcome.summary,
            outcome.suggestedDate
          );

          if (advanceResult.success) {
            toast.success(`✅ Lead successfully converted to ${outcome.recommendedStage.replace(/_/g, ' ')}!`);
            loadLeads();

            if (outcome.confirmedVisit || advanceResult.reachedSiteVisitPlanned) {
              toast.info(`🚨 Team Manager notified to assign Field Sales Executive!`);
              setTimeout(() => {
                setShowAssignModal(true);
              }, 1200);
            }
          }
        } catch (stageErr) {
          console.warn('Stage progression notice:', stageErr.message);
        } finally {
          setIsAdvancingStage(false);
        }
      }

      toast.success(`Call with ${selectedLead.name} concluded!`);
    }
  };

  // Mute / Video Controls
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
    }
    toast.info(isVideoOff ? 'Camera video feed enabled' : 'Camera video feed paused');
  };

  // Filter Leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      (l.name && l.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.phone && l.phone.includes(searchTerm)) ||
      (l.company && l.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage = filterStage === 'ALL' || l.pipelineStage === filterStage;
    return matchesSearch && matchesStage;
  });

  // KEYBOARD CONTROLS LISTENER (Shortcuts: 1-9 to select leads, Arrow keys, A, C, H, E, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      // Keys 1 to 9: Direct select lead by index
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (filteredLeads[index]) {
          setSelectedLead(filteredLeads[index]);
          toast.info(`Lead [${e.key}] Selected: ${filteredLeads[index].name}`);
        }
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = filteredLeads.findIndex(l => (l._id || l.id) === (selectedLead?._id || selectedLead?.id));
        const nextIdx = (currentIdx + 1) % filteredLeads.length;
        if (filteredLeads[nextIdx]) {
          setSelectedLead(filteredLeads[nextIdx]);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = filteredLeads.findIndex(l => (l._id || l.id) === (selectedLead?._id || selectedLead?.id));
        const prevIdx = (currentIdx - 1 + filteredLeads.length) % filteredLeads.length;
        if (filteredLeads[prevIdx]) {
          setSelectedLead(filteredLeads[prevIdx]);
        }
        return;
      }

      // Language Shortcuts: H for Hindi, E for English
      if (e.key.toLowerCase() === 'h') {
        setSelectedLanguage('hi');
        toast.info('🇮🇳 भाषा सेट: हिन्दी (Hindi)');
        return;
      }
      if (e.key.toLowerCase() === 'e') {
        setSelectedLanguage('en-IN');
        toast.info('🇮🇳 Language Set: English (Indian)');
        return;
      }

      // Action Shortcuts when idle
      if (!isCallActive && selectedLead) {
        if (e.key.toLowerCase() === 'a') {
          startCall(selectedLead, 'ai');
          return;
        }
        if (e.key.toLowerCase() === 'c') {
          triggerCellularCall(selectedLead);
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          startCall(selectedLead, 'video');
          return;
        }
      }

      // Escape to end active call
      if (isCallActive && e.key === 'Escape') {
        endCall();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredLeads, selectedLead, isCallActive, selectedLanguage]);

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* Top Banner / Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '24px 28px',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <FaRobot /> AI TELECALLER SUITE
            </span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600
            }}>
              ● Dual Language: Hindi (हिन्दी) & English (Indian)
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '10px 0 4px', color: '#ffffff' }}>
            Calling Panel & Automated Lead Conversion Center
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
            Automate lead pitches in <strong>Hindi (हिंदी)</strong> or <strong>Indian English</strong>. Press number keys <kbd>1-9</kbd> to select leads instantly!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowTelephonyGuide(true)}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <FaQuestionCircle /> Telephony Setup Guide
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <FaCog /> AI Config
          </button>
          <button
            onClick={() => setShowCallHistory(!showCallHistory)}
            style={{
              padding: '10px 18px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
            }}
          >
            <FaHistory /> {showCallHistory ? 'Hide Logs' : 'Call History'}
          </button>
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS & LANGUAGE SELECTOR BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '12px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        fontSize: '13px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <FaKeyboard color="#2563eb" size={16} />
          <strong style={{ color: '#0f172a' }}>Keyboard Shortcuts:</strong>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>1-9</kbd> Select Lead</span>
          <span>•</span>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>↑/↓</kbd> Navigate</span>
          <span>•</span>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>A</kbd> AI Call</span>
          <span>•</span>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>C</kbd> Cellular Call</span>
          <span>•</span>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>H</kbd> Hindi</span>
          <span>•</span>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>E</kbd> English</span>
          <span>•</span>
          <span><kbd style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>Esc</kbd> End Call</span>
        </div>

        {/* Dual Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaLanguage color="#ea580c" size={18} />
          <span style={{ fontWeight: 600, color: '#334155' }}>Language:</span>
          <button
            onClick={() => {
              setSelectedLanguage('hi');
              toast.info('🇮🇳 भाषा सेट: हिन्दी (Hindi)');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedLanguage === 'hi' ? '2px solid #ea580c' : '1px solid #cbd5e1',
              background: selectedLanguage === 'hi' ? '#fff7ed' : '#ffffff',
              color: selectedLanguage === 'hi' ? '#c2410c' : '#475569',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🇮🇳 हिन्दी (Hindi) [H]
          </button>
          <button
            onClick={() => {
              setSelectedLanguage('en-IN');
              toast.info('🇮🇳 Language Set: English (Indian)');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedLanguage === 'en-IN' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: selectedLanguage === 'en-IN' ? '#eff6ff' : '#ffffff',
              color: selectedLanguage === 'en-IN' ? '#1d4ed8' : '#475569',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🇮🇳 English (Indian) [E]
          </button>
        </div>
      </div>

      {/* Main Grid: Leads Directory & Live Call Station */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        {/* LEFT COLUMN: Leads Selector with Keyboard Badges */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 240px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBuilding color="#2563eb" /> CRM Pipeline Leads
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {filteredLeads.length} Leads
            </span>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search leads by name, phone, project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Stage Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
            {['ALL', 'NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'].map(stage => (
              <button
                key={stage}
                onClick={() => setFilterStage(stage)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: filterStage === stage ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: filterStage === stage ? '#eff6ff' : '#ffffff',
                  color: filterStage === stage ? '#1d4ed8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {stage.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Leads Scroll List with Keyboard Shortcuts [1] [2] [3] */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {loadingLeads ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                Loading real leads from CRM database...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                No leads matched your search.
              </div>
            ) : (
              filteredLeads.map((lead, idx) => {
                const stageStyle = STAGE_COLORS[lead.pipelineStage] || STAGE_COLORS.NEW;
                const isSelected = (selectedLead?._id || selectedLead?.id) === (lead._id || lead.id);
                const keyNumber = idx < 9 ? idx + 1 : null;

                return (
                  <div
                    key={lead._id || lead.id || idx}
                    onClick={() => {
                      if (!isCallActive) setSelectedLead(lead);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#f8faff' : '#ffffff',
                      marginBottom: '10px',
                      cursor: isCallActive ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {keyNumber && (
                          <span style={{
                            background: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace'
                          }} title={`Press key [${keyNumber}] to select`}>
                            {keyNumber}
                          </span>
                        )}
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{lead.name}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{lead.phone} • {lead.company}</div>
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: stageStyle.bg,
                        color: stageStyle.text,
                        border: `1px solid ${stageStyle.border}`
                      }}>
                        {lead.pipelineStage?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                        {formatCurrency(lead.projectValue)}
                      </span>

                      {!isCallActive && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startCall(lead, 'ai');
                            }}
                            style={{
                              padding: '5px 10px',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Start AI Call [Shortcut: A]"
                          >
                            <FaRobot size={11} /> AI Call
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCellularCall(lead);
                            }}
                            style={{
                              padding: '5px 10px',
                              background: 'linear-gradient(135deg, #059669, #10b981)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Trigger Real Phone Cellular Call via Vapi [Shortcut: C]"
                          >
                            <FaPhone size={10} /> Cellular
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startCall(lead, 'audio');
                            }}
                            style={{
                              padding: '5px 9px',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Direct Voice Call"
                          >
                            <FaPhoneAlt size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Call & AI Telecaller Terminal */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 240px)',
          overflowY: 'auto'
        }}>
          {isCallActive ? (
            /* ACTIVE CALL INTERFACE */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Call Header Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: isAiCall ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
                  }}>
                    {isAiCall ? <FaRobot /> : <FaPhoneAlt />}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                      {selectedLead?.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {selectedLead?.phone} • {selectedLead?.company} • Language: <strong style={{ color: selectedLanguage === 'hi' ? '#ea580c' : '#2563eb' }}>{selectedLanguage === 'hi' ? 'Hindi (हिंदी)' : 'Indian English'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    fontSize: '22px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#22c55e',
                    background: '#f0fdf4',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0'
                  }}>
                    {formatDuration(callDuration)}
                  </div>
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    style={{
                      background: ttsEnabled ? '#eff6ff' : '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: ttsEnabled ? '#2563eb' : '#64748b'
                    }}
                    title={ttsEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
                  >
                    {ttsEnabled ? <FaVolumeUp /> : <FaVolumeMute />} {ttsEnabled ? 'Voice On' : 'Voice Muted'}
                  </button>
                </div>
              </div>

              {/* VIDEO FEEDS (Only if Video Call mode) */}
              {isVideoCall && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                  background: '#0f172a',
                  padding: '12px',
                  borderRadius: '12px'
                }}>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', background: '#1e293b' }}
                    />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      {selectedLead?.name} (Lead Stream)
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', background: '#1e293b' }}
                    />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      You {isVideoOff ? '(Video Off)' : '(Local Feed)'}
                    </div>
                  </div>
                </div>
              )}

              {/* AI LIVE TRANSCRIPT & INTERACTION PANEL */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaComments color="#6366f1" />
                    <strong style={{ fontSize: '13px', color: '#334155' }}>
                      Live AI Telecalling Dialogue ({selectedLanguage === 'hi' ? 'हिन्दी वार्तालाप' : 'Indian English Feed'})
                    </strong>
                    {isAiSpeaking && (
                      <span style={{ fontSize: '11px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite' }} />
                        Sophia AI Speaking...
                      </span>
                    )}
                  </div>

                  {/* Auto-Pilot Simulation Button */}
                  <button
                    onClick={toggleAutoSimulation}
                    style={{
                      padding: '5px 12px',
                      background: autoSimulationActive ? '#ef4444' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {autoSimulationActive ? <FaPause size={10} /> : <FaPlay size={10} />}
                    {autoSimulationActive ? 'Stop Auto-Pilot' : `Run Auto-Dialogue (${selectedLanguage === 'hi' ? 'Hindi' : 'English'})`}
                  </button>
                </div>

                {/* Transcript Scroll Window */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {transcript.map((item, idx) => {
                    const isAi = item.sender === 'ai';
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAi ? 'flex-start' : 'flex-end',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: isAi ? '#4f46e5' : '#059669' }}>
                            {isAi ? 'Sophia (AI Sales Telecaller)' : `${selectedLead?.name} (Customer)`}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.timestamp}</span>
                        </div>
                        <div style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: isAi ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                          background: isAi ? '#ffffff' : '#ecfdf5',
                          border: isAi ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                          color: '#1e293b',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                          {item.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={transcriptBottomRef} />
                </div>

                {/* Interactive Mic / Customer Reply Bar */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <button
                    onClick={toggleListening}
                    style={{
                      padding: '10px 14px',
                      background: isListening ? '#ef4444' : '#f1f5f9',
                      color: isListening ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                    title="Speak as Customer via Microphone"
                  >
                    <FaMicrophone color={isListening ? '#ffffff' : '#2563eb'} />
                    {isListening ? (selectedLanguage === 'hi' ? 'सुन रहा हूँ...' : 'Listening...') : (selectedLanguage === 'hi' ? 'बोलिए (Mic)' : 'Speak Reply')}
                  </button>

                  <input
                    type="text"
                    placeholder={selectedLanguage === 'hi' ? 'ग्राहक का जवाब लिखें (उदा. क्या मैं शनिवार को आ सकता हूँ? बजट क्या है?)...' : 'Type customer reply (e.g. Can I visit this Saturday? What is the budget?)...'}
                    value={userReplyText}
                    onChange={(e) => setUserReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLeadResponse(userReplyText);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />

                  <button
                    onClick={() => handleLeadResponse(userReplyText)}
                    disabled={!userReplyText.trim()}
                    style={{
                      padding: '10px 18px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: userReplyText.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaPaperPlane size={12} /> Send
                  </button>
                </div>
              </div>

              {/* Call Controls Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={toggleMute}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: isMuted ? '#ef4444' : '#f1f5f9',
                      color: isMuted ? 'white' : '#334155',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />} {isMuted ? 'Muted' : 'Mute'}
                  </button>
                  {isVideoCall && (
                    <button
                      onClick={toggleVideo}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: isVideoOff ? '#ef4444' : '#f1f5f9',
                        color: isVideoOff ? 'white' : '#334155',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isVideoOff ? <FaVideoSlash /> : <FaVideo />} {isVideoOff ? 'Video Off' : 'Video On'}
                    </button>
                  )}
                </div>

                <button
                  onClick={endCall}
                  disabled={isAdvancingStage}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '50px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    cursor: isAdvancingStage ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                  }}
                  title="Press [Escape] to End"
                >
                  <FaPhoneSlash /> End & Auto-Process Outcome [Esc]
                </button>
              </div>
            </div>
          ) : (
            /* IDLE SCREEN / LEAD PREVIEW & CALL INITIALIZER */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              {selectedLead ? (
                <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                  {/* Lead Summary Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f8fafc, #edf2f7)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '28px',
                    textAlign: 'center',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      margin: '0 auto 16px',
                      boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)'
                    }}>
                      <FaUser />
                    </div>

                    <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedLead.name}
                    </h2>
                    <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '14px' }}>
                      {selectedLead.phone} • {selectedLead.email || 'No email provided'}
                    </p>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                      padding: '16px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'left',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>PROJECT / TYPE</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{selectedLead.company || 'Residential'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>BUDGET / VALUE</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(selectedLead.projectValue)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>CURRENT STAGE</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>{selectedLead.pipelineStage?.replace(/_/g, ' ') || 'NEW'}</div>
                      </div>
                    </div>

                    {selectedLead.notes && (
                      <div style={{ textAlign: 'left', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#475569', marginBottom: '16px', borderLeft: '3px solid #2563eb' }}>
                        <strong>Prior Notes:</strong> {selectedLead.notes}
                      </div>
                    )}

                    {/* Launch Options with Keyboard Shortcut Indicators */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => startCall(selectedLead, 'ai')}
                        style={{
                          padding: '14px 24px',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)'
                        }}
                        title="Start AI Call [Shortcut: Press A]"
                      >
                        <FaRobot size={15} /> Start AI Smart Call [A]
                      </button>

                      <button
                        onClick={() => triggerCellularCall(selectedLead)}
                        style={{
                          padding: '14px 22px',
                          background: 'linear-gradient(135deg, #059669, #10b981)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                        }}
                        title="Dial Real Cellular Mobile via Vapi [Shortcut: Press C]"
                      >
                        <FaPhone /> Cellular Call (Vapi) [C]
                      </button>

                      <button
                        onClick={() => startCall(selectedLead, 'audio')}
                        style={{
                          padding: '14px 18px',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Direct Voice Call"
                      >
                        <FaPhoneAlt /> Voice
                      </button>

                      <button
                        onClick={() => startCall(selectedLead, 'video')}
                        style={{
                          padding: '14px 18px',
                          background: '#334155',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Video Call [Shortcut: Press V]"
                      >
                        <FaVideo /> Video [V]
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: '#94a3b8',
                    margin: '0 auto 16px'
                  }}>
                    <FaPhoneAlt />
                  </div>
                  <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '18px' }}>
                    Press Key [1-9] on your Keyboard to Select a Lead
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', maxWidth: '380px', marginInline: 'auto', lineHeight: 1.5 }}>
                    Or click any lead on the left. Press <kbd>A</kbd> for AI Call, <kbd>C</kbd> for Cellular Call, <kbd>H</kbd> for Hindi, <kbd>E</kbd> for English!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CALL HISTORY DRAWER / MODAL */}
      {showCallHistory && (
        <div style={{
          marginTop: '24px',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaHistory color="#2563eb" /> Completed Call Logs & AI Sentiment Records
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{calls.length} logs recorded</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px 12px' }}>Lead</th>
                  <th style={{ padding: '10px 12px' }}>Phone</th>
                  <th style={{ padding: '10px 12px' }}>Type</th>
                  <th style={{ padding: '10px 12px' }}>Duration</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Stage Achieved</th>
                  <th style={{ padding: '10px 12px' }}>AI Summary & Notes</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{c.Lead}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{c.phone}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: c.type === 'ai' ? '#eef2ff' : '#f1f5f9',
                        color: c.type === 'ai' ? '#4f46e5' : '#334155'
                      }}>
                        {c.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#16a34a', fontWeight: 600 }}>{c.duration}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{c.date}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0'
                      }}>
                        {c.stage?.replace(/_/g, ' ') || 'CONNECTED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#475569', maxWidth: '350px' }}>{c.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN FIELD SALES EXECUTIVE MODAL */}
      {showAssignModal && selectedLead && (
        <AssignSalesExecutiveModal
          lead={selectedLead}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            loadLeads();
            toast.success(`Sales Executive assigned to lead ${selectedLead.name}!`);
          }}
        />
      )}

      {/* TELEPHONY ARCHITECTURE GUIDE MODAL */}
      {showTelephonyGuide && (
        <TelephonyGuideModal onClose={() => setShowTelephonyGuide(false)} />
      )}

      {/* AI SETTINGS & OPTIONAL GEMINI API KEY MODAL */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2200,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                AI Telecaller Engine Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                <FaTimes />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
              The system already includes a <strong>100% Free Built-In Construction Persuasion Engine</strong> in both <strong>Hindi</strong> and <strong>Indian English</strong> with zero API key required. If you wish to enable Google Gemini generative streaming, you may optionally input your free Gemini API key below:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Optional Google Gemini API Key (Free tier 15 req/min)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Key is stored safely in your browser localStorage. Leave blank to use built-in engine.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('crm_gemini_api_key');
                  setGeminiApiKey('');
                  toast.info('Using built-in free AI engine');
                  setShowSettingsModal(false);
                }}
                style={{
                  padding: '9px 16px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Clear Key
              </button>
              <button
                type="button"
                onClick={() => {
                  if (geminiApiKey.trim()) {
                    localStorage.setItem('crm_gemini_api_key', geminiApiKey.trim());
                    toast.success('Gemini API Key saved!');
                  }
                  setShowSettingsModal(false);
                }}
                style={{
                  padding: '9px 18px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Inline Keyframe Styles */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default CallingPanel;