import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, Pressable, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Line } from 'react-native-svg';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

type Member = {
  id: string;
  name: string;
  dob?: string;
  photo?: string;
  relations?: { type: string; targetId: string }[];
};

const { width: SCREEN_W } = Dimensions.get('window');

export default function TreeScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    (async () => {
      const userKey = await AsyncStorage.getItem('currentUser');
      if (!userKey) return router.replace('/login');
      const familyKey = `${userKey}:family`;
      const raw = await AsyncStorage.getItem(familyKey);
      setMembers(raw ? JSON.parse(raw) : []);
    })();
  }, []);

  // build adjacency (parents -> children) using relation.type === 'parent' or 'child'
  const { positions, edges } = useMemo(() => {
    // Simple force-directed layout (iterative simulation)
    const nodes = members.map((m) => ({ id: m.id, x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 0 }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const links: Array<{ source: string; target: string }> = [];
    members.forEach((m) => {
      const rels = m.relations || [];
      rels.forEach((r) => {
        if (r.type === 'child') {
          links.push({ source: m.id, target: r.targetId });
        }
      });
    });

    // simulation parameters
    const width = Math.max(800, SCREEN_W * 1.5);
    const height = 1200;
    const iterations = 300;
    const repulsion = 40000; // Coulomb constant
    const springLength = 160;
    const springStrength = 0.06;
    const damping = 0.85;

    for (let iter = 0; iter < iterations; iter++) {
      // repulsive forces
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(dist2);
          const force = repulsion / dist2;
          const fx = (force * dx) / dist;
          const fy = (force * dy) / dist;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // spring (link) forces
      links.forEach((l) => {
        const s = nodeById.get(l.source);
        const t = nodeById.get(l.target);
        if (!s || !t) return;
        let dx = t.x - s.x;
        let dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const diff = dist - springLength;
        const k = springStrength;
        const fx = (k * diff * dx) / dist;
        const fy = (k * diff * dy) / dist;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      });

      // integrate velocities and apply damping, keep within box
      nodes.forEach((n) => {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        // center force
        const cx = width / 2;
        const cy = height / 2;
        n.x += (cx - n.x) * 0.002;
        n.y += (cy - n.y) * 0.002;
        // bounds
        n.x = Math.max(20, Math.min(width - 160, n.x));
        n.y = Math.max(20, Math.min(height - 60, n.y));
      });
    }

    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => (positions[n.id] = { x: Math.round(n.x), y: Math.round(n.y) }));

    const edges = links.map((l) => ({ from: l.source, to: l.target }));
    return { positions, edges };
  }, [members]);

  const contentWidth = Math.max(800, (Object.keys(positions).length ? Object.keys(positions).length * 180 : 800));
  const contentHeight = 1200;

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Family Tree' }} />
      <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ width: contentWidth }}>
        <ScrollView contentContainerStyle={{ height: contentHeight }}>
          <View style={{ flex: 1 }}>
            <Svg style={StyleSheet.absoluteFill} width={contentWidth} height={contentHeight}>
              {edges.map((e, i) => {
                const a = positions[e.from];
                const b = positions[e.to];
                if (!a || !b) return null;
                return <Line key={`edge-${i}`} x1={a.x + 70} y1={a.y + 30} x2={b.x + 20} y2={b.y + 10} stroke="#999" strokeWidth={2} />;
              })}
            </Svg>

            {Object.entries(positions).map(([id, pos]) => {
              const m = members.find((mm) => mm.id === id);
              return (
                <Pressable key={id} style={[styles.node, { left: pos.x, top: pos.y }]} onPress={() => router.push(`/member?id=${id}`)}>
                  {m?.photo ? <Image source={{ uri: m.photo }} style={styles.nodePhoto} /> : <View style={styles.nodePhotoPlaceholder} />}
                  <ThemedText style={styles.nodeText}>{m?.name}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: 140,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nodePhoto: { width: 44, height: 44, borderRadius: 22, marginRight: 8 },
  nodePhotoPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd', marginRight: 8 },
  nodeText: { fontWeight: '600' },
});
