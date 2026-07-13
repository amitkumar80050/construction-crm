import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPhone, FaPhoneAlt, FaPhoneSlash, FaUser, 
  FaClock, FaCheck, FaTimes, FaHistory, FaVideo,
  FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaUsers, FaArrowLeft, FaArrowRight
} from 'react-icons/fa';

const CallingPanel = () => {
  const [calls, setCalls] = useState([
    {
      id: 1,
      client: 'ABC Construction',
      phone: '+1 234 567 8900',
      status: 'completed',
      duration: '5:30',
      date: '2024-01-15',
      notes: 'Discussed project requirements',
      type: 'audio'
    },
    {
      id: 2,
      client: 'XYZ Builders',
      phone: '+1 234 567 8901',
      status: 'missed',
      duration: '0:00',
      date: '2024-01-16',
      notes: 'No answer',
      type: 'audio'
    }
  ]);

  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedClient, setSelectedClient] = useState(null);
  const [callNotes, setCallNotes] = useState('');
  const [callHistory, setCallHistory] = useState([]);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const clients = [
    { id: 1, name: 'Amit yadav', phone: '9169137366', email: 'amityadav50800@gmail.com' },
    { id: 2, name: 'XYZ Builders', phone: '+1 234 567 8901', email: 'info@xyz.com' },
    { id: 3, name: 'PQR Developers', phone: '+1 234 567 8902', email: 'hello@pgr.com' },
    { id: 4, name: 'LMN Infrastructure', phone: '+1 234 567 8903', email: 'info@lmn.com' }
  ];

  useEffect(() => {
    let timer;
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  // Simulate incoming calls
  useEffect(() => {
    if (!isCallActive && !selectedClient) {
      const interval = setInterval(() => {
        const randomClient = clients[Math.floor(Math.random() * clients.length)];
        if (Math.random() > 0.7) {
          setIncomingCall(randomClient);
          toast.info(`📞 Incoming call from ${randomClient.name}`);
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isCallActive, selectedClient]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async (client, video = false) => {
    setSelectedClient(client);
    setIsCallActive(true);
    setIsVideoCall(video);
    setCallDuration(0);
    setCallNotes('');
    toast.info(`Calling ${client.name}...`);

    if (video) {
      try {
        // Get user media for video call
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Simulate remote video after 2 seconds
        setTimeout(() => {
          if (remoteVideoRef.current) {
            // Simulate remote stream
            navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            }).then(remoteStream => {
              remoteVideoRef.current.srcObject = remoteStream;
            }).catch(() => {
              // Use a dummy video if camera not available
              const dummyStream = new MediaStream();
              remoteVideoRef.current.srcObject = dummyStream;
            });
          }
        }, 2000);
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast.error('Unable to access camera. Switching to audio call.');
        setIsVideoCall(false);
      }
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setIsVideoCall(false);
    setIsMuted(false);
    setIsVideoOff(false);

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (selectedClient) {
      const newCall = {
        id: calls.length + 1,
        client: selectedClient.name,
        phone: selectedClient.phone,
        status: 'completed',
        duration: formatDuration(callDuration),
        date: new Date().toISOString().split('T')[0],
        notes: callNotes || 'No notes',
        type: isVideoCall ? 'video' : 'audio'
      };
      setCalls([newCall, ...calls]);
      setCallHistory([newCall, ...callHistory]);
      toast.success(`Call with ${selectedClient.name} completed!`);
    }
    setSelectedClient(null);
  };

  const missCall = () => {
    if (selectedClient) {
      const missedCall = {
        id: calls.length + 1,
        client: selectedClient.name,
        phone: selectedClient.phone,
        status: 'missed',
        duration: '0:00',
        date: new Date().toISOString().split('T')[0],
        notes: 'Missed call',
        type: isVideoCall ? 'video' : 'audio'
      };
      setCalls([missedCall, ...calls]);
      setCallHistory([missedCall, ...callHistory]);
      toast.warning(`Missed call from ${selectedClient.name}`);
    }
    setIsCallActive(false);
    setSelectedClient(null);
    setCallDuration(0);
    setIsVideoCall(false);
  };

  const acceptIncomingCall = (client) => {
    setIncomingCall(null);
    startCall(client, false);
  };

  const rejectIncomingCall = () => {
    setIncomingCall(null);
    toast.info('Call rejected');
  };

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
    toast.info(isVideoOff ? 'Video turned on' : 'Video turned off');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#22c55e';
      case 'missed': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getCallTypeIcon = (type) => {
    return type === 'video' ? <FaVideo size={12} /> : <FaPhone size={12} />;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Calling Panel</h1>
          <p style={{ color: '#64748b' }}>Make audio and video calls to clients</p>
        </div>
        <button
          onClick={() => setShowCallHistory(!showCallHistory)}
          style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            color: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaHistory /> {showCallHistory ? 'Hide' : 'Show'} History
        </button>
      </div>

      {/* Incoming Call Notification */}
      {incomingCall && (
        <div style={{
          background: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          marginBottom: '20px',
          borderLeft: '4px solid #22c55e',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#22c55e'
              }}>
                <FaPhoneAlt />
              </div>
              <div>
                <h4 style={{ color: '#1e293b' }}>Incoming Call</h4>
                <p style={{ color: '#64748b' }}>{incomingCall.name} - {incomingCall.phone}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => acceptIncomingCall(incomingCall)}
                style={{
                  padding: '8px 20px',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaPhone /> Accept
              </button>
              <button
                onClick={rejectIncomingCall}
                style={{
                  padding: '8px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <FaTimes /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Call Interface */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Make a Call</h3>
          
          {isCallActive ? (
            <div style={{ textAlign: 'center' }}>
              {isVideoCall && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px',
                  marginBottom: '16px',
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '12px'
                }}>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        background: '#0f172a',
                        minHeight: '200px'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      color: 'white',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {selectedClient?.name}
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        background: '#0f172a',
                        minHeight: '200px',
                        transform: 'scaleX(-1)'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      color: 'white',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      You {isVideoOff && '(Video Off)'}
                    </div>
                  </div>
                </div>
              )}

              {!isVideoCall && (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '20px auto',
                  border: '4px solid #22c55e'
                }}>
                  <FaPhoneAlt size={40} color="#22c55e" />
                </div>
              )}

              <h3 style={{ color: '#1e293b' }}>{selectedClient?.name}</h3>
              <p style={{ color: '#64748b' }}>{selectedClient?.phone}</p>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e', margin: '16px 0' }}>
                {formatDuration(callDuration)}
              </div>
              
              {isVideoCall && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                  <button
                    onClick={toggleMute}
                    style={{
                      padding: '10px',
                      borderRadius: '50%',
                      background: isMuted ? '#ef4444' : '#f1f5f9',
                      border: 'none',
                      cursor: 'pointer',
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isMuted ? <FaMicrophoneSlash color="#ef4444" /> : <FaMicrophone color="#1e293b" />}
                  </button>
                  <button
                    onClick={toggleVideo}
                    style={{
                      padding: '10px',
                      borderRadius: '50%',
                      background: isVideoOff ? '#ef4444' : '#f1f5f9',
                      border: 'none',
                      cursor: 'pointer',
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isVideoOff ? <FaVideoSlash color="#ef4444" /> : <FaVideo color="#1e293b" />}
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Call Notes</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes during call..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={endCall}
                  style={{
                    padding: '14px 28px',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '16px'
                  }}
                >
                  <FaPhone /> End Call
                </button>
                <button
                  onClick={missCall}
                  style={{
                    padding: '14px 28px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '16px'
                  }}
                >
                  <FaPhoneSlash /> Miss
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>Select a client to start calling:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {clients.map((client) => (
                  <div
                    key={client.id}
                    style={{
                      padding: '12px 16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaUser color="#64748b" />
                      <div>
                        <strong style={{ color: '#1e293b' }}>{client.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{client.phone}</div>
                      </div>
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => startCall(client, false)}
                        style={{
                          padding: '6px 14px',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                      >
                        <FaPhone size={12} /> Audio
                      </button>
                      <button
                        onClick={() => startCall(client, true)}
                        style={{
                          padding: '6px 14px',
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#7c3aed'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#8b5cf6'}
                      >
                        <FaVideo size={12} /> Video
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call History */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FaHistory color="#64748b" />
            <h3 style={{ color: '#1e293b' }}>Call History</h3>
          </div>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {calls.map((call) => (
              <div
                key={call.id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{call.client}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {getCallTypeIcon(call.type)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {call.date} • {call.duration}
                  </div>
                  {call.notes && call.notes !== 'No notes' && (
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                      📝 {call.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: `${getStatusColor(call.status)}20`,
                    color: getStatusColor(call.status)
                  }}>
                    {call.status}
                  </span>
                  {call.status === 'completed' && <FaCheck color="#22c55e" />}
                  {call.status === 'missed' && <FaTimes color="#ef4444" />}
                </div>
              </div>
            ))}
            {calls.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                No call history yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CallingPanel;