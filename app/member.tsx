import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FamilyService } from '@/services/familyService';
import { Member } from '@/types/Family';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

const RELATION_TYPES = [
  'parent',
  'child',
  'spouse',
  'sibling',
  'partner',
  'other',
];

function reciprocal(type: string) {
  switch (type) {
    case 'parent': return 'child';
    case 'child': return 'parent';
    case 'spouse':
    case 'partner':
    case 'sibling':
      return type;
    default: return 'other';
  }
}

export default function MemberScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingCustom, setEditingCustom] = useState('');
  const [addNewMember, setAddNewMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [sexInput, setSexInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [tempDob, setTempDob] = useState<Date | null>(null);

  const inputBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const computeAge = (dob?: string) => {
    if (!dob) return undefined;
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return undefined;
    const now = new Date();
    let age = now.getFullYear() - parsed.getFullYear();
    const m = now.getMonth() - parsed.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1;
    return age >= 0 ? age : undefined;
  };

  useEffect(() => {
    (async () => {
      const userKey = await AsyncStorage.getItem('currentUser');
      if (!userKey) return router.replace('/login');
      const list = await FamilyService.getFamily(userKey);
      setMembers(list);
      const found = list.find((m) => m.id === id);
      setMember(found || null);
    })();
  }, [id, router]);

  useEffect(() => {
    if (member) {
      setSexInput(member.sex || '');
      setDobInput(member.dob || '');
      setTempDob(member.dob ? new Date(member.dob) : null);
    } else {
      setSexInput('');
      setDobInput('');
      setTempDob(null);
    }
  }, [member]);

  const saveMembers = async (list: Member[]) => {
    const userKey = await AsyncStorage.getItem('currentUser');
    if (!userKey) return router.replace('/login');
    await FamilyService.saveFamily(userKey, list);
    setMembers(list);
    const found = list.find((m) => m.id === id);
    setMember(found || null);
  };

  const handlePickProfilePhoto = async () => {
    if (!member) return;

    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow photo library access to choose a profile picture.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;
      let uri = result.assets?.[0]?.uri;
      if (!uri) return;

      // On native, copy the image to a permanent location
      if (Platform.OS !== 'web') {
        try {
          const photosDir = `${FileSystem.documentDirectory}photos/`;
          await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true }).catch(() => {});
          const filename = `${member.id}_${Date.now()}.jpg`;
          const dest = `${photosDir}${filename}`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uri = dest;
        } catch (err) {
          console.error('Failed to copy photo:', err);
        }
      }

      const list = [...members];
      const idx = list.findIndex((m) => m.id === member.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], photo: uri };
      }

      // If this member is the current user's profile, also store the photo in the user record.
      const currentKey = await AsyncStorage.getItem('currentUser');
      if (currentKey) {
        const userRaw = await AsyncStorage.getItem(currentKey);
        const user = userRaw ? JSON.parse(userRaw) : null;
        const isMe = !!user && ((user.email && member.email && user.email === member.email) || (user.name && user.name === member.name));
        if (isMe) {
          const nextUser = { ...user, photo: uri };
          await AsyncStorage.setItem(currentKey, JSON.stringify(nextUser));
        }
      }

      await saveMembers(list);
    } catch {
      Alert.alert('Error', 'Could not pick an image.');
    }
  };

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const commitDobValue = (date: Date) => {
    const next = formatDate(date);
    setDobInput(next);
    setTempDob(date);
  };

  const handleOpenDobPicker = () => {
    if (Platform.OS === 'web') return; // fallback to text input on web
    const base = dobInput ? new Date(dobInput) : new Date();
    setTempDob(Number.isNaN(base.getTime()) ? new Date() : base);
    setShowDobPicker(true);
  };

  const handleDobPickerChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (Platform.OS === 'android' && event?.type === 'set') {
        commitDobValue(selectedDate);
      } else {
        setTempDob(selectedDate);
      }
    }

    if (Platform.OS === 'android') {
      if (event?.type === 'set' || event?.type === 'dismissed') {
        setShowDobPicker(false);
      }
    }
  };

  const handleConfirmDob = () => {
    if (!tempDob) {
      setShowDobPicker(false);
      return;
    }
    commitDobValue(tempDob);
    setShowDobPicker(false);
  };

  const handleSaveProfileInfo = async () => {
    if (!member) return;
    const list = [...members];
    const idx = list.findIndex((m) => m.id === member.id);
    if (idx === -1) return Alert.alert('Error', 'Member not found');

    const cleanSex = sexInput.trim();
    const cleanDob = dobInput.trim();
    const age = computeAge(cleanDob || undefined);

    list[idx] = {
      ...list[idx],
      sex: cleanSex || undefined,
      dob: cleanDob || undefined,
      age,
    };

    // If this member is the logged-in user, sync minimal fields back to the user record.
    const currentKey = await AsyncStorage.getItem('currentUser');
    if (currentKey) {
      const userRaw = await AsyncStorage.getItem(currentKey);
      const user = userRaw ? JSON.parse(userRaw) : null;
      const isMe = !!user && ((user.email && member.email && user.email === member.email) || (user.name && user.name === member.name));
      if (isMe) {
        const nextUser = { ...user, dob: cleanDob || undefined, sex: cleanSex || undefined, age };
        await AsyncStorage.setItem(currentKey, JSON.stringify(nextUser));
      }
    }

    await saveMembers(list);
    Alert.alert('Saved', 'Profile updated');
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

    const exists = list[meIdx].relations!.find((r) => r.targetId === targetId && r.type === type);
    if (exists) return Alert.alert('Exists', 'This relation already exists');

    list[meIdx].relations!.push({ type, targetId });
    const reciprocalType = reciprocal(type);
    list[targetIdx].relations!.push({ type: reciprocalType, targetId: member.id });

    await saveMembers(list);
    setAdding(false);
    setSelectedType(null);
    setCustomLabel('');
  };

  const handleAddNewMember = async () => {
    if (!member || !newMemberName.trim()) return Alert.alert('Name required');
    const type = selectedType === 'other' ? customLabel || 'other' : selectedType;
    if (!type) return Alert.alert('Select relation type');

    const list = [...members];
    const meIdx = list.findIndex((m) => m.id === member.id);
    if (meIdx === -1) return Alert.alert('Error', 'Member not found');

    const newId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newMember: Member = { id: newId, name: newMemberName.trim(), relations: [] };
    list.push(newMember);

    list[meIdx].relations = list[meIdx].relations || [];
    list[meIdx].relations!.push({ type, targetId: newId });
    const reciprocalType = reciprocal(type);
    newMember.relations!.push({ type: reciprocalType, targetId: member.id });

    await saveMembers(list);
    setAdding(false);
    setSelectedType(null);
    setCustomLabel('');
    setAddNewMember(false);
    setNewMemberName('');
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

    list[meIdx].relations![editingIndex].type = newType;

    const targetIdx = list.findIndex((m) => m.id === targetId);
    if (targetIdx !== -1) {
      list[targetIdx].relations = list[targetIdx].relations || [];
      const recIdx = list[targetIdx].relations!.findIndex((r) => r.targetId === member.id);
      const recType = reciprocal(newType);
      if (recIdx !== -1) {
        list[targetIdx].relations![recIdx].type = recType;
      } else {
        list[targetIdx].relations!.push({ type: recType, targetId: member.id });
      }
    }

    await saveMembers(list);
    setEditingIndex(null);
    setEditingType(null);
    setEditingCustom('');
  };

  const handleRemoveRelation = (index: number) => {
    if (!member) return;

    const performRemove = async () => {
      const list = [...members];
      const meIdx = list.findIndex((m) => m.id === member.id);
      if (meIdx === -1) return;
      const rel = list[meIdx].relations?.[index];
      if (!rel) return;
      const targetId = rel.targetId;
      list[meIdx].relations = list[meIdx].relations!.filter((_, i) => i !== index);
      const targetIdx = list.findIndex((m) => m.id === targetId);
      if (targetIdx !== -1) {
        list[targetIdx].relations = (list[targetIdx].relations || []).filter((r) => r.targetId !== member.id);
      }
      await saveMembers(list);
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to remove this relation?')) {
        performRemove();
      }
      return;
    }

    Alert.alert('Remove relation', 'Are you sure you want to remove this relation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: performRemove,
      },
    ]);
  };

  const derivedRelations = useMemo(() => {
    if (!member) return { siblings: [], grandparents: [], cousins: [], nephews: [], nieces: [] };

    const byId = new Map(members.map((m) => [m.id, m] as const));

    const parentsOf = (id: string) => {
      const m = byId.get(id);
      if (!m) return [] as string[];
      return (m.relations || []).filter((r) => r.type === 'parent').map((r) => r.targetId).filter((pid) => byId.has(pid));
    };

    const childrenOf = (id: string) => {
      const m = byId.get(id);
      if (!m) return [] as string[];
      return (m.relations || []).filter((r) => r.type === 'child').map((r) => r.targetId).filter((cid) => byId.has(cid));
    };

    const siblingIds = (() => {
      const parents = parentsOf(member.id);
      const sibs = new Set<string>();
      parents.forEach((p) => {
        childrenOf(p).forEach((c) => {
          if (c !== member.id) sibs.add(c);
        });
      });
      return Array.from(sibs);
    })();

    const grandparentIds = (() => {
      const gps = new Set<string>();
      parentsOf(member.id).forEach((p) => {
        parentsOf(p).forEach((gp) => gps.add(gp));
      });
      return Array.from(gps);
    })();

    const cousinIds = (() => {
      const cousins = new Set<string>();
      parentsOf(member.id).forEach((p) => {
        // parent siblings
        const pParents = parentsOf(p);
        pParents.forEach((gp) => {
          childrenOf(gp).forEach((uncleAunt) => {
            if (uncleAunt === p) return;
            childrenOf(uncleAunt).forEach((c) => cousins.add(c));
          });
        });
      });
      cousins.delete(member.id);
      siblingIds.forEach((s) => cousins.delete(s));
      return Array.from(cousins);
    })();

    const nieceNephewIds = (() => {
      const nn = new Set<string>();
      siblingIds.forEach((sib) => {
        childrenOf(sib).forEach((c) => nn.add(c));
      });
      return Array.from(nn);
    })();

    return {
      siblings: siblingIds.map((id) => byId.get(id)!).filter(Boolean),
      grandparents: grandparentIds.map((id) => byId.get(id)!).filter(Boolean),
      cousins: cousinIds.map((id) => byId.get(id)!).filter(Boolean),
      nephews: nieceNephewIds.map((id) => byId.get(id)!).filter(Boolean),
      nieces: nieceNephewIds.map((id) => byId.get(id)!).filter(Boolean),
    };
  }, [member, members]);

  if (!member) return <ThemedView style={styles.container}><ThemedText>Loading...</ThemedText></ThemedView>;

  const handleBack = () => router.back();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: member.name,
          headerTitleStyle: { fontWeight: '800' },
          headerLeft: () => (
            <Pressable onPress={handleBack} style={{ marginLeft: 12, padding: 6, borderRadius: 8 }}>
              <Ionicons name="chevron-back" size={22} color={tint} />
            </Pressable>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Pressable onPress={handlePickProfilePhoto} style={[styles.avatarLarge, { backgroundColor: tint + '20', borderColor: tint }]}>
            {member.photo ? (
              <Image source={{ uri: member.photo }} style={styles.avatarImg} />
            ) : (
              <ThemedText style={{ color: tint, fontSize: 40, fontWeight: '800' }}>{member.name.charAt(0)}</ThemedText>
            )}
          </Pressable>
          <ThemedText style={styles.profileName}>{member.name}</ThemedText>
          {member.dob && <ThemedText style={styles.profileDob}>Born: {member.dob}</ThemedText>}
        </View>

        <View style={[styles.section, styles.infoCard, { backgroundColor: inputBg, borderColor: border }]}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
          <ThemedText style={styles.label}>Sex</ThemedText>
          <View style={styles.sexRow}>
            {['Male', 'Female'].map((opt) => (
              <Pressable
                key={opt}
                style={[styles.sexChip, sexInput === opt && { backgroundColor: tint, borderColor: tint }]}
                onPress={() => setSexInput(opt)}
              >
                <ThemedText style={[styles.sexChipText, sexInput === opt && { color: '#fff' }]}>{opt}</ThemedText>
              </Pressable>
            ))}
          </View>
          {Platform.OS === 'web' ? (
            <TextInput
              placeholder="DOB (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={dobInput}
              onChangeText={setDobInput}
              style={[styles.input, { borderColor: border, color: textColor, backgroundColor: '#fff0' }]}
            />
          ) : (
            <Pressable onPress={handleOpenDobPicker}>
              <TextInput
                placeholder="DOB (YYYY-MM-DD)"
                placeholderTextColor="#94a3b8"
                value={dobInput}
                editable={false}
                style={[styles.input, { borderColor: border, color: textColor, backgroundColor: '#fff0', pointerEvents: 'none' }]}
              />
            </Pressable>
          )}
          <ThemedText style={styles.metaText}>Age: {computeAge(dobInput) ?? '—'}</ThemedText>
          <Pressable style={[styles.saveBtn, { backgroundColor: tint }]} onPress={handleSaveProfileInfo}>
            <ThemedText style={{ color: '#fff', fontWeight: '800' }}>Save Profile</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Relationships</ThemedText>
            <Pressable style={[styles.addButton, { backgroundColor: tint }]} onPress={() => setAdding(true)}>
              <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
            </Pressable>
          </View>

          {member.relations && member.relations.length > 0 ? (
            member.relations.map((rel, idx) => {
              const target = members.find(m => m.id === rel.targetId);
              return (
                <View key={idx} style={[styles.relationCard, { backgroundColor: inputBg, borderColor: border }]}>
                  <View style={[styles.avatarSmall, { backgroundColor: tint + '20' }]}>
                    {target?.photo ? <Image source={{ uri: target.photo }} style={styles.avatarImg} /> : <ThemedText style={{ color: tint, fontWeight: '700' }}>{target?.name.charAt(0) || '?'}</ThemedText>}
                  </View>
                  <View style={styles.relationInfo}>
                    <ThemedText style={styles.relationName}>{target?.name || 'Unknown'}</ThemedText>
                    <ThemedText style={styles.relationType}>{rel.type}</ThemedText>
                  </View>
                  <View style={styles.relationActions}>
                    <Pressable onPress={() => handleStartEdit(idx)} style={styles.actionBtn}>
                      <ThemedText style={{ color: tint }}>Edit</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => handleRemoveRelation(idx)} style={styles.actionBtn}>
                      <ThemedText style={{ color: '#ef4444' }}>Remove</ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <ThemedText style={styles.emptyText}>No relationships added yet.</ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Family Insights</ThemedText>
          <View style={[styles.relationSummary, { borderColor: border }]}> 
            <ThemedText style={styles.summaryLabel}>Siblings</ThemedText>
            <ThemedText style={styles.summaryValue}>{derivedRelations.siblings.map((m) => m.name).join(', ') || '—'}</ThemedText>
          </View>
          <View style={[styles.relationSummary, { borderColor: border }]}> 
            <ThemedText style={styles.summaryLabel}>Grandparents</ThemedText>
            <ThemedText style={styles.summaryValue}>{derivedRelations.grandparents.map((m) => m.name).join(', ') || '—'}</ThemedText>
          </View>
          <View style={[styles.relationSummary, { borderColor: border }]}> 
            <ThemedText style={styles.summaryLabel}>Cousins</ThemedText>
            <ThemedText style={styles.summaryValue}>{derivedRelations.cousins.map((m) => m.name).join(', ') || '—'}</ThemedText>
          </View>
          <View style={[styles.relationSummary, { borderColor: border }]}> 
            <ThemedText style={styles.summaryLabel}>Nephew/Niece</ThemedText>
            <ThemedText style={styles.summaryValue}>{derivedRelations.nephews.map((m) => m.name).join(', ') || '—'}</ThemedText>
          </View>
        </View>

        {adding && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: inputBg }]}>
              <ThemedText style={styles.modalTitle}>Add Relationship</ThemedText>
              
              <ThemedText style={styles.label}>Relation Type</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {RELATION_TYPES.map(t => (
                  <Pressable key={t} style={[styles.chip, selectedType === t && { backgroundColor: tint, borderColor: tint }, { borderColor: border }]} onPress={() => setSelectedType(t)}>
                    <ThemedText style={[styles.chipText, selectedType === t && { color: '#fff' }]}>{t}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.toggleContainer}>
                <Pressable style={[styles.toggle, !addNewMember && { backgroundColor: tint }]} onPress={() => setAddNewMember(false)}>
                  <ThemedText style={[styles.toggleText, !addNewMember && { color: '#fff' }]}>Existing</ThemedText>
                </Pressable>
                <Pressable style={[styles.toggle, addNewMember && { backgroundColor: tint }]} onPress={() => setAddNewMember(true)}>
                  <ThemedText style={[styles.toggleText, addNewMember && { color: '#fff' }]}>New</ThemedText>
                </Pressable>
              </View>

              {addNewMember ? (
                <TextInput 
                  placeholder="Name" 
                  placeholderTextColor="#94a3b8" 
                  style={[styles.input, { borderColor: border, color: textColor }]} 
                  value={newMemberName} 
                  onChangeText={setNewMemberName} 
                />
              ) : (
                <ScrollView style={styles.memberList}>
                  {members.filter(m => m.id !== member.id).map(m => (
                    <Pressable key={m.id} style={styles.memberRow} onPress={() => handleAddRelationTo(m.id)}>
                      <ThemedText>{m.name}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalButtons}>
                {addNewMember && <Pressable style={[styles.modalBtn, { backgroundColor: tint }]} onPress={handleAddNewMember}><ThemedText style={{ color: '#fff' }}>Save</ThemedText></Pressable>}
                <Pressable style={styles.modalBtn} onPress={() => setAdding(false)}><ThemedText>Cancel</ThemedText></Pressable>
              </View>
            </View>
          </View>
        )}

        {showDobPicker && (
          <Modal transparent animationType="fade" visible={showDobPicker} onRequestClose={() => setShowDobPicker(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <View style={[styles.modalContent, { backgroundColor: inputBg }]}> 
                <ThemedText style={styles.modalTitle}>Select DOB</ThemedText>
                <DateTimePicker
                  value={tempDob || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDobPickerChange}
                  maximumDate={new Date()}
                />
                <View style={[styles.modalButtons, { marginTop: 16 }]}> 
                  <Pressable style={styles.modalBtn} onPress={() => setShowDobPicker(false)}>
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable style={[styles.modalBtn, { backgroundColor: tint }]} onPress={handleConfirmDob}>
                    <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Confirm</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {editingIndex !== null && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: inputBg }]}>
              <ThemedText style={styles.modalTitle}>Edit Relationship</ThemedText>
              <ThemedText style={styles.label}>Relation Type</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {RELATION_TYPES.map(t => (
                  <Pressable key={t} style={[styles.chip, editingType === t && { backgroundColor: tint, borderColor: tint }, { borderColor: border }]} onPress={() => setEditingType(t)}>
                    <ThemedText style={[styles.chipText, editingType === t && { color: '#fff' }]}>{t}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.modalButtons}>
                <Pressable style={[styles.modalBtn, { backgroundColor: tint }]} onPress={handleSaveEdit}><ThemedText style={{ color: '#fff' }}>Save</ThemedText></Pressable>
                <Pressable style={styles.modalBtn} onPress={() => setEditingIndex(null)}><ThemedText>Cancel</ThemedText></Pressable>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarLarge: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  avatarImg: { width: '100%', height: '100%' },
  profileName: { fontSize: 24, fontWeight: '800' },
  profileDob: { fontSize: 14, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 24 },
  infoCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  addButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  relationCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  avatarSmall: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 12 },
  relationInfo: { flex: 1 },
  relationName: { fontSize: 16, fontWeight: '600' },
  relationType: { fontSize: 12, color: '#64748b', textTransform: 'capitalize' },
  relationActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 20 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', padding: 20, zIndex: 100 },
  modalContent: { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  chipScroll: { flexDirection: 'row', marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  sexRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sexChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sexChipText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 },
  toggle: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  metaText: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  saveBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  memberList: { maxHeight: 200, marginBottom: 16 },
  memberRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  relationSummary: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  summaryLabel: { fontSize: 14, fontWeight: '700' },
  summaryValue: { fontSize: 14, color: '#475569', marginTop: 4 },
});