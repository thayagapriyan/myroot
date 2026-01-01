import { Member } from '@/types/family';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAMILY_SUFFIX = ':family';

export const FamilyService = {
  async getFamily(userKey: string): Promise<Member[]> {
    if (!userKey) return [];
    const familyKey = `${userKey}${FAMILY_SUFFIX}`;
    const raw = await AsyncStorage.getItem(familyKey);
    return raw ? JSON.parse(raw) : [];
  },

  async saveFamily(userKey: string, members: Member[]): Promise<void> {
    if (!userKey) return;
    const familyKey = `${userKey}${FAMILY_SUFFIX}`;
    await AsyncStorage.setItem(familyKey, JSON.stringify(members));
  },

  async resetFamily(userKey: string): Promise<void> {
    if (!userKey) return;
    const familyKey = `${userKey}${FAMILY_SUFFIX}`;
    await AsyncStorage.removeItem(familyKey);
  }
};
