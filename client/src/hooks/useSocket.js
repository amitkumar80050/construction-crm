import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const apiUrl = process.env.REACT_APP_API_URL;
    const socketUrl = process.env.REACT_APP_SOCKET_URL
      || (apiUrl?.startsWith('/') ? window.location.origin : apiUrl?.replace(/\/api\/?$/, '') || 'http://localhost:5001');

    try {
      socketRef.current = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 5000
      });

      socketRef.current.on('connect_error', () => {
        // Handled gracefully with REST polling fallback
      });
    } catch (e) {
      // Socket initialization fallback
    }

    return () => socketRef.current?.disconnect();
  }, []);
  return socketRef;
}
