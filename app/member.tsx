import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Button, FlatList, Pressable, TextInput, Alert, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

const RELATION_TYPES = [
  'parent',
  'child',
  'spouse',
  'sibling',
  'grandparent',
  'grandchild',
  'aunt/uncle',
  'niece/nephew',
  'cousin',
  'partner',
  'other',
];

function reciprocal(type: string) {
  switch (type) {
    case 'parent':
      return 'child';
    case 'child':
      return 'parent';
    case 'grandparent':
      return 'grandchild';
    case 'grandchild':
      return 'grandparent';
    case 'aunt/uncle':
      return 'niece/nephew';
    case 'niece/nephew':
      return 'aunt/uncle';
    case 'spouse':
    case 'partner':
      return type;
    case 'sibling':
    case 'cousin':
      return type;
    default:
      return 'other';
  }
}

export default function MemberScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [member, setMember] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingCustom, setEditingCustom] = useState('');
  const inputBg = useThemeColor({ light: '#fff', dark: '#222' }, 'background');
  const border = useThemeColor({}, 'tint');

  useEffect(() => {
    (async () => {
      const userKey = await AsyncStorage.getItem('currentUser');
      if (!userKey) return router.replace('/login');
      const familyKey = `${userKey}:family`;
      const raw = await AsyncStorage.getItem(familyKey);
      const list = raw ? JSON.parse(raw) : [];
      setMembers(list);
      const found = list.find((m: any) => m.id === id);
      setMember(found);
    })();
  }, [id]);

  const saveMembers = async (list: any[]) => {
    const userKey = await AsyncStorage.getItem('currentUser');
    if (!userKey) return router.replace('/login');
    const familyKey = `${userKey}:family`;
    await AsyncStorage.setItem(familyKey, JSON.stringify(list));
    setMembers(list);
    const found = list.find((m: any) => m.id === id);
    setMember(found);
  };

  const handleAddRelationTo = async (targetId: string) => {
    if (!member) return;
    const type = selectedType === 'other' ? customLabel || 'other' : selectedType;
    if (!type) return Alert.alert('Select relation type');
    if (targetId === member.id) return Alert.alert('Invalid', 'Cannot relate to self');

    const list = [...members];
    const meIdx = list.findIndex((m) => m.id === member.id);
    const targetIdx = list.findIndex((m) => m.id === targetId);
    if (meIdx === -1 || targetIdx === -1) return Alert.alert('Error', 'Member not found');

    list[meIdx].relations = list[meIdx].relations || [];
    list[targetIdx].relations = list[targetIdx].relations || [];

    // avoid duplicate same relation to same person
    const exists = list[meIdx].relations.find((r: any) => r.targetId === targetId && r.type === type);
    if (exists) return Alert.alert('Exists', 'This relation already exists');

    list[meIdx].relations.push({ type, targetId });
    const reciprocalType = reciprocal(type);
    list[targetIdx].relations.push({ type: reciprocalType, targetId: member.id });

    await saveMembers(list);
    setAdding(false);
    setSelectedType(null);
    setCustomLabel('');
  };

  const handleStartEdit = (index: number) => {
    if (!member) return;
    const rel = member.relations?.[index];
    if (!rel) return;
    setEditingIndex(index);
    setEditingType(rel.type || 'other');
    setEditingCustom(rel.type === 'other' ? rel.type : '');
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !member) return;
    if (!editingType) return Alert.alert('Select relation type');
    const newType = editingType === 'other' ? (editingCustom || 'other') : editingType;
    const list = [...members];
    const meIdx = list.findIndex((m) => m.id === member.id);
    if (meIdx === -1) return Alert.alert('Error', 'Member not found');

    const rel = list[meIdx].relations?.[editingIndex];
    if (!rel) return Alert.alert('Error', 'Relation not found');
    const targetId = rel.targetId;

    // update this relation
    list[meIdx].relations[editingIndex].type = newType;

    // update reciprocal relation on target
    const targetIdx = list.findIndex((m) => m.id === targetId);
    if (targetIdx !== -1) {
      list[targetIdx].relations = list[targetIdx].relations || [];
      const recIdx = list[targetIdx].relations.findIndex((r: any) => r.targetId === member.id);
      const recType = reciprocal(newType);
      if (recIdx !== -1) {
        list[targetIdx].relations[recIdx].type = recType;
      } else {
        list[targetIdx].relations.push({ type: recType, targetId: member.id });
      }
    }

    await saveMembers(list);
    setEditingIndex(null);
    setEditingType(null);
    setEditingCustom('');
  };

  const handleRemoveRelation = (index: number) => {
    if (!member) return;
    Alert.alert('Remove relation', 'Are you sure you want to remove this relation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const list = [...members];
          const meIdx = list.findIndex((m) => m.id === member.id);
          if (meIdx === -1) return;
          const rel = list[meIdx].relations?.[index];
          if (!rel) return;
          const targetId = rel.targetId;
          // remove from me
          list[meIdx].relations = list[meIdx].relations.filter((_: any, i: number) => i !== index);
          // remove reciprocal from target
          const targetIdx = list.findIndex((m) => m.id === targetId);
          if (targetIdx !== -1) {
            list[targetIdx].relations = (list[targetIdx].relations || []).filter((r: any) => r.targetId !== member.id);
          }
          await saveMembers(list);
        },
      },
    ]);
  };

  if (!member) return (
    <ThemedView style={styles.container}><ThemedText>Loading...</ThemedText></ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: member.name }} />
      {member.photo ? <Image source={{ uri: member.photo }} style={styles.avatar} /> : null}
      <ThemedText style={styles.name}>{member.name}</ThemedText>
      <ThemedText>{member.dob}</ThemedText>

      <View style={{ height: 12 }} />
      <ThemedText style={{ fontWeight: '600' }}>Relations</ThemedText>
      {(member.relations || []).length === 0 ? <ThemedText style={{ marginVertical: 8 }}>No relations yet</ThemedText> : (
        <FlatList data={member.relations} keyExtractor={(r: any, i) => `${r.targetId}-${i}`} renderItem={({ item, index }) => {
          const target = members.find((m) => m.id === item.targetId);
          return (
            <View style={[styles.relationRow, { borderBottomColor: border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: '600' }}>{item.type}</ThemedText>
                <ThemedText style={{ marginTop: 2 }}>{target ? target.name : item.targetId}</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => handleStartEdit(index)} style={styles.actionButton}>
                  <ThemedText style={{ color: '#0a84ff' }}>Edit</ThemedText>
                </Pressable>
                <Pressable onPress={() => handleRemoveRelation(index)} style={styles.actionButton}>
                  <ThemedText style={{ color: '#ff3b30' }}>Remove</ThemedText>
                </Pressable>
              </View>
            </View>
          );
        }} />
      )}

      <View style={{ height: 12 }} />
      {!adding ? (
        <Button title="Add relation" onPress={() => setAdding(true)} />
      ) : (
        <View>
          <ThemedText style={{ fontWeight: '600', marginBottom: 6 }}>Choose relation type</ThemedText>
          <FlatList data={RELATION_TYPES} keyExtractor={(t) => t} renderItem={({ item }) => (
            <Pressable style={[styles.typeRow, { borderBottomColor: border }]} onPress={() => setSelectedType(item)}>
              <ThemedText style={{ fontWeight: selectedType === item ? '700' : '400' }}>{item}</ThemedText>
            </Pressable>
          )} />
          {selectedType === 'other' ? (
            <TextInput placeholder="Custom label" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={customLabel} onChangeText={setCustomLabel} />
          ) : null}
          <ThemedText style={{ fontWeight: '600', marginTop: 8 }}>Choose target member</ThemedText>
          <FlatList data={members.filter(m => m.id !== member.id)} keyExtractor={(m) => m.id} renderItem={({ item }) => (
            <Pressable style={[styles.targetRow, { borderBottomColor: border }]} onPress={() => handleAddRelationTo(item.id)}>
              {item.photo ? <Image source={{ uri: item.photo }} style={styles.thumb} /> : null}
              <ThemedText style={{ marginLeft: 8 }}>{item.name}</ThemedText>
            </Pressable>
          )} />
          <View style={{ height: 8 }} />
          <Button title="Cancel" onPress={() => { setAdding(false); setSelectedType(null); setCustomLabel(''); }} />
        </View>
      )}

      {/* Edit relation UI */}
      {editingIndex !== null ? (
        <View style={{ marginTop: 12 }}>
          <ThemedText style={{ fontWeight: '600', marginBottom: 6 }}>Edit relation</ThemedText>
          <FlatList data={RELATION_TYPES} keyExtractor={(t) => t} renderItem={({ item }) => (
            <Pressable style={[styles.typeRow, { borderBottomColor: border }]} onPress={() => setEditingType(item)}>
              <ThemedText style={{ fontWeight: editingType === item ? '700' : '400' }}>{item}</ThemedText>
            </Pressable>
          )} />
          {editingType === 'other' ? (
            <TextInput placeholder="Custom label" placeholderTextColor="#888" style={[styles.input, { backgroundColor: inputBg, borderColor: border }]} value={editingCustom} onChangeText={setEditingCustom} />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Save" onPress={handleSaveEdit} />
            <Button title="Cancel" onPress={() => { setEditingIndex(null); setEditingType(null); setEditingCustom(''); }} />
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '600' },
  relationRow: { flexDirection: 'row', paddingVertical: 8, alignItems: 'center' },
  typeRow: { padding: 10, borderBottomWidth: 1 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, marginVertical: 8 },
  targetRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  thumb: { width: 36, height: 36, borderRadius: 18 },
  actionButton: { paddingHorizontal: 8, paddingVertical: 4 },
});
