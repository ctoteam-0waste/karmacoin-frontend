import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://karmacoin-booking-test.onrender.com';

// All socket events the User App cares about
export type BookingStatusEvent =
  | 'BOOKING_ACCEPTED'
  | 'AGENT_REACHED'
  | 'BOOKING_PICKED_UP'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCEL_SUCCESS'
  | 'BOOKING_IN_POOL';

export interface BookingUpdate {
  event: BookingStatusEvent | 'AGENT_LOCATION_UPDATE';
  bookingId: string;
  message: string;
  totalKarmaCoins?: number; // Only in BOOKING_PICKED_UP
  agentId?: string;         // Only in BOOKING_ACCEPTED
  agent?: { name: string; rating?: number; phone?: string }; // Only in BOOKING_ACCEPTED
  agentLocation?: { latitude: number; longitude: number }; // Dynamic agent GPS marker tracking
}

interface UserSocketContextType {
  isConnected: boolean;
  latestUpdate: BookingUpdate | null;
  clearLatestUpdate: () => void;
}

const UserSocketContext = createContext<UserSocketContextType>({
  isConnected: false,
  latestUpdate: null,
  clearLatestUpdate: () => {},
});

export function UserSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<BookingUpdate | null>(null);

  const connectSocket = useCallback(async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[UserSocket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[UserSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.log('[UserSocket] Error:', err.message);
      setIsConnected(false);
    });

    // ── Agent accepted booking ──
    socket.on('BOOKING_ACCEPTED', (data: any) => {
      setLatestUpdate({ event: 'BOOKING_ACCEPTED', bookingId: data.bookingId, message: data.message || 'Agent accepted your booking and is on the way!', agentId: data.agentId, agent: data.agent || null });
    });

    // ── Agent reached user location ──
    socket.on('AGENT_REACHED', (data: any) => {
      setLatestUpdate({ event: 'AGENT_REACHED', bookingId: data.bookingId, message: data.message || 'Agent has reached your location!' });
    });

    // ── Waste verified, KarmaCoins credited ──
    socket.on('BOOKING_PICKED_UP', (data: any) => {
      setLatestUpdate({ event: 'BOOKING_PICKED_UP', bookingId: data.bookingId, message: data.message || `${data.totalKarmaCoins || 0} KarmaCoins credited!`, totalKarmaCoins: data.totalKarmaCoins });
    });

    // ── Booking fully completed ──
    socket.on('BOOKING_COMPLETED', (data: any) => {
      setLatestUpdate({ event: 'BOOKING_COMPLETED', bookingId: data.bookingId, message: data.message || 'Your booking is completed. Thank you!' });
    });

    // ── Booking cancelled ──
    socket.on('BOOKING_CANCEL_SUCCESS', (data: any) => {
      setLatestUpdate({ event: 'BOOKING_CANCEL_SUCCESS', bookingId: data.bookingId, message: data.message || 'Booking cancelled.' });
    });

    // ── No agents found → moved to Priority Pool ──
    socket.on('BOOKING_IN_POOL', (data: any) => {
      setLatestUpdate({ event: 'BOOKING_IN_POOL', bookingId: data.bookingId, message: data.message || 'High demand in your area. Your booking is in our priority pool.' });
    });

    // ── Live GPS location update from agent ──
    socket.on('AGENT_LOCATION_UPDATE', (data: any) => {
      setLatestUpdate({
        event: 'AGENT_LOCATION_UPDATE',
        bookingId: data.bookingId,
        message: 'Agent location updated',
        agentLocation: data.location || data.agentLocation,
      });
    });
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const clearLatestUpdate = useCallback(() => setLatestUpdate(null), []);

  return (
    <UserSocketContext.Provider value={{ isConnected, latestUpdate, clearLatestUpdate }}>
      {children}
    </UserSocketContext.Provider>
  );
}

export const useUserSocket = () => useContext(UserSocketContext);
