import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000', { auth: { token } });
    return () => socketRef.current?.disconnect();
  }, []);
  return socketRef;
}