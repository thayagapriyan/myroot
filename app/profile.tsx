import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const currentKey = await AsyncStorage.getItem('currentUser');
        if (!currentKey) {
          router.replace('/login');
          return;
        }
        
        // Find my ID in the family list
        const familyKey = `${currentKey}:family`;
        const rawFamily = await AsyncStorage.getItem(familyKey);
        const family = rawFamily ? JSON.parse(rawFamily) : [];
        
        const userRaw = await AsyncStorage.getItem(currentKey);
        const user = userRaw ? JSON.parse(userRaw) : {};
        
        // Try to find by email or name
        const me = family.find((m: any) => 
          (user.email && m.email === user.email) || 
          (user.name && m.name === user.name)
        );
        
        if (me) {
          router.replace(`/member?id=${me.id}`);
        } else {
          // If not found, go to tree which usually initializes the user
          router.replace('/tree');
        }
      } catch (e) {
        router.replace('/login');
      }
    })();
  }, []);

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
