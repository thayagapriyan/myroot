import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FamilyService } from '@/services/family-service';
import { Member } from '@/types/family';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

export default function FamilyScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'card');

  const loadMembers = async () => {
    const key = await AsyncStorage.getItem('currentUser');
    if (!key) return router.replace('/login');
    const list = await FamilyService.getFamily(key);
    setMembers(list);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleReset = async () => {
    const performReset = async () => {
      const key = await AsyncStorage.getItem('currentUser');
      if (!key) return;
      await FamilyService.resetFamily(key);
      setMembers([]);
      Alert.alert('Success', 'All family data has been cleared.');
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to clear all family data? This cannot be undone.')) {
        performReset();
      }
      return;
    }

    Alert.alert('Reset Data', 'Clear all family data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: performReset }
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Family List', 
          headerRight: () => (
            <Pressable onPress={handleReset} style={{ marginRight: 10 }}>
              <ThemedText style={{ color: '#ef4444', fontWeight: '600' }}>Reset</ThemedText>
            </Pressable>
          )
        }} 
      />
      
      {members.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>No family members yet.</ThemedText>
          <Pressable style={[styles.addBtn, { backgroundColor: tint }]} onPress={() => router.push('/(modal)/add-relation')}>
            <ThemedText style={styles.addBtnText}>Add First Member</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable 
              style={[styles.card, { backgroundColor: cardBg, borderColor: border }]} 
              onPress={() => router.push(`/member?id=${item.id}`)}
            >
              <View style={[styles.avatar, { backgroundColor: tint + '20' }]}>
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={styles.avatarImg} />
                ) : (
                  <ThemedText style={{ color: tint, fontWeight: '700', fontSize: 18 }}>{item.name.charAt(0)}</ThemedText>
                )}
              </View>
              <View style={styles.info}>
                <ThemedText style={styles.name}>{item.name}</ThemedText>
                <ThemedText style={styles.details}>
                  {item.relations?.length || 0} relations
                  {item.dob ? ` • Born ${item.dob}` : ''}
                </ThemedText>
              </View>
              <ThemedText style={{ color: '#94a3b8' }}>›</ThemedText>
            </Pressable>
          )}
        />
      )}
      
      {members.length > 0 && (
        <Pressable style={[styles.fab, { backgroundColor: tint }]} onPress={() => router.push('/(modal)/add-relation')}>
          <ThemedText style={styles.fabText}>+</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#94a3b8', marginBottom: 20 },
  addBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  details: { fontSize: 13, color: '#64748b' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },
});
