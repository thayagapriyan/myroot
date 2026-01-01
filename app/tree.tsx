import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TreeNode } from '@/components/tree/tree-node';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FamilyService } from '@/services/family-service';
import { Member } from '@/types/family';
import { calculateTreeLayout } from '@/utils/tree-layout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Line, Marker, Path } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

export default function TreeScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const bgColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const [relationModal, setRelationModal] = useState<{
    open: boolean;
    sourceId: string | null;
    type: 'child' | 'spouse' | 'sibling' | null;
  }>({ open: false, sourceId: null, type: null });
  const [useNewTarget, setUseNewTarget] = useState(true);
  const [newTargetName, setNewTargetName] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  const ensureDefaultMember = useCallback(async (userKey: string, list: Member[]) => {
    if (list.length > 0) return list;

    let name = 'Me';
    let dob: string | undefined;
    let email: string | undefined;
    let photo: string | undefined;

    try {
      const userRaw = await AsyncStorage.getItem(userKey);
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (user?.name) name = user.name;
      if (user?.dob) dob = user.dob;
      if (user?.email) email = user.email;
      if (user?.photo) photo = user.photo;
    } catch {
      // ignore and fallback to defaults
    }

    const me: Member = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name,
      email,
      dob,
      photo,
      relations: [],
    };

    const next = [me];
    await FamilyService.saveFamily(userKey, next);
    return next;
  }, []);

  const loadMembers = useCallback(async () => {
    const userKey = await AsyncStorage.getItem('currentUser');
    if (!userKey) return router.replace('/login');
    const list = await FamilyService.getFamily(userKey);
    const ensured = await ensureDefaultMember(userKey, list);
    setMembers(ensured);
    setActiveMemberId(null);
    if (ensured.length <= 1) setIsEditing(false);
  }, [ensureDefaultMember, router]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const activeMemberIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeMemberIdRef.current = activeMemberId;
  }, [activeMemberId]);

  const handleReset = async () => {
    const performReset = async () => {
      const key = await AsyncStorage.getItem('currentUser');
      if (!key) return;
      await FamilyService.resetFamily(key);
      setIsEditing(false);
      setActiveMemberId(null);
      const ensured = await ensureDefaultMember(key, []);
      setMembers(ensured);
      Alert.alert('Success', 'All family data has been cleared.');
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to clear all family data?')) {
        performReset();
      }
      return;
    }

    Alert.alert('Reset Data', 'Clear all family data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: performReset }
    ]);
  };

  const { layers, positions, edges, spouseEdges } = useMemo(() => {
    return calculateTreeLayout(members, SCREEN_W);
  }, [members]);

  const contentWidth = Math.max(SCREEN_W, (Object.keys(positions).length ? Object.keys(positions).length * 100 : SCREEN_W) + 200);
  const contentHeight = Math.max(800, layers.length * 160 + 200);

  const openRelationModal = useCallback((sourceId: string, type: 'child' | 'spouse' | 'sibling') => {
    setRelationModal({ open: true, sourceId, type });
    setUseNewTarget(true);
    setNewTargetName('');
    setTargetId(null);
  }, []);

  const handleSelectMember = useCallback((id: string) => {
    if (activeMemberIdRef.current === id) {
      router.push(`/member?id=${id}`);
      return;
    }
    setActiveMemberId(id);
  }, [router]);

  const closeRelationModal = useCallback(() => {
    setRelationModal({ open: false, sourceId: null, type: null });
    setUseNewTarget(true);
    setNewTargetName('');
    setTargetId(null);
  }, []);

  const reciprocal = (type: string) => {
    switch (type) {
      case 'parent': return 'child';
      case 'child': return 'parent';
      case 'spouse':
      case 'partner':
      case 'sibling': return type;
      default: return 'other';
    }
  };

  const saveQuickRelation = useCallback(async () => {
    if (!relationModal.open || !relationModal.sourceId || !relationModal.type) return;

    const userKey = await AsyncStorage.getItem('currentUser');
    if (!userKey) return router.replace('/login');

    const sourceId = relationModal.sourceId;
    const type = relationModal.type;
    const list: Member[] = [...members];

    const addRelationPair = (id1: string, id2: string, type1to2: string) => {
      const m1 = list.find(m => m.id === id1);
      const m2 = list.find(m => m.id === id2);
      if (!m1 || !m2) return;
      m1.relations = m1.relations || [];
      m2.relations = m2.relations || [];
      if (!m1.relations.find((r) => r.targetId === id2 && r.type === type1to2)) {
        m1.relations.push({ type: type1to2, targetId: id2 });
      }
      const type2to1 = reciprocal(type1to2);
      if (!m2.relations.find((r) => r.targetId === id1 && r.type === type2to1)) {
        m2.relations.push({ type: type2to1, targetId: id1 });
      }
    };

    let finalTargetId: string | null = targetId;
    if (useNewTarget) {
      if (!newTargetName.trim()) {
        Alert.alert('Name required', 'Enter a name to create the new member.');
        return;
      }
      finalTargetId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      list.push({ id: finalTargetId, name: newTargetName.trim(), relations: [] });
    }

    if (!finalTargetId) {
      Alert.alert('Select member', 'Pick an existing member or create a new one.');
      return;
    }
    if (finalTargetId === sourceId) {
      Alert.alert('Invalid', 'Cannot relate to self.');
      return;
    }

    addRelationPair(sourceId, finalTargetId, type);

    // Keep behavior consistent with Add Relation screen for joint parenting + spouse child-linking.
    if (type === 'child') {
      const sourceMember = list.find(m => m.id === sourceId);
      const spouseRel = sourceMember?.relations?.find((r) => r.type === 'spouse' || r.type === 'partner');
      if (spouseRel) addRelationPair(spouseRel.targetId, finalTargetId, 'child');
    } else if (type === 'spouse') {
      const sourceMember = list.find(m => m.id === sourceId);
      const childrenRels = sourceMember?.relations?.filter((r) => r.type === 'child') || [];
      childrenRels.forEach((c) => addRelationPair(finalTargetId!, c.targetId, 'child'));
    }

    await FamilyService.saveFamily(userKey, list);
    setMembers(list);
    closeRelationModal();
  }, [closeRelationModal, members, newTargetName, relationModal, router, targetId, useNewTarget]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: bgColor }}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Family Tree',
          headerLeft: () => null,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 15 }}>
              {members.length > 1 ? (
                <Pressable onPress={() => setIsEditing(!isEditing)}>
                  <ThemedText style={{ color: isEditing ? tint : textColor, fontWeight: '700' }}>
                    {isEditing ? 'Done' : 'Edit'}
                  </ThemedText>
                </Pressable>
              ) : null}
              <Pressable onPress={handleReset}>
                <ThemedText style={{ color: '#FF3B30', fontWeight: '700' }}>Reset</ThemedText>
              </Pressable>
            </View>
          ),
        }} 
      />

      <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ width: contentWidth }}>
        <ScrollView contentContainerStyle={{ height: contentHeight }}>
          <View style={{ flex: 1 }}>
            {layers.map((_, i) => (
              <ThemedText 
                key={`gen-${i}`} 
                style={{ 
                  position: 'absolute', 
                  left: 10, 
                  top: i * 180 + 100 + 40, 
                  fontWeight: 'bold', 
                  color: '#94a3b8',
                  opacity: 0.5,
                  zIndex: 0
                }}
              >
                Gen {i + 1}
              </ThemedText>
            ))}
            <Svg style={StyleSheet.absoluteFill} width={contentWidth} height={contentHeight}>
              {/* Define arrow marker */}
              <Marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <Path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </Marker>

              {/* Spouse Edges */}
              {spouseEdges.map((e, i) => {
                const a = positions[e.from];
                const b = positions[e.to];
                if (!a || !b) return null;
                return (
                  <Line
                    key={`spouse-${i}`}
                    x1={a.x + 70} y1={a.y + 40}
                    x2={b.x + 70} y2={b.y + 40}
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="5, 5"
                  />
                );
              })}

              {edges.map((e, i) => {
                const a = positions[e.from];
                const b = positions[e.to];
                if (!a || !b) return null;

                let startX = a.x + 70;
                let startY = a.y + 80;

                if (e.isJoint && e.parent2) {
                    const p2 = positions[e.parent2];
                    if (p2) {
                        startX = (a.x + p2.x) / 2 + 70;
                        startY = a.y + 40; // Start from middle of spouse line
                    }
                }

                const endX = b.x + 70;
                const endY = b.y;
                const midY = (startY + endY) / 2;
                
                return (
                  <Path
                    key={`edge-${i}`}
                    d={`M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    fill="none"
                  />
                );
              })}
            </Svg>

            {Object.entries(positions).map(([id, pos]) => {
              const m = members.find((mm) => mm.id === id);
              if (!m) return null;
              
              const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
              const hash = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
              const color = colors[hash % colors.length];
              
              return (
                <TreeNode 
                  key={id}
                  member={m}
                  position={pos}
                  color={color}
                  isEditing={isEditing}
                  showActions={isEditing || activeMemberId === id}
                  onPress={(id) => handleSelectMember(id)}
                  onAddRelation={(id, type) => openRelationModal(id, type as any)}
                />
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {relationModal.open && (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeRelationModal} />
          <View style={[styles.modalCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>
              Add {relationModal.type}
            </ThemedText>

            <View style={[styles.toggleContainer, { borderColor: borderColor }]}
            >
              <Pressable
                style={[styles.toggle, !useNewTarget && { backgroundColor: tint }]}
                onPress={() => setUseNewTarget(false)}
              >
                <ThemedText style={[styles.toggleText, !useNewTarget && { color: '#fff' }]}>
                  Existing
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.toggle, useNewTarget && { backgroundColor: tint }]}
                onPress={() => setUseNewTarget(true)}
              >
                <ThemedText style={[styles.toggleText, useNewTarget && { color: '#fff' }]}>
                  New
                </ThemedText>
              </Pressable>
            </View>

            {useNewTarget ? (
              <TextInput
                placeholder="Name"
                placeholderTextColor="#94a3b8"
                value={newTargetName}
                onChangeText={setNewTargetName}
                style={[styles.input, { backgroundColor: bgColor, borderColor: borderColor, color: textColor }]}
              />
            ) : (
              <ScrollView style={styles.memberList}>
                {members
                  .filter((m) => m.id !== relationModal.sourceId)
                  .map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => setTargetId(m.id)}
                      style={[
                        styles.memberRow,
                        { borderColor: borderColor },
                        targetId === m.id && { backgroundColor: tint + '10', borderColor: tint },
                      ]}
                    >
                      <ThemedText style={{ color: textColor, fontWeight: '600' }}>{m.name}</ThemedText>
                      {targetId === m.id && (
                        <ThemedText style={{ color: tint, fontWeight: '800' }}>✓</ThemedText>
                      )}
                    </Pressable>
                  ))}
              </ScrollView>
            )}

            <View style={styles.modalButtons}>
              <Pressable onPress={closeRelationModal} style={[styles.modalBtn, { borderColor: borderColor }]}>
                <ThemedText style={{ color: textColor, fontWeight: '700' }}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={saveQuickRelation} style={[styles.modalBtn, { backgroundColor: tint, borderColor: tint }]}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  memberList: {
    maxHeight: 220,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
