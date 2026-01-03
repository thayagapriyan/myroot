import { Member } from '@/types/family';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAMILY_KEY = 'local:family';
const PINNED_MEMBER_KEY = 'local:pinned_member';

export const FamilyService = {
  async getFamily(): Promise<Member[]> {
    const raw = await AsyncStorage.getItem(FAMILY_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async saveFamily(members: Member[]): Promise<void> {
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(members));
  },

  async resetFamily(): Promise<void> {
    await AsyncStorage.removeItem(FAMILY_KEY);
    await AsyncStorage.removeItem(PINNED_MEMBER_KEY);
  },

  async getPinnedMemberId(): Promise<string | null> {
    return await AsyncStorage.getItem(PINNED_MEMBER_KEY);
  },

  async setPinnedMemberId(id: string | null): Promise<void> {
    if (id) {
      await AsyncStorage.setItem(PINNED_MEMBER_KEY, id);
    } else {
      await AsyncStorage.removeItem(PINNED_MEMBER_KEY);
    }
  }
};
