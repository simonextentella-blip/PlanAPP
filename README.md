# PlanApp

App gestionale per il team (iPhone e Android), fatta con Expo / React Native.

## Cosa fa
- **Calendario**: appuntamenti, lavori, cose da fare e note per ogni giorno, con pallini colorati sui giorni occupati.
- **Tutte le note**: elenco completo con ricerca, filtri per tipo, giorni passati e completati; le note senza data sono le "note generali".
- **Profilo**: il tuo nome, che compare su ogni elemento che aggiungi.

Per ora i dati sono salvati sul telefono (`src/lib/repository.ts`). Il passo successivo è sostituire
`localRepository` con un'implementazione Supabase, così tu e il collega vedete gli stessi dati.

## Comandi
```bash
npm install
npx expo start          # apri con Expo Go sul telefono (QR code)
npx tsc --noEmit        # controllo dei tipi
# anteprima web in un unico file:
npx expo export --platform web --output-dir dist && node scripts/build-preview.mjs
```
