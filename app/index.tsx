import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FamilyService } from '@/services/familyService';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import JSZip from 'jszip';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const tint = useThemeColor({}, 'tint');

  useEffect(() => {
    (async () => {
      try {
        const family = await FamilyService.getFamily();
        if (family && family.length > 0) {
          router.replace('/tree');
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleCreateNew = async () => {
    router.push('/tree');
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain', 'application/zip'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset || !asset.uri) return Alert.alert('Import failed', 'No file was selected.');

      const name = (asset.name || '').toLowerCase();
      if (name.endsWith('.zip') || (asset.mimeType && asset.mimeType.includes('zip'))) {
        // Handle ZIP import (tree.json + optional photos)
        try {
          let zip;
          if (Platform.OS === 'web') {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            zip = await JSZip.loadAsync(blob);
          } else {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
            zip = await JSZip.loadAsync(base64, { base64: true });
          }

          // Prefer tree.json, fallback to first JSON file
          let treeFile = zip.file('tree.json');
          if (!treeFile) {
            const jsonFiles = Object.keys(zip.files).filter((f) => f.toLowerCase().endsWith('.json'));
            if (jsonFiles.length === 0) {
              Alert.alert('Invalid ZIP', 'No JSON file found in the ZIP.');
              return;
            }
            treeFile = zip.file(jsonFiles[0]);
          }

          const treeJson = await (treeFile as any).async('string');
          const parsed = JSON.parse(treeJson);
          const membersArr = Array.isArray(parsed) ? parsed : parsed && parsed.members ? parsed.members : null;
          if (!membersArr) {
            Alert.alert('Invalid ZIP', 'JSON file does not contain members array.');
            return;
          }

          const updatedMembers: any[] = [...membersArr];

          if (Platform.OS !== 'web') {
            const photosDir = `${FileSystem.documentDirectory}photos/`;
            await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true }).catch(() => {});
            for (let i = 0; i < updatedMembers.length; i++) {
              const m = updatedMembers[i];
              const photoFile = zip.file(`photos/${m.id}/profile.jpg`);
              if (photoFile) {
                const photoBase64 = await photoFile.async('base64');
                const localPhotoUri = `${photosDir}${m.id}_profile.jpg`;
                await FileSystem.writeAsStringAsync(localPhotoUri, photoBase64, { encoding: FileSystem.EncodingType.Base64 });
                updatedMembers[i] = { ...m, photo: localPhotoUri };
              }
            }
          } else {
            for (let i = 0; i < updatedMembers.length; i++) {
              const m = updatedMembers[i];
              const photoFile = zip.file(`photos/${m.id}/profile.jpg`);
              if (photoFile) {
                const photoBase64 = await photoFile.async('base64');
                updatedMembers[i] = { ...m, photo: `data:image/jpeg;base64,${photoBase64}` };
              }
            }
          }

          await FamilyService.saveFamily(updatedMembers);
          router.replace('/tree');
          return;
        } catch (err) {
          console.error('ZIP import error', err);
          Alert.alert('Import failed', 'Could not process the ZIP file.');
          return;
        }
      }

      // Fallback: treat as JSON text
      const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(content);

      // Basic validation
      if (Array.isArray(data) || (data && data.members)) {
        await FamilyService.saveFamily(Array.isArray(data) ? data : data.members);
        router.replace('/tree');
      } else {
        Alert.alert('Error', 'Invalid family subtree file');
      }
    } catch (err) {
      console.error('Import failed', err);
      Alert.alert('Error', 'Failed to import file');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="people-outline" size={80} color={tint} />
        </View>
        <ThemedText style={styles.title}>Welcome to Family Tree</ThemedText>
        <ThemedText style={styles.subtitle}>
          Start building your family legacy or import an existing tree to get started.
        </ThemedText>

        <View style={styles.buttonContainer}>
          <Pressable style={[styles.button, { backgroundColor: tint }]} onPress={handleCreateNew}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <ThemedText style={styles.buttonText}>Create New Tree</ThemedText>
          </Pressable>

          <Pressable style={[styles.buttonSecondary, { borderColor: tint }]} onPress={handleImport}>
            <Ionicons name="download-outline" size={20} color={tint} />
            <ThemedText style={[styles.buttonSecondaryText, { color: tint }]}>Import Existing Tree</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { 
    alignItems: 'center',
    padding: 32,
    borderRadius: 32,
    ...Platform.select({
      web: { boxShadow: '0 20px 50px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }
    }),
  },
  iconContainer: { 
    marginBottom: 32,
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#6366f110',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    textAlign: 'center', 
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: { 
    fontSize: 17, 
    textAlign: 'center', 
    opacity: 0.6, 
    marginBottom: 48, 
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  buttonContainer: { width: '100%', gap: 16 },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 18, 
    borderRadius: 20, 
    gap: 12,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)' },
      default: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 }
    }),
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  buttonSecondary: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 18, 
    borderRadius: 20, 
    borderWidth: 2, 
    gap: 12 
  },
  buttonSecondaryText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
});
