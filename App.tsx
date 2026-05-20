import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UserSocketProvider } from './src/context/UserSocketContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <UserSocketProvider>
        <RootNavigator />
      </UserSocketProvider>
    </SafeAreaProvider>
  );
}
