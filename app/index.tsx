import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const user = await AsyncStorage.getItem('currentUser');
        if (user) {
          router.replace('/tree');
        } else {
          router.replace('/login');
        }
      } catch (e) {
        router.replace('/login');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
