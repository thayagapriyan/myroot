import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Button, Image, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const current = await AsyncStorage.getItem('currentUser');
      if (!current) return router.replace('/login');
      const raw = await AsyncStorage.getItem(current);
      setUser(raw ? JSON.parse(raw) : null);
    })();
  }, []);

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      {user.photo ? <Image source={{ uri: user.photo }} style={styles.avatar} /> : null}
      <ThemedText style={styles.name}>{user.name}</ThemedText>
      <ThemedText>{user.email}</ThemedText>
      <ThemedText>{user.dob}</ThemedText>
      <View style={{ height: 12 }} />
      <Button title="Open family" onPress={() => router.push('/family')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '600' },
});
