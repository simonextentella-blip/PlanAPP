import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_COMPANY, type Company, type Item } from './types';

/**
 * Punto unico di accesso ai dati. Oggi salva sul telefono (AsyncStorage);
 * quando colleghiamo Supabase basterà fornire un'altra implementazione
 * di questa interfaccia, senza toccare le schermate.
 */
export interface ItemRepository {
  loadAll(): Promise<Item[]>;
  saveAll(items: Item[]): Promise<void>;
}

const KEY = 'planapp.items.v1';

export const localRepository: ItemRepository = {
  async loadAll() {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Item[];
    } catch {
      return [];
    }
  },
  async saveAll(items) {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  },
};

const PROFILE_KEY = 'planapp.profile.v1';

export async function loadProfileName(): Promise<string> {
  return (await AsyncStorage.getItem(PROFILE_KEY)) ?? '';
}

export async function saveProfileName(name: string): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, name);
}

const COMPANY_KEY = 'planapp.company.v1';

export async function loadCompany(): Promise<Company> {
  const raw = await AsyncStorage.getItem(COMPANY_KEY);
  try {
    return raw ? { ...EMPTY_COMPANY, ...JSON.parse(raw) } : EMPTY_COMPANY;
  } catch {
    return EMPTY_COMPANY;
  }
}

export async function saveCompany(c: Company): Promise<void> {
  await AsyncStorage.setItem(COMPANY_KEY, JSON.stringify(c));
}
