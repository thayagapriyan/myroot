import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [pin, setPin] = useState('');
  const inputBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handleSignup = async () => {
    if (!email || !name || !pin) return Alert.alert('Missing', 'Please fill required fields');
    try {
      const key = `user:${email.toLowerCase()}`;
      const exists = await AsyncStorage.getItem(key);
      if (exists) return Alert.alert('Exists', 'An account with this email already exists');
      const user = { name, email: email.toLowerCase(), dob, pin };
      await AsyncStorage.setItem(key, JSON.stringify(user));
      await AsyncStorage.setItem('currentUser', key);
      Alert.alert('Success', 'Account created successfully');
      router.replace('/tree');
    } catch (err) {
      Alert.alert('Error', 'Failed to create account');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={{ fontSize: 24, color: tint }}>←</ThemedText>
            </Pressable>
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>Start building your family legacy today</ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput 
                placeholder="John Doe" 
                placeholderTextColor="#94a3b8" 
                style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]} 
                value={name} 
                onChangeText={setName} 
              />
            </View>

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
              <ThemedText style={styles.label}>Date of Birth</ThemedText>
              <TextInput 
                placeholder="YYYY-MM-DD" 
                placeholderTextColor="#94a3b8" 
                style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]} 
                value={dob} 
                onChangeText={setDob} 
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Security PIN (6 digits)</ThemedText>
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

            <Pressable style={[styles.button, { backgroundColor: tint }]} onPress={handleSignup}>
              <ThemedText style={styles.buttonText}>Create Account</ThemedText>
            </Pressable>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
              <Pressable onPress={() => router.push('/login')}>
                <ThemedText style={[styles.link, { color: tint }]}>Sign In</ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 40 },
  backButton: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30, marginBottom: 40 },
  footerText: { color: '#64748b', fontSize: 15 },
  link: { fontSize: 15, fontWeight: '700' },
});
