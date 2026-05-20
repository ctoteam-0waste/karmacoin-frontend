import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { ArrowRight, Lock, User, CheckCircle2, CalendarDays, Heart, Briefcase, GraduationCap } from 'lucide-react-native';
import { authService } from '../services/auth';
import { profileService } from '../services/profile';

type Step = 'entry' | 'checking' | 'login' | 'signup' | 'demographics' | 'reset_password';

// Reusable Components
function InputField({ placeholder, value, onChange, secureTextEntry = false, icon, autoFocus = false, keyboardType = 'default', maxLength }: any) {
  return (
    <View style={styles.inputContainer}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <TextInput
        style={[styles.input, icon ? { paddingLeft: 48 } : {}]}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChange}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

function PrimaryButton({ onPress, disabled, loading, children, style }: any) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled || loading ? styles.buttonDisabled : undefined, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color="#fff" /> : children}
    </TouchableOpacity>
  );
}

function SelectionPills({ options, selected, onSelect }: { options: string[], selected: string, onSelect: (v: string) => void }) {
  return (
    <View style={styles.pillsContainer}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            {isActive && <CheckCircle2 size={14} color="white" style={{ marginRight: 6 }} />}
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function LoginScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('entry');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Demographics State
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [employment, setEmployment] = useState('');

  const handleContinue = async () => {
    if (!identifier.trim()) return;
    
    // Backend strictly expects an email right now
    if (!identifier.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setStep('checking');
    try {
      const res = await authService.checkUser(identifier.trim());
      
      if (res?.data?.isRegistered) {
        setStep('login');
      } else {
        setEmail(identifier.trim());
        setStep('signup');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to check account.');
      setStep('entry');
    }
  };

  const handleSignupSubmit = async () => {
    if (!password || !name || !email || !phone) return;
    setIsLoading(true);
    try {
      await authService.register({ name, email, phone, password });
      // Registration successful! Now let's log them in to get the token.
      await authService.login(email, password);
      setStep('demographics');
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.response?.data?.message || 'Registration failed');
      console.error(error);
    } finally {
      setIsLoading(false);
      
  
    }
  };

  const handleLoginSubmit = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      await authService.login(identifier, password);
      navigation.replace('App');
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.message || 'Login failed. Check your credentials.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    setIsLoading(true);
    try {
      await profileService.updateDemographics({ 
        age: parseInt(age) || 0, 
        gender, 
        maritalStatus, 
        employment 
      });
      navigation.replace('App');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }

  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Invalid Password", "Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.resetPassword(identifier.trim(), newPassword);
      if (res.success) {
        Alert.alert("Success", "Password reset successfully! You can now log in.");
        setPassword('');
        setNewPassword('');
        setStep('login');
      }
    } catch (error: any) {
      Alert.alert("Reset Failed", error?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 'entry') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Welcome 👋</Text>
            <Text style={styles.subtitle}>Enter your email address to get started</Text>
          </View>
          <InputField 
            placeholder="Email address"
            value={identifier}
            onChange={setIdentifier}
            icon={<User size={18} color="#94a3b8" />}
            autoFocus
          />
          <PrimaryButton onPress={handleContinue} disabled={!identifier} loading={isLoading}>
            <Text style={styles.buttonText}>Continue</Text>
            <ArrowRight size={18} color="#fff" />
          </PrimaryButton>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('signup')}>
             <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>New user? Create an account</Text>
          </TouchableOpacity>

          {/* Social Login Separator */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons Row */}
          <View style={styles.socialRow}>
            {/* Google */}
            <TouchableOpacity
              style={styles.socialIconBtnZomato}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Coming Soon', 'Google login coming soon!')}
            >
              <Svg width="26" height="26" viewBox="0 0 48 48">
                <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </Svg>
            </TouchableOpacity>

            {/* Apple */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialIconBtnZomato}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Coming Soon', 'Apple login coming soon!')}
              >
                <Svg width="30" height="30" viewBox="0 0 384 512">
                  <Path fill="#000" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </Svg>
              </TouchableOpacity>
            )}

            {/* Facebook */}
            <TouchableOpacity
              style={styles.socialIconBtnZomato}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Coming Soon', 'Facebook login coming soon!')}
            >
              <Svg width="26" height="26" viewBox="0 0 24 24">
                <Path fill="#1877F2" d="M24 12.073C24 5.449 18.627 0 12 0S0 5.449 0 12.073c0 5.986 4.388 10.942 10.125 11.905v-8.428H7.078v-3.477h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.477h-2.796v8.428C19.612 23.015 24 18.059 24 12.073z" />
                <Path fill="#FFF" d="M16.671 15.55l.532-3.477h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.514V5.006s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.477h3.047v8.428a12.04 12.04 0 003.75 0v-8.428h2.796z" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    if (step === 'checking') {
      return (
        <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', marginTop: 40 }]}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Checking your account...</Text>
        </View>
    
      );
    }

    if (step === 'login') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Signing in as {identifier}</Text>
          </View>
          <InputField
            placeholder="Password"
            value={password}
            onChange={setPassword}
            secureTextEntry
            icon={<Lock size={18} color="#94a3b8" />}
            autoFocus
          />
          <PrimaryButton onPress={handleLoginSubmit} disabled={!password || isLoading} loading={isLoading}>
            <Text style={styles.buttonText}>Login</Text>
            <ArrowRight size={18} color="#fff" />
          </PrimaryButton>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <TouchableOpacity onPress={() => setStep('entry')}>
               <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Change account</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('reset_password')}>
               <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'reset_password') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Reset Password 🔐</Text>
            <Text style={styles.subtitle}>Enter a new password for {identifier}</Text>
          </View>
          <InputField
            placeholder="New Password (min 6 chars)"
            value={newPassword}
            onChange={setNewPassword}
            secureTextEntry
            icon={<Lock size={18} color="#94a3b8" />}
            autoFocus
          />
          <PrimaryButton onPress={handleResetPassword} disabled={!newPassword || isLoading} loading={isLoading}>
            <Text style={styles.buttonText}>Reset Password</Text>
            <CheckCircle2 size={18} color="#fff" />
          </PrimaryButton>
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('login')}>
             <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'signup') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Create your account 🌱</Text>
            <Text style={styles.subtitle}>Join us and earn Karma Credits!</Text>
          </View>
          <InputField
            placeholder="Full Name"
            value={name}
            onChange={setName}
            icon={<User size={18} color="#94a3b8" />}
          />
          <InputField
            placeholder="Email Address"
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            icon={<User size={18} color="#94a3b8" />}
          />
          <InputField
            placeholder="Phone Number (10 digits)"
            value={phone}
            onChange={setPhone}
            keyboardType="number-pad"
            maxLength={10}
            icon={<User size={18} color="#94a3b8" />}
          />
          <InputField
            placeholder="Create Password"
            value={password}
            onChange={setPassword}
            secureTextEntry
            icon={<Lock size={18} color="#94a3b8" />}
          />
          <PrimaryButton onPress={handleSignupSubmit} disabled={!password || !name || !email || !phone || isLoading} loading={isLoading}>
            <Text style={styles.buttonText}>Sign Up</Text>
            <ArrowRight size={18} color="#fff" />
          </PrimaryButton>
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('entry')}>
             <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'demographics') {
      const isComplete = age && gender && maritalStatus && employment;

      return (
        <ScrollView style={{flex: 1, marginHorizontal: -24}} contentContainerStyle={styles.scrollStepContent} showsVerticalScrollIndicator={false}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>Personalize Profile</Text>
            <Text style={styles.demoSubtitle}>Help us tailor the best eco-rewards directly for you.</Text>
          </View>

          <View style={styles.formCard}>
            
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <CalendarDays size={18} color="#0f172a" />
                <Text style={styles.fieldLabel}>Your Age</Text>
              </View>
              <InputField
                placeholder="e.g. 25"
                value={age}
                onChange={setAge}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <User size={18} color="#0f172a" />
                <Text style={styles.fieldLabel}>Identity (Gender)</Text>
              </View>
              <SelectionPills 
                options={['Male', 'Female', 'Other', 'Select Later']} 
                selected={gender} 
                onSelect={setGender} 
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Heart size={18} color="#0f172a" />
                <Text style={styles.fieldLabel}>Marital Status</Text>
              </View>
              <SelectionPills 
                options={['Single', 'Married']} 
                selected={maritalStatus} 
                onSelect={setMaritalStatus} 
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Briefcase size={18} color="#0f172a" />
                <Text style={styles.fieldLabel}>Employment</Text>
              </View>
              <SelectionPills 
                options={['Student', 'Employed', 'Business', 'Unemployed']} 
                selected={employment} 
                onSelect={setEmployment} 
              />
            </View>

          </View>

          <PrimaryButton 
            onPress={handleCompleteRegistration} 
            disabled={!isComplete} 
            loading={isLoading}
            style={{marginTop: 8}}
          >
            <Text style={styles.buttonText}>Complete Registration</Text>
            <CheckCircle2 size={20} color="#fff" />
          </PrimaryButton>
        </ScrollView>
      );
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: step === 'demographics' ? '#f0fdf4' : '#ffffff' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      
      {/* This absolute block only colors the top notch and the dark part of the header. It doesn't reach the curved corners. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: '#064e3b' }} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
          <KarmaCoin size={54} glow />
          <Text style={styles.headerTitle}>Karma Credits</Text>
        </LinearGradient>
        
        <View style={[styles.body, step === 'demographics' && { paddingHorizontal: 0, paddingBottom: 0 }]}>
          {renderStep()}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#064e3b' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: '#064e3b' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  
  stepContent: { gap: 24 },
  scrollStepContent: { paddingHorizontal: 24, paddingBottom: 50, gap: 16 },
  
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 20, fontWeight: '500' },
  successTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  successTagText: { fontSize: 12, color: '#16a34a', fontWeight: '800' },
  
  inputContainer: { position: 'relative', justifyContent: 'center' },
  iconWrapper: { position: 'absolute', left: 16, zIndex: 1 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700'
  },
  
  button: {
    height: 60,
    backgroundColor: '#16a34a',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  dividerText: { marginHorizontal: 16, color: '#94a3b8', fontSize: 13, fontWeight: '700' },

  // Zomato Style Circular Social Login Buttons
  socialRow: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  socialIconBtnZomato: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  // Demographics Premium UI Redesign
  demoHeader: { alignItems: 'center', marginBottom: 12, marginTop: 10 },
  demoTitle: { fontSize: 28, fontWeight: '900', color: '#064e3b', textAlign: 'center' },
  demoSubtitle: { fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 },
  
  formCard: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 20, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    marginBottom: 20 
  },
  
  fieldSection: { marginVertical: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fieldLabel: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  fieldDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 100, 
    backgroundColor: '#f8fafc', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0' 
  },
  pillActive: { 
    backgroundColor: '#16a34a', 
    borderColor: '#16a34a', 
    shadowColor: '#16a34a', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4 
  },
  pillText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: 'white', fontWeight: '800' },
});
