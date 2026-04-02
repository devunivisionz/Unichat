import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppSelector } from '../src/hooks/redux';
import { Colors } from '../src/utils/theme';

export default function IndexScreen() {
  const { isInitialized, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.primary,
        }}
      >
        <ActivityIndicator size="large" color={Colors.onPrimary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(app)/workspaces' : '/(auth)/welcome'} />;
}
