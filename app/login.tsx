import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const inputBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handleLogin = async () => {
    if (!email || !pin) return Alert.alert('Required', 'Please enter email and PIN');
    try {
      const key = `user:${email.toLowerCase()}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return Alert.alert('Not found', 'No account for this email');
      const user = JSON.parse(raw);
      if (user.pin === pin) {
        await AsyncStorage.setItem('currentUser', key);
        router.replace('/tree');
      } else {
        Alert.alert('Invalid PIN', 'Please try again');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to login');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <ThemedText style={styles.logoText}>FT</ThemedText>
            </View>
            <ThemedText style={styles.title}>Welcome Back</ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to continue tracing your roots</ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <TextInput 
                placeholder="name@example.com" 
                placeholderTextColor="#94a3b8" 
                style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]} 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Security PIN</ThemedText>
              <TextInput 
                placeholder="••••••" 
                placeholderTextColor="#94a3b8" 
                style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]} 
                value={pin} 
                onChangeText={setPin} 
                secureTextEntry 
                keyboardType="number-pad" 
                maxLength={6} 
              />
            </View>

            <Pressable style={[styles.button, { backgroundColor: tint }]} onPress={handleLogin}>
              <ThemedText style={styles.buttonText}>Sign In</ThemedText>
            </Pressable>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
              <Pressable onPress={() => router.push('/signup')}>
                <ThemedText style={[styles.link, { color: tint }]}>Create one</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#6366f1', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0px 4px 8px rgba(99,102,241,0.3)' },
      default: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }
    }),
    elevation: 5,
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16,
  },
  button: { 
    borderRadius: 12, 
    padding: 18, 
    alignItems: 'center', 
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#64748b', fontSize: 15 },
  link: { fontSize: 15, fontWeight: '700' },
});
