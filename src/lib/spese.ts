import type { Ionicons } from '@expo/vector-icons';

/** Categorie pronte per le spese dei conti lavori: prendono il posto del titolo. */
export const SPESA_CATEGORIES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Pranzo', icon: 'restaurant-outline' },
  { label: 'Benzina', icon: 'car-outline' },
  { label: 'Materiali', icon: 'hammer-outline' },
  { label: 'Altro', icon: 'ellipsis-horizontal' },
];

/** Categoria di una spesa: il titolo se è una delle categorie pronte, altrimenti "Altro". */
export function spesaCategory(title: string): string {
  return SPESA_CATEGORIES.some((c) => c.label === title) ? title : 'Altro';
}

export const categoryIcon = (label: string) => SPESA_CATEGORIES.find((c) => c.label === label)?.icon ?? 'ellipsis-horizontal';
