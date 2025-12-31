# Keyboard Shortcuts - Dokumentáció

## Áttekintés

Ez a dokumentáció a `useKeyboardShortcut` hook használatát mutatja be, amely production-ready megoldást nyújt a billentyűparancsok kezelésére React alkalmazásokban.

## Főbb jellemzők

✅ **Keresztplatform támogatás**: Automatikusan kezeli a macOS (Cmd) és Windows/Linux (Ctrl) billentyűket  
✅ **Input mezők tisztelete**: Alapértelmezetten nem aktiválódik input/textarea/contenteditable mezőkben  
✅ **Optimalizált**: Csak akkor blokkolja a böngésző alapértelmezett viselkedését, amikor ténylegesen a shortcut aktiválódik  
✅ **Flexibilis**: Támogat egyedi feltételeket és opciókat  
✅ **Production-ready**: Proper cleanup, refs használata, nincs memory leak  

## Alapvető használat

### Egyszerű példa

```tsx
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

function MyComponent() {
  useKeyboardShortcut([
    {
      key: 'n',
      ctrlKey: true,  // Windows/Linux: Ctrl
      metaKey: true,  // macOS: Cmd
      shiftKey: true, // Shift
      handler: () => {
        console.log('Ctrl/Cmd+Shift+N pressed!')
      },
      preventDefault: true // Blokkolja a böngésző alapértelmezett viselkedését
    }
  ])

  return <div>My Component</div>
}
```

### Helper függvény használata

```tsx
import { useKeyboardShortcut, createShortcut } from '../hooks/useKeyboardShortcut'

function MyComponent() {
  useKeyboardShortcut([
    createShortcut(
      'n',
      { shift: true }, // Automatikusan kezeli a Ctrl/Cmd-t
      () => {
        console.log('Ctrl/Cmd+Shift+N pressed!')
      }
    )
  ])

  return <div>My Component</div>
}
```

## preventDefault() vs stopPropagation()

### preventDefault()

**Mikor használd:**
- Amikor a böngésző alapértelmezett viselkedését szeretnéd megakadályozni
- Pl. Ctrl+N (új ablak), Ctrl+S (mentés), Ctrl+F (keresés)

**Példa:**
```tsx
{
  key: 's',
  ctrlKey: true,
  metaKey: true,
  handler: () => saveDocument(),
  preventDefault: true // Megakadályozza a böngésző "Mentés" dialógusát
}
```

### stopPropagation()

**Mikor használd:**
- Amikor meg akarod akadályozni, hogy az esemény feljebb terjedjen a DOM fában
- Ritkábban szükséges, általában preventDefault() elég

**Példa:**
```tsx
{
  key: 'Escape',
  handler: () => closeModal(),
  stopPropagation: true // Megakadályozza, hogy más komponensek is kezeljék
}
```

## Input mezők kezelése

### Alapértelmezett viselkedés (nem aktiválódik inputokban)

```tsx
useKeyboardShortcut([
  {
    key: 'n',
    ctrlKey: true,
    metaKey: true,
    handler: () => createNew(),
    // allowInInputs: false (alapértelmezett)
  }
])
```

### Engedélyezés input mezőkben is

```tsx
useKeyboardShortcut([
  {
    key: '/',
    handler: () => openSearch(),
    allowInInputs: true // Aktiválódik input mezőkben is
  }
])
```

## Egyedi feltételek

```tsx
useKeyboardShortcut([
  {
    key: 'n',
    ctrlKey: true,
    metaKey: true,
    handler: () => createNew(),
    condition: (event) => {
      // Csak akkor aktiválódik, ha nincs megnyitva modal
      return !document.querySelector('[role="dialog"]')
    }
  }
])
```

## Platform-specifikus kezelés

A hook automatikusan kezeli mindkét platformot:

```tsx
// Ez a kód mindkét platformon működik:
useKeyboardShortcut([
  {
    key: 'n',
    ctrlKey: true,  // Windows/Linux: Ctrl+N
    metaKey: true,  // macOS: Cmd+N
    handler: () => createNew()
  }
])
```

Ha csak egy platformot szeretnél támogatni:

```tsx
// Csak Windows/Linux:
{
  key: 'n',
  ctrlKey: true,
  metaKey: false, // macOS-on nem működik
  handler: () => createNew()
}

// Csak macOS:
{
  key: 'n',
  ctrlKey: false,
  metaKey: true, // Windows/Linux-on nem működik
  handler: () => createNew()
}
```

## Több shortcut kezelése

```tsx
useKeyboardShortcut([
  {
    key: 'n',
    ctrlKey: true,
    metaKey: true,
    handler: () => createNew()
  },
  {
    key: 's',
    ctrlKey: true,
    metaKey: true,
    handler: () => save()
  },
  {
    key: 'Escape',
    handler: () => closeModal()
  }
])
```

## Dependencies kezelése

Ha a shortcut handler függ valamilyen state-től vagy prop-tól:

```tsx
function MyComponent({ userId }: { userId: string }) {
  useKeyboardShortcut([
    {
      key: 'n',
      ctrlKey: true,
      metaKey: true,
      handler: () => {
        createNewForUser(userId) // userId használata
      }
    }
  ], [userId]) // Re-regisztrálódik, amikor userId változik
}
```

## Alternatív library-k

### react-hotkeys-hook

```bash
npm install react-hotkeys-hook
```

```tsx
import { useHotkeys } from 'react-hotkeys-hook'

useHotkeys('ctrl+shift+n', () => {
  console.log('Shortcut pressed')
})
```

### use-hotkeys

```bash
npm install use-hotkeys
```

```tsx
import { useHotkeys } from 'use-hotkeys'

useHotkeys({
  'ctrl+shift+n': () => {
    console.log('Shortcut pressed')
  }
})
```

## Production Best Practices

1. **Mindig használj preventDefault: true-t**, ha a böngésző alapértelmezett viselkedését meg akarod akadályozni
2. **Ne aktiváld input mezőkben**, hacsak nem szándékosan (pl. keresés shortcut)
3. **Használj dependencies array-t**, ha a handler függ state-től vagy prop-tól
4. **Teszteld mindkét platformon** (Windows/Linux és macOS)
5. **Dokumentáld a shortcutokat** a felhasználók számára

## Konkrét példa: Ctrl/Cmd + Shift + N

```tsx
import { useKeyboardShortcut, createShortcut } from '../hooks/useKeyboardShortcut'

function App() {
  const handleCreateNew = () => {
    console.log('Creating new item...')
    // Teendők létrehozása
  }

  useKeyboardShortcut([
    createShortcut(
      'n',
      { shift: true }, // Automatikusan kezeli a Ctrl/Cmd-t
      handleCreateNew,
      {
        preventDefault: true, // Blokkolja a böngésző új ablak funkcióját
        allowInInputs: false   // Ne aktiválódjon input mezőkben
      }
    )
  ])

  return <div>My App</div>
}
```

## Hibakeresés

Ha a shortcut nem működik:

1. **Ellenőrizd a konzolt**: Van-e error?
2. **Teszteld input mezőkben**: Lehet, hogy az `allowInInputs: false` miatt nem aktiválódik
3. **Ellenőrizd a modifier key-eket**: Biztos, hogy minden szükséges modifier megvan?
4. **Teszteld más böngészőben**: Lehet, hogy böngésző-specifikus probléma
5. **Nézd meg a Network tab-ot**: Lehet, hogy más script foglalta le az eseményt

