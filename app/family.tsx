import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Button, FlatList, Image, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Member = {
  id: string;
  name: string;
  dob?: string;
  photo?: string;
  relations?: { type: string; targetId: string }[];
};

export default function FamilyScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const borderColor = useThemeColor({}, 'tint');

  useEffect(() => {
    (async () => {
      const key = await AsyncStorage.getItem('currentUser');
      if (!key) return router.replace('/login');
      const familyKey = `${key}:family`;
      const raw = await AsyncStorage.getItem(familyKey);
      setMembers(raw ? JSON.parse(raw) : []);
    })();
  }, []);

  const render = ({ item }: { item: Member }) => (
    <Pressable style={[styles.member, { borderBottomColor: borderColor }]} onPress={() => router.push(`/member?id=${item.id}`)}>
      {item.photo ? <Image source={{ uri: item.photo }} style={styles.thumb} /> : null}
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontWeight: '600' }}>{item.name}</ThemedText>
        <ThemedText>{item.dob}</ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Family' }} />
      <Button title="Add member" onPress={() => router.push('/add-member')} />
      <FlatList data={members} keyExtractor={(i) => i.id} renderItem={render} style={{ marginTop: 12 }} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  member: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, alignItems: 'center' },
  thumb: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
});
