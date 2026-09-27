import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const apiUrl = process.env.REACT_APP_API_URL;
    const socketUrl = process.env.REACT_APP_SOCKET_URL
      || (apiUrl?.startsWith('/') ? window.location.origin : apiUrl?.replace(/\/api\/?$/, '') || 'http://localhost:5000');
    socketRef.current = io(socketUrl, { auth: { token } });
    return () => socketRef.current?.disconnect();
  }, []);
  return socketRef;
}