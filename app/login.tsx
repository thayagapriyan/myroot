import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Button, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const inputBg = useThemeColor({ light: '#fff', dark: '#222' }, 'background');
  const border = useThemeColor({}, 'tint');

  const handleLogin = async () => {
    try {
      const key = `user:${email.toLowerCase()}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return Alert.alert('Not found', 'No account for this email');
      const user = JSON.parse(raw);
      if (user.pin === pin) {
        await AsyncStorage.setItem('currentUser', key);
        router.replace('/family');
      } else {
        Alert.alert('Invalid PIN', 'Please try again');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to login');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Login' }} />
      <ThemedText type="title" style={{ marginBottom: 12 }}>Welcome back</ThemedText>
      <TextInput placeholder="Email" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput placeholder="PIN" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" maxLength={6} />
      <Button title="Login" onPress={handleLogin} />
      <View style={{ height: 12 }} />
      <Button title="Sign up" onPress={() => router.push('/signup')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
