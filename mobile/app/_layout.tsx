import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../src/hooks/redux';
import { initializeAuth } from '../src/store/authSlice';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/utils/theme';

function RootLayout() {
  const dispatch = useAppDispatch();
  const { isInitialized, isAuthenticated } = useAppSelector(s => s.auth);

  useEffect(() => {
    dispatch(initializeAuth());
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.onPrimary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/welcome" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(app)/workspaces" />
      <Stack.Screen name="(app)/workspace/[workspaceId]" />
      <Stack.Screen name="(app)/dms/[workspaceId]" />
      <Stack.Screen name="(app)/channel/[channelId]" />
      <Stack.Screen name="(app)/dm/[dmId]" />
      <Stack.Screen name="(app)/thread/[messageId]" />
      <Stack.Screen name="(app)/search/[workspaceId]" />
      <Stack.Screen name="(app)/profile/[userId]" />
      <Stack.Screen name="(app)/starred/[workspaceId]" />
      <Stack.Screen name="(app)/settings" />
      <Stack.Screen name="(app)/create-channel/[workspaceId]" />
      <Stack.Screen name="(app)/create-workspace" />
      <Stack.Screen name="(app)/notifications" />
    </Stack>
  );
}

export default function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <StatusBar style="auto" />
          <RootLayout />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
