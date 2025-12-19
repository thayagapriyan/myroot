import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Button, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [pin, setPin] = useState('');
  const inputBg = useThemeColor({ light: '#fff', dark: '#222' }, 'background');
  const border = useThemeColor({}, 'tint');

  const handleSignup = async () => {
    if (!email || !name || !pin) return Alert.alert('Missing', 'Please fill required fields');
    const key = `user:${email.toLowerCase()}`;
    const exists = await AsyncStorage.getItem(key);
    if (exists) return Alert.alert('Exists', 'An account with this email already exists');
    const user = { name, email: email.toLowerCase(), dob, pin };
    await AsyncStorage.setItem(key, JSON.stringify(user));
    await AsyncStorage.setItem('currentUser', key);
    Alert.alert('Created', 'Account created');
    router.replace('/profile');
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Sign up' }} />
      <ThemedText type="title" style={{ marginBottom: 12 }}>Create account</ThemedText>
      <TextInput placeholder="Name" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={name} onChangeText={setName} />
      <TextInput placeholder="Email" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput placeholder="Date of birth (YYYY-MM-DD)" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={dob} onChangeText={setDob} />
      <TextInput placeholder="PIN" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" />
      <Button title="Create account" onPress={handleSignup} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
