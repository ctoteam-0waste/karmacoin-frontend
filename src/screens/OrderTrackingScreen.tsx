import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import {
  ArrowLeft, Phone, HelpCircle, Star,
  CheckCircle2, Circle, Loader2
} from 'lucide-react-native';
import { useUserSocket } from '../context/UserSocketContext';

const { height } = Dimensions.get('window');

// Status ordering — used to calculate which steps are done
const STATUS_ORDER = ['ORDER_PLACED', 'AGENT_ASSIGNED', 'AGENT_REACHED', 'VERIFICATION', 'COMPLETED'];

const EVENT_TO_STATUS: Record<string, string> = {
  BOOKING_ACCEPTED: 'AGENT_ASSIGNED',
  AGENT_REACHED: 'AGENT_REACHED',
  BOOKING_PICKED_UP: 'VERIFICATION',
  BOOKING_COMPLETED: 'COMPLETED',
};

const BASE_STEPS = [
  { key: 'ORDER_PLACED',   label: 'Order Placed',       sublabel: 'Your pickup request is confirmed' },
  { key: 'AGENT_ASSIGNED', label: 'Agent Assigned',     sublabel: 'Agent accepted and is on the way' },
  { key: 'AGENT_REACHED',  label: 'Agent Reached',      sublabel: 'Agent has reached your location' },
  { key: 'VERIFICATION',   label: 'Verification & Coins', sublabel: 'Waste weighed, KarmaCoins credited' },
  { key: 'COMPLETED',      label: 'Completed',           sublabel: 'Reached warehouse and completed' },
];

const STATUS_MESSAGES: Record<string, string> = {
  ORDER_PLACED:   'Your pickup request is confirmed',
  AGENT_ASSIGNED: 'Agent accepted your booking and is on the way!',
  AGENT_REACHED:  'Agent has reached your location!',
  VERIFICATION:   'Waste verified. KarmaCoins credited to your wallet!',
  COMPLETED:      'Booking complete. Thank you for using KarmaCredits!',
  POOL:           'High demand in your area. Your booking is in our priority pool.',
};

// ── Mock booking — replace with navigation params in production ──
const mockBooking = {
  id: 'KC12345',
  agent: { name: 'Ravi Kumar', rating: 4.8, phone: '+91 98765 43210', initials: 'RK' },
  distanceKm: 0.3,
  etaMins: 3,
  estimatedCoins: 45,
  agentLocation: { latitude: 28.5580, longitude: 77.3910 },
  userLocation: { latitude: 28.5355, longitude: 77.3910 },
};

export function OrderTrackingScreen({ route, navigation }: any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Resolve passed parameters or fallback to mock data
  const passedBooking = route?.params?.booking;
  const bookingData = {
    id: passedBooking?._id || passedBooking?.id || mockBooking.id,
    distanceKm: passedBooking?.distanceKm || mockBooking.distanceKm,
    etaMins: passedBooking?.etaMins || mockBooking.etaMins,
    estimatedCoins: passedBooking?.coins || passedBooking?.estimatedCoins || mockBooking.estimatedCoins,
    agentLocation: passedBooking?.agent?.location || passedBooking?.agentLocation || mockBooking.agentLocation,
    userLocation: passedBooking?.location || passedBooking?.userLocation || mockBooking.userLocation,
  };

  const [activeAgent, setActiveAgent] = useState<any>(passedBooking?.agent || null);
  const [agentPos, setAgentPos] = useState(bookingData.agentLocation);
  const [currentStatus, setCurrentStatus] = useState('ORDER_PLACED');
  const [liveMessage, setLiveMessage] = useState(STATUS_MESSAGES['ORDER_PLACED']);
  const [earnedCoins, setEarnedCoins] = useState<number | null>(null);
  const [isPool, setIsPool] = useState(false);

  const { latestUpdate, clearLatestUpdate } = useUserSocket();

  // ── Handle incoming socket events ──
  useEffect(() => {
    if (!latestUpdate) return;

    // Verify if socket event matches the active booking ID
    const eventBookingId = latestUpdate.bookingId;
    if (eventBookingId && eventBookingId !== bookingData.id) {
      return; // Ignore updates from other bookings
    }

    const mappedStatus = EVENT_TO_STATUS[latestUpdate.event];

    if (latestUpdate.event === 'BOOKING_ACCEPTED') {
      const agentObj = latestUpdate.agent || (latestUpdate as any).booking?.agent;
      if (agentObj) {
        setActiveAgent(agentObj);
      }
    }

    if (latestUpdate.event === 'BOOKING_IN_POOL') {
      setIsPool(true);
      setLiveMessage(STATUS_MESSAGES['POOL']);
    } else if (latestUpdate.event === 'BOOKING_CANCEL_SUCCESS') {
      setLiveMessage('Booking cancelled.');
    } else if (latestUpdate.event === 'AGENT_LOCATION_UPDATE' && latestUpdate.agentLocation) {
      // Dynamically update agent marker position on map
      setAgentPos(latestUpdate.agentLocation);
    } else if (mappedStatus) {
      setIsPool(false);
      setCurrentStatus(mappedStatus);
      setLiveMessage(latestUpdate.message || STATUS_MESSAGES[mappedStatus]);
      if (latestUpdate.event === 'BOOKING_PICKED_UP' && latestUpdate.totalKarmaCoins) {
        setEarnedCoins(latestUpdate.totalKarmaCoins);
      }
      if (latestUpdate.agentLocation) {
        setAgentPos(latestUpdate.agentLocation);
      }
    }

    clearLatestUpdate();
  }, [latestUpdate]);

  // ── Pulse animation for active step ──
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Compute which steps are done/active from currentStatus
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const steps = BASE_STEPS.map((step, i) => ({
    ...step,
    done: i < currentIndex,
    active: i === currentIndex,
  }));

  const region = {
    latitude: (agentPos.latitude + bookingData.userLocation.latitude) / 2,
    longitude: (agentPos.longitude + bookingData.userLocation.longitude) / 2,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <TouchableOpacity style={styles.helpIconBtn}>
          <Phone size={20} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Booking Badge ── */}
      <View style={styles.bookingBadge}>
        <View style={styles.bookingBadgeLeft}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingId}>{bookingData.id}</Text>
        </View>
        <View style={styles.inProgressBadge}>
          <View style={styles.inProgressDot} />
          <Text style={styles.inProgressText}>IN PROGRESS</Text>
        </View>
      </View>

      {/* ── Agent Card ── */}
      {activeAgent ? (
        <View style={styles.agentCard}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentInitials}>
              {activeAgent.name ? activeAgent.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : 'AP'}
            </Text>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{activeAgent.name || 'Agent Partner'}</Text>
            <View style={styles.agentRatingRow}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.agentRating}>{activeAgent.rating || 4.8}</Text>
              <Text style={styles.agentDistance}>
                • {bookingData.distanceKm} km away • {bookingData.etaMins} mins
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Phone size={16} color="#15803d" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.agentCard, { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderWidth: 1 }]}>
          <View style={[styles.agentAvatar, { backgroundColor: '#dcfce7' }]}>
            <Loader2 size={20} color="#15803d" />
          </View>
          <View style={styles.agentInfo}>
            <Text style={[styles.agentName, { color: '#166534', fontWeight: '700' }]}>Finding Agent...</Text>
            <Text style={styles.agentDistance}>Searching for nearest active recycling partner</Text>
          </View>
        </View>
      )}

      {/* ── Map ── */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          region={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {/* OpenStreetMap tiles — Free! */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {/* Agent Marker 🚛 */}
          <Marker coordinate={agentPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.agentMarker}>
              <Text style={styles.agentMarkerEmoji}>🚛</Text>
            </View>
          </Marker>

          {/* User Marker 📍 */}
          <Marker coordinate={bookingData.userLocation} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>

          {/* Route Line */}
          <Polyline
            coordinates={[agentPos, bookingData.userLocation]}
            strokeColor="#15803d"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        </MapView>
      </View>

      {/* ── Bottom Sheet ── */}
      <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>

        {/* Live Status */}
        <View style={styles.liveStatusRow}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }], backgroundColor: isPool ? '#f59e0b' : '#22c55e' }]} />
          <Text style={styles.liveStatusLabel}>Live Status</Text>
          <Text style={styles.liveStatusTime}>Just now</Text>
        </View>
        <Text style={styles.liveStatusText}>{liveMessage}</Text>

        {/* Priority Pool Badge */}
        {isPool && (
          <View style={styles.poolBadge}>
            <Text style={styles.poolBadgeText}>⏳ In Priority Pool — We'll notify you when an agent picks up</Text>
          </View>
        )}

        {/* KarmaCoins earned toast */}
        {earnedCoins !== null && (
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsBadgeText}>🎉 {earnedCoins} KarmaCoins credited to your wallet!</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingData.distanceKm} km</Text>
            <Text style={styles.statLabel}>Distance Away</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingData.etaMins} mins</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingData.estimatedCoins} KC</Text>
            <Text style={styles.statLabel}>Est. Coins</Text>
          </View>
        </View>

        {/* Progress Steps */}
        <Text style={styles.sectionTitle}>Tracking Progress</Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.stepRow}>
              {/* Icon */}
              <View style={styles.stepIconCol}>
                {step.done ? (
                  <View style={styles.stepDoneCircle}>
                    <CheckCircle2 size={20} color="white" fill="#15803d" />
                  </View>
                ) : step.active ? (
                  <Animated.View style={[styles.stepActiveCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={styles.stepActiveDot} />
                  </Animated.View>
                ) : (
                  <View style={styles.stepPendingCircle}>
                    <Circle size={20} color="#d1d5db" />
                  </View>
                )}
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
                )}
              </View>

              {/* Text */}
              <View style={styles.stepTextCol}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepLabel, step.active && styles.stepLabelActive, !step.done && !step.active && styles.stepLabelPending]}>
                    {step.label}
                  </Text>
                </View>
                <Text style={styles.stepSublabel}>{step.sublabel}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryBtn}>
          <Phone size={16} color="white" />
          <Text style={styles.primaryBtnText}>Contact Agent</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn}>
          <HelpCircle size={16} color="#475569" />
          <Text style={styles.secondaryBtnText}>Need Help?</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: { backgroundColor: '#15803d', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: 'white' },
  helpIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Booking Badge
  bookingBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  bookingBadgeLeft: {},
  bookingIdLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  bookingId: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  inProgressBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef9c3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  inProgressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ca8a04' },
  inProgressText: { fontSize: 10, fontWeight: '800', color: '#ca8a04' },

  // Agent Card
  agentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  agentInitials: { color: 'white', fontWeight: '800', fontSize: 16 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  agentRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  agentRating: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  agentDistance: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center' },

  // Map
  mapContainer: { marginHorizontal: 16, marginTop: 10, borderRadius: 20, overflow: 'hidden', height: height * 0.22, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  map: { flex: 1 },
  agentMarker: { backgroundColor: 'white', borderRadius: 20, padding: 4, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  agentMarkerEmoji: { fontSize: 22 },
  userMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: 'white' },

  // Bottom Sheet
  bottomSheet: { flex: 1, backgroundColor: 'white', marginTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, overflow: 'hidden' },

  // Live Status
  liveStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveStatusLabel: { fontSize: 13, fontWeight: '700', color: '#475569', flex: 1 },
  liveStatusTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  liveStatusText: { fontSize: 14, color: '#0f172a', fontWeight: '600', marginBottom: 16 },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#15803d' },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },

  // Steps
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  stepsContainer: { marginBottom: 24 },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepIconCol: { alignItems: 'center', width: 24 },
  stepDoneCircle: {},
  stepActiveCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  stepActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#15803d' },
  stepPendingCircle: {},
  stepLine: { width: 2, height: 36, backgroundColor: '#e2e8f0', marginVertical: 4 },
  stepLineDone: { backgroundColor: '#15803d' },
  stepTextCol: { flex: 1, paddingBottom: 20 },
  stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  stepLabelActive: { color: '#15803d' },
  stepLabelPending: { color: '#94a3b8' },
  stepTime: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  stepSublabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  poolBadge: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a' },
  poolBadgeText: { fontSize: 13, color: '#92400e', fontWeight: '600', lineHeight: 18 },
  coinsBadge: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  coinsBadgeText: { fontSize: 13, color: '#15803d', fontWeight: '700' },

  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 16, marginBottom: 12, elevation: 3, shadowColor: '#15803d', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
  secondaryBtnText: { color: '#475569', fontSize: 15, fontWeight: '700' },
});
