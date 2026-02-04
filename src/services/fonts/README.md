# Custom Font Integration for PDF Export

## Adding DM Sans Font to jsPDF

To use DM Sans (or any custom font) in PDF exports, follow these steps:

### 1. Download Font Files

Download DM Sans Regular from [Google Fonts](https://fonts.google.com/specimen/DM+Sans):
- DM Sans Regular (400)

### 2. Convert Font to Base64

Use an online tool or Node.js script to convert the TTF file to base64:

```bash
# Using Node.js
const fs = require('fs');
const font = fs.readFileSync('DMSans-Regular.ttf');
const base64 = font.toString('base64');
fs.writeFileSync('dm-sans-regular-base64.txt', base64);
```

### 3. Create Font Module

Create `src/services/fonts/dm-sans.ts`:

```typescript
export const dmSansRegularBase64 = 'AAEAAAAQAQAABAAAR0RFRi...'; // Your base64 string
```

### 4. Embed Font in PDF Service

Update `src/services/pdfExportService.ts`:

```typescript
import { dmSansRegularBase64 } from './fonts/dm-sans'

// In constructor():
this.doc.addFileToVFS('DMSans-Regular.ttf', dmSansRegularBase64);
this.doc.addFont('DMSans-Regular.ttf', 'DM Sans', 'normal');

// In setFont():
this.doc.setFont('DM Sans', 'normal');
```

## Current Implementation

Currently using **Helvetica** as the default font because:
- It's built into jsPDF (no additional setup needed)
- Good Unicode support for Hungarian characters
- Clean, professional appearance

## Benefits of Custom Fonts

- Brand consistency (DM Sans matches the app UI)
- Better typography control
- Professional appearance

## File Size Impact

Each embedded font adds ~50-100KB to the initial PDF size. Consider this tradeoff for your use case.
