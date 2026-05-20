import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_BOOKINGS_KEY = 'local_bookings';

const getLocalBookings = async (): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalBooking = async (booking: any) => {
  try {
    const existing = await getLocalBookings();
    await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify([booking, ...existing]));
  } catch {}
};

export const bookingService = {
  createBooking: async (data: {
    categories: { category: string; subCategory: string }[];
    pickupDate: string;
    timeSlot: string;
    address: {
      fullAddress: string;
      location: {
        type: 'Point';
        coordinates: [number, number];
      };
    };
  }) => {
    try {
      const response = await api.post('/api/v1/bookings', data);
      return response.data;
    } catch (error) {
      console.warn('Backend offline — saving booking locally');
      const mockBooking = {
        _id: 'LOCAL-' + Date.now().toString().slice(-6),
        ...data,
        status: 'PENDING',
        totalKarmaCoins: 0,
        createdAt: new Date().toISOString(),
      };
      await saveLocalBooking(mockBooking);
      return { data: mockBooking };
    }
  },

  getMyBookings: async () => {
    try {
      const response = await api.get('/api/v1/bookings/my-bookings');
      return response.data.data || response.data;
    } catch (error) {
      console.warn('Backend offline — returning local bookings');
      return await getLocalBookings();
    }
  }
};
