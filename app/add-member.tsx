import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function AddMemberScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  
  const inputBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Name required');
    const userKey = await AsyncStorage.getItem('currentUser');
    if (!userKey) return router.replace('/login');
    const familyKey = `${userKey}:family`;
    const raw = await AsyncStorage.getItem(familyKey);
    const members = raw ? JSON.parse(raw) : [];
    const newMember = { 
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`, 
      name: name.trim(), 
      dob: dob.trim(), 
      relations: [] 
    };
    members.push(newMember);
    await AsyncStorage.setItem(familyKey, JSON.stringify(members));
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add Member', headerTitleStyle: { fontWeight: '800' } }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: tint + '10' }]}>
            <ThemedText style={{ fontSize: 32, color: tint }}>👤</ThemedText>
          </View>
          <ThemedText style={styles.title}>New Family Member</ThemedText>
          <ThemedText style={styles.subtitle}>Add a new person to your family tree</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <TextInput 
              placeholder="e.g. John Doe" 
              placeholderTextColor="#94a3b8" 
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]} 
              value={name} 
              onChangeText={setName} 
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Date of Birth</ThemedText>
            <TextInput 
              placeholder="YYYY-MM-DD" 
              placeholderTextColor="#94a3b8" 
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]} 
              value={dob} 
              onChangeText={setDob} 
            />
          </View>

          <Pressable style={[styles.saveButton, { backgroundColor: tint }]} onPress={handleSave}>
            <ThemedText style={styles.saveButtonText}>Add Member</ThemedText>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <ThemedText style={{ color: '#64748b', fontWeight: '600' }}>Cancel</ThemedText>
          </Pressable>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16 },
  saveButton: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelButton: { padding: 16, alignItems: 'center' },
});
