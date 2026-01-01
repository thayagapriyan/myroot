import { ThemedText } from '@/components/themed-text';
import { Member } from '@/types/family';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

interface TreeNodeProps {
  member: Member;
  position: { x: number; y: number };
  color: string;
  isEditing?: boolean;
  showActions?: boolean;
  onPress: (id: string) => void;
  onAddRelation: (id: string, type: string) => void;
  onRemove: (id: string) => void;
}

export function TreeNode({ member, position, color, isEditing = false, showActions = false, onPress, onAddRelation, onRemove }: TreeNodeProps) {
  return (
    <View style={[styles.node, { left: position.x, top: position.y }]}>
      <Pressable 
        style={styles.nodeCard} 
        onPress={() => onPress(member.id)}
      >
        <View style={[styles.avatarContainer, { borderColor: color }]}>
          {member.photo ? (
            <Image source={{ uri: member.photo }} style={styles.nodePhoto} />
          ) : (
            <View style={[styles.nodePhotoPlaceholder, { backgroundColor: color + '20' }]}>
              <ThemedText style={{ color: color, fontWeight: '700' }}>{member.name.charAt(0)}</ThemedText>
            </View>
          )}

          {isEditing && (
            <Pressable
              hitSlop={styles.hitSlop}
              style={[styles.removeFabAvatar, { backgroundColor: '#ef4444', borderColor: '#fff' }]}
              onPress={() => onRemove(member.id)}
            >
              <ThemedText style={styles.removeFabText}>-</ThemedText>
            </Pressable>
          )}
        </View>
        <View style={[styles.namePill, { backgroundColor: color }]}> 
          <ThemedText style={styles.pillText} numberOfLines={1}>{member.name}</ThemedText>
        </View>
      </Pressable>

      {showActions && !isEditing && (
        <>
          {/* Add Parent (Top) */}
          <Pressable 
            hitSlop={styles.hitSlop}
            style={[styles.miniFab, { top: -12, alignSelf: 'center', backgroundColor: isEditing ? color : '#64748b', borderColor: '#fff' }]}
            onPress={() => onAddRelation(member.id, 'parent')}
          >
            <ThemedText style={styles.miniFabText}>+</ThemedText>
          </Pressable>

          {/* Add Child (Bottom) */}
          <Pressable 
            hitSlop={styles.hitSlop}
            style={[styles.miniFab, { bottom: 18, alignSelf: 'center', backgroundColor: color, borderColor: '#fff' }]}
            onPress={() => onAddRelation(member.id, 'child')}
          >
            <ThemedText style={styles.miniFabText}>+</ThemedText>
          </Pressable>

          {/* Add Spouse (Right) - centered vertically on avatar and touching right edge */}
          <Pressable 
            hitSlop={styles.hitSlop}
            style={[
              styles.miniFab,
              styles.sideFab,
              {
                right: 15,
                top: 17,
                backgroundColor: isEditing ? color : '#64748b',
              },
            ]}
            onPress={() => onAddRelation(member.id, 'spouse')}
          >
            <ThemedText style={styles.miniFabText}>+</ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: 140,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniFab: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  sideFab: {
    borderWidth: 1,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  removeFab: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    top: -10,
    left: -10,
    zIndex: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 2,
  },
  removeFabAvatar: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    top: -8,
    right: -8,
    zIndex: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeFabText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: -2,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
  miniFabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  avatarContainer: {
    width: 80,
    height: 64,
    borderRadius: 8,
    borderWidth: 3,
    padding: 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nodePhoto: { width: '100%', height: '100%', borderRadius: 6 },
  nodePhotoPlaceholder: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 6, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  namePill: { 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 20, 
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    maxWidth: 140,
  },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
