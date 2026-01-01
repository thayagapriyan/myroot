import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TreeNode } from '@/components/tree/tree-node';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FamilyService } from '@/services/family-service';
import { Member } from '@/types/family';
import { calculateTreeLayout } from '@/utils/tree-layout';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
    type: 'child' | 'spouse' | 'sibling' | 'parent' | null;
  }>({ open: false, sourceId: null, type: null });
  const [useNewTarget, setUseNewTarget] = useState(true);
  const [newTargetName, setNewTargetName] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

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

  const normalizeImportedFamily = useCallback((data: unknown): Member[] | null => {
    const rawList: any[] = Array.isArray(data)
      ? data
      : (data && typeof data === 'object' && Array.isArray((data as any).members))
        ? (data as any).members
        : [];

    if (!Array.isArray(rawList)) return null;

    const seen = new Set<string>();
    const sanitized: Member[] = [];

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const id = (item as any).id;
      const name = (item as any).name;
      if (typeof id !== 'string' || !id.trim()) continue;
      if (typeof name !== 'string' || !name.trim()) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      const dob = typeof (item as any).dob === 'string' ? (item as any).dob : undefined;
      const email = typeof (item as any).email === 'string' ? (item as any).email : undefined;
      const photo = typeof (item as any).photo === 'string' ? (item as any).photo : undefined;

      const relationsRaw = (item as any).relations;
      const relations = Array.isArray(relationsRaw)
        ? relationsRaw
            .filter((r: any) => r && typeof r === 'object')
            .map((r: any) => ({
              type: typeof r.type === 'string' ? r.type : 'other',
              targetId: typeof r.targetId === 'string' ? r.targetId : '',
            }))
            .filter((r: any) => r.targetId && r.targetId !== id)
        : [];

      sanitized.push({ id, name: name.trim(), dob, email, photo, relations });
    }

    if (sanitized.length === 0) return [];

    // Drop relations that reference missing members.
    const idSet = new Set(sanitized.map((m) => m.id));
    return sanitized.map((m) => ({
      ...m,
      relations: (m.relations || []).filter((r) => idSet.has(r.targetId)),
    }));
  }, []);

  const openExportModal = useCallback(() => {
    setExportText(JSON.stringify(members, null, 2));
    setExportOpen(true);
  }, [members]);

  const exportToFile = useCallback(async () => {
    const json = JSON.stringify(members, null, 2);

    try {
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        openExportModal();
        return;
      }

      const safeStamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileUri = `${baseDir}family-tree-${safeStamp}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Family Tree',
        });
      } else {
        openExportModal();
        Alert.alert('Sharing not available', 'Sharing is not available on this device. Copy the JSON from the export modal instead.');
      }
    } catch {
      openExportModal();
      Alert.alert('Export failed', 'Could not export the JSON file. Copy the JSON from the export modal instead.');
    }
  }, [members, openExportModal]);

  const handleExportPress = useCallback(() => {
    if (Platform.OS === 'web') {
      openExportModal();
      return;
    }

    Alert.alert('Export', 'Choose export method', [
      { text: 'File', onPress: () => void exportToFile() },
      { text: 'Copy/Paste', onPress: openExportModal },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [exportToFile, openExportModal]);

  const closeExport = useCallback(() => {
    setExportOpen(false);
  }, []);

  const importFromJsonText = useCallback(
    async (text: string) => {
      const userKey = await AsyncStorage.getItem('currentUser');
      if (!userKey) return router.replace('/login');

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        Alert.alert('Invalid JSON', 'Please provide a valid JSON export.');
        return;
      }

      const next = normalizeImportedFamily(parsed);
      if (next === null) {
        Alert.alert('Invalid format', 'Expected a JSON array of members (or an object with a "members" array).');
        return;
      }

      const ensured = await ensureDefaultMember(userKey, next);
      await FamilyService.saveFamily(userKey, ensured);
      setMembers(ensured);
      setIsEditing(false);
      setActiveMemberId(null);
      Alert.alert('Imported', 'Family tree imported successfully.');
    },
    [ensureDefaultMember, normalizeImportedFamily, router]
  );

  const openImportModal = useCallback(() => {
    setImportText('');
    setImportOpen(true);
  }, []);

  const importFromFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) {
      Alert.alert('Import failed', 'No file was selected.');
      return;
    }

    const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    await importFromJsonText(text);
  }, [importFromJsonText]);

  const handleImportPress = useCallback(() => {
    if (Platform.OS === 'web') {
      openImportModal();
      return;
    }

    Alert.alert('Import', 'Choose import method', [
      {
        text: 'File',
        onPress: () => {
          void (async () => {
            try {
              await importFromFile();
            } catch {
              openImportModal();
              Alert.alert('Import failed', 'Could not read the selected file. You can paste JSON in the import modal instead.');
            }
          })();
        },
      },
      { text: 'Copy/Paste', onPress: openImportModal },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [importFromFile, openImportModal]);

  const closeImport = useCallback(() => {
    setImportOpen(false);
  }, []);

  const handleImport = useCallback(async () => {
    await importFromJsonText(importText);
    closeImport();
  }, [closeImport, importFromJsonText, importText]);

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

  const { centeredPositions, contentWidth, contentHeight } = useMemo(() => {
    const nodeW = 140;
    const nodeH = 100;
    const pad = 260;
    const pts = Object.values(positions);
    if (!pts.length) {
      return { centeredPositions: positions, contentWidth: SCREEN_W, contentHeight: 800 };
    }
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const layoutWidth = maxX - minX + nodeW;
    const layoutHeight = maxY - minY + nodeH;
    const width = Math.max(SCREEN_W, layoutWidth + pad);
    const height = Math.max(800, layoutHeight + pad);
    const offsetX = (width - layoutWidth) / 2 - minX;
    const offsetY = Math.max(0, (height - layoutHeight) / 4 - minY); // gentle vertical centering
    const shifted: typeof positions = {};
    Object.entries(positions).forEach(([id, p]) => {
      shifted[id] = { x: p.x + offsetX, y: p.y + offsetY };
    });
    return { centeredPositions: shifted, contentWidth: width, contentHeight: height };
  }, [positions]);

  const edgeColors = useMemo(() => {
    const palette = ['#FF2D55', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#0A84FF', '#5856D6', '#AF52DE'];
    const map = new Map<string, string>();
    edges.forEach((e) => {
      const key = e.isJoint && e.parent2 ? [e.from, e.parent2].sort().join('|') : e.from;
      if (!map.has(key)) {
        const color = palette[map.size % palette.length];
        map.set(key, color);
      }
    });
    return map;
  }, [edges]);

  const openRelationModal = useCallback((sourceId: string, type: 'child' | 'spouse' | 'sibling' | 'parent') => {
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

  const handleDeleteMember = useCallback(
    async (id: string) => {
      if (members.length <= 1) {
        Alert.alert('Keep one member', 'You need at least one member in your tree.');
        return;
      }

      const performDelete = async () => {
        const userKey = await AsyncStorage.getItem('currentUser');
        if (!userKey) return router.replace('/login');

        const next = members
          .filter((m) => m.id !== id)
          .map((m) => ({
            ...m,
            relations: (m.relations || []).filter((r) => r.targetId !== id),
          }));

        await FamilyService.saveFamily(userKey, next);
        setMembers(next);
        setActiveMemberId((prev) => (prev === id ? null : prev));
      };

      if (Platform.OS === 'web') {
        if (confirm('Remove this member?')) {
          await performDelete();
        }
        return;
      }

      Alert.alert('Remove member', 'Are you sure you want to delete this member?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
      ]);
    },
    [members, router]
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: bgColor }}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Family Tree',
          headerLeft: () => null,
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/profile')}
              style={[styles.iconBtn, { backgroundColor: tint, borderColor: tint, marginRight: 12 }]}
              accessibilityLabel="Profile"
            >
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
            </Pressable>
          ),
        }} 
      />

      <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ width: contentWidth }}>
        <ScrollView contentContainerStyle={{ height: contentHeight, paddingBottom: 96 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.inlineControls}>
              <View style={styles.inlineLeft}>
                <Pressable
                  disabled={members.length <= 1}
                  onPress={() => setIsEditing((v) => !v)}
                  style={[styles.topBtnPrimary, members.length <= 1 && { opacity: 0.45 }]}
                >
                  <ThemedText style={styles.topBtnPrimaryText}>{isEditing ? 'Done' : 'Edit'}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleReset}
                  style={styles.topBtnDanger}
                >
                  <ThemedText style={styles.topBtnDangerText}>Reset</ThemedText>
                </Pressable>
              </View>
              <View style={styles.inlineRight}>
                <Pressable
                  onPress={handleExportPress}
                  style={styles.topBtnSecondary}
                >
                  <ThemedText style={styles.topBtnSecondaryText}>Export</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleImportPress}
                  style={styles.topBtnSecondary}
                >
                  <ThemedText style={styles.topBtnSecondaryText}>Import</ThemedText>
                </Pressable>
              </View>
            </View>
            <Svg style={StyleSheet.absoluteFill} width={contentWidth} height={contentHeight}>
              {/* Define arrow marker */}
              <Marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <Path d="M 0 0 L 10 5 L 0 10 z" fill={tint} />
              </Marker>

              {/* Spouse Edges */}
              {spouseEdges.map((e, i) => {
                const a = centeredPositions[e.from];
                const b = centeredPositions[e.to];
                if (!a || !b) return null;
                return (
                  <Line
                    key={`spouse-${i}`}
                    x1={a.x + 70} y1={a.y + 40}
                    x2={b.x + 70} y2={b.y + 40}
                    stroke="#FF2D55"
                    strokeWidth={2}
                    strokeDasharray="5, 5"
                  />
                );
              })}

              {edges.map((e, i) => {
                const a = centeredPositions[e.from];
                const b = centeredPositions[e.to];
                if (!a || !b) return null;

                let startX = a.x + 70;
                let startY = a.y + 80;

                if (e.isJoint && e.parent2) {
                    const p2 = centeredPositions[e.parent2];
                    if (p2) {
                        startX = (a.x + p2.x) / 2 + 70;
                        startY = a.y + 40; // Start from middle of spouse line
                    }
                }

                const endX = b.x + 70;
                const endY = b.y;
                const midY = (startY + endY) / 2;
                
                const key = e.isJoint && e.parent2 ? [e.from, e.parent2].sort().join('|') : e.from;
                const stroke = edgeColors.get(key) || tint;
                return (
                  <Path
                    key={`edge-${i}`}
                    d={`M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`}
                    stroke={stroke}
                    strokeOpacity={0.6}
                    strokeWidth={2}
                    fill="none"
                  />
                );
              })}
            </Svg>

            {Object.entries(centeredPositions).map(([id, pos]) => {
              const m = members.find((mm) => mm.id === id);
              if (!m) return null;
              
              const colors = ['#FF2D55', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#0A84FF', '#5856D6', '#AF52DE'];
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
                  onRemove={handleDeleteMember}
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

      {exportOpen && (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeExport} />
          <View style={[styles.modalCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>Export JSON</ThemedText>
            <ThemedText style={{ color: textColor, opacity: 0.8, marginBottom: 10 }}>
              Copy this JSON and keep it safe.
            </ThemedText>
            <ScrollView style={{ maxHeight: 280, marginBottom: 12 }}>
              <TextInput
                value={exportText}
                editable={false}
                multiline
                style={[styles.jsonBox, { backgroundColor: bgColor, borderColor: borderColor, color: textColor }]}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Pressable onPress={closeExport} style={[styles.modalBtn, { borderColor: borderColor }]}>
                <ThemedText style={{ color: textColor, fontWeight: '700' }}>Close</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {importOpen && (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeImport} />
          <View style={[styles.modalCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>Import JSON</ThemedText>
            <ThemedText style={{ color: textColor, opacity: 0.8, marginBottom: 10 }}>
              Paste a previously exported JSON here.
            </ThemedText>
            <ScrollView style={{ maxHeight: 280, marginBottom: 12 }}>
              <TextInput
                value={importText}
                onChangeText={setImportText}
                multiline
                placeholder="Paste JSON..."
                placeholderTextColor="#94a3b8"
                style={[styles.jsonBox, { backgroundColor: bgColor, borderColor: borderColor, color: textColor }]}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Pressable onPress={closeImport} style={[styles.modalBtn, { borderColor: borderColor }]}>
                <ThemedText style={{ color: textColor, fontWeight: '700' }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleImport}
                style={[styles.modalBtn, { backgroundColor: tint, borderColor: tint }]}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Import</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerPillText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineControls: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  inlineLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineRight: { flexDirection: 'row', gap: 8, alignItems: 'center', marginLeft: 'auto' },
  topBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  topBtnPrimaryText: {
    color: '#0A84FF',
    fontWeight: '800',
    fontSize: 12,
  },
  topBtnDanger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  topBtnDangerText: {
    color: '#FF3B30',
    fontWeight: '800',
    fontSize: 12,
  },
  topBtnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  topBtnSecondaryText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
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
  jsonBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 200,
    textAlignVertical: 'top',
  },
});
