import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Button, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AddMemberScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const inputBg = useThemeColor({ light: '#fff', dark: '#222' }, 'background');
  const border = useThemeColor({}, 'tint');

  const handleSave = async () => {
    if (!name) return Alert.alert('Name required');
    const userKey = await AsyncStorage.getItem('currentUser');
    if (!userKey) return router.replace('/login');
    const familyKey = `${userKey}:family`;
    const raw = await AsyncStorage.getItem(familyKey);
    const members = raw ? JSON.parse(raw) : [];
    const newMember = { id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`, name, dob, relations: [] };
    members.push(newMember);
    await AsyncStorage.setItem(familyKey, JSON.stringify(members));
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add member' }} />
      <ThemedText type="title" style={{ marginBottom: 12 }}>New family member</ThemedText>
      <TextInput placeholder="Name" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={name} onChangeText={setName} />
      <TextInput placeholder="Date of birth (YYYY-MM-DD)" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={dob} onChangeText={setDob} />
      <Button title="Save" onPress={handleSave} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
