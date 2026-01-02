import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const activeUserId = await AsyncStorage.getItem('activeUserId');
        if (activeUserId) {
          router.replace(`/member?id=${activeUserId}`);
        } else {
          router.replace('/tree');
        }
      } catch {
        router.replace('/tree');
      }
    })();
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" />
      <ThemedText style={{ marginTop: 20 }}>Loading Profile...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
