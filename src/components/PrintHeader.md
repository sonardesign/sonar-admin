# PrintHeader Component

A reusable header component for all print materials in the Sonar Admin application.

## Features

- **Logo on left**: Sonar Digital full logo with branding (max 80px height, 160px width)
- **Website on right**: "sonardigital.io" text
- **Light separator**: 1px gray border under the header
- **Optional title/subtitle**: Centered below the header
- **Screen hidden**: Only visible when printing (Ctrl+P / Cmd+P)
- **Auto print optimization**: Hides UI elements, removes shadows, optimizes layout
- **PDF export**: Automatically included in all PDF reports exported from the Reports page

## Usage

### Basic Usage

```tsx
import { PrintHeader } from '../components/PrintHeader'

export const MyReport = () => {
  return (
    <Page>
      <PrintHeader />
      
      {/* Your report content */}
    </Page>
  )
}
```

### With Title and Subtitle

```tsx
<PrintHeader 
  title="Time Tracking Report" 
  subtitle="January 1 - January 31, 2024"
/>
```

### With Dynamic Date Range

```tsx
const dateRangeText = `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`

<PrintHeader 
  title="Weekly Report" 
  subtitle={dateRangeText}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | No | Optional title displayed below header (centered) |
| `subtitle` | `string` | No | Optional subtitle/date range (centered, gray text) |

## Print Styling Classes

The component provides several utility classes for print optimization:

### Hide on Print
```tsx
<div className="no-print">
  {/* This content won't appear in print */}
</div>
```

### Section Breaks
```tsx
<div className="print-section">
  {/* Prevents page break inside this section */}
</div>
```

### Card Borders in Print
```tsx
<Card className="print-card">
  {/* Card will have borders when printed */}
</Card>
```

### Keep Button in Print
```tsx
<Button className="print-keep">
  {/* This button will still appear in print */}
</Button>
```

## Examples

### Reports Page
```tsx
<PrintHeader 
  title="Time Tracking Report" 
  subtitle={formatDateRange(dateRange)}
/>
```

### Invoice
```tsx
<PrintHeader 
  title="Invoice" 
  subtitle={`INV-${invoiceNumber} - ${invoiceDate}`}
/>
```

### Timesheet
```tsx
<PrintHeader 
  title="Weekly Timesheet" 
  subtitle={`${employeeName} - Week ${weekNumber}`}
/>
```

### Project Summary
```tsx
<PrintHeader 
  title={projectName} 
  subtitle={`Client: ${clientName} - ${projectStatus}`}
/>
```

## What Gets Hidden in Print

The following elements are automatically hidden when printing:
- Sidebar and navigation
- All buttons (unless marked with `print-keep` class)
- Elements with `no-print` class
- Box shadows
- Background colors (converted to white)

## Customization

To customize the print styles, edit `src/components/PrintHeader.tsx` and modify the `@media print` section.

Common customizations:
- Adjust logo size: Change `max-height` in `.print-logo`
- Modify separator: Update `border-bottom` in `.print-header-container`
- Change title styling: Edit `.print-title` and `.print-subtitle`
- Add company colors: Customize color values in the styles
