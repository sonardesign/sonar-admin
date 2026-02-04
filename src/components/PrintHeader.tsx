import React from 'react'
import snrLogoFull from '../assets/snr-logo-full.svg'

interface PrintHeaderProps {
  /**
   * Optional title to display below the header (only in print)
   */
  title?: string
  /**
   * Optional subtitle/date range to display (only in print)
   */
  subtitle?: string
}

/**
 * PrintHeader Component
 * 
 * A reusable header component for print materials that displays:
 * - Sonar logo on the left
 * - sonardigital.io on the right
 * - Optional title and subtitle below
 * 
 * The header is hidden on screen and only visible when printing.
 * Maximum height: 100px (configurable via CSS)
 * 
 * @example
 * <PrintHeader title="Time Tracking Report" subtitle="January 2024" />
 */
export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle }) => {
  return (
    <>
      {/* Print-only header */}
      <div className="print-header">
        <div className="print-header-container">
          <img src={snrLogoFull} alt="Sonar Digital" className="print-logo" />
        </div>
        {(title || subtitle) && (
          <div className="print-header-info">
            {title && <h1 className="print-title">{title}</h1>}
            {subtitle && <p className="print-subtitle">{subtitle}</p>}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          /* Print header styles */
          .print-header {
            display: block !important;
            width: 100%;
            max-height: 100px;
            margin-bottom: 2rem;
            page-break-after: avoid;
          }

          .print-header-container {
            display: flex;
            align-items: center;
            width: 100%;
            padding-bottom: 1rem;
          }

          .print-logo {
            max-height: 80px;
            max-width: 80px;
            width: auto;
            height: auto;
          }

          .print-header-info {
            margin-top: 1.5rem;
            text-align: center;
          }

          .print-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.25rem;
          }

          .print-subtitle {
            font-size: 1rem;
            color: #6b7280;
            margin: 0;
          }

          /* Hide UI elements when printing */
          .sidebar, 
          .app-sidebar, 
          nav,
          [data-sidebar],
          button:not(.print-keep),
          .no-print {
            display: none !important;
          }

          /* Optimize content for print */
          body {
            background: white !important;
          }

          /* Ensure proper page breaks */
          .space-y-6,
          .print-section {
            page-break-inside: avoid;
          }

          /* Ensure charts and images print properly */
          svg, img {
            max-width: 100%;
          }

          /* Remove box shadows for cleaner print */
          * {
            box-shadow: none !important;
          }

          /* Ensure cards have borders in print */
          .print-card {
            border: 1px solid #e5e7eb;
            page-break-inside: avoid;
          }
        }

        /* Hide print header on screen */
        @media screen {
          .print-header {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
