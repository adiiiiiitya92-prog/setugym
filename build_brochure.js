const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building SetuGym Project Brochure with official PCE college logo...');

// 1. Read assets
const collegeImgBase64 = fs.readFileSync('d:/gym/frontend/assets/college.png').toString('base64');
const setuGymLogoBase64 = fs.readFileSync('d:/gym/frontend/assets/setu gym logo s.png').toString('base64');
const pceLogoBase64 = fs.readFileSync('d:/gym/pce_logo_clean.png').toString('base64');

const qrBankSvg = fs.readFileSync('d:/gym/qr_bank.svg', 'utf8');
const qrSubmissionSvg = fs.readFileSync('d:/gym/qr_submission.svg', 'utf8');
const qrRegistrationSvg = fs.readFileSync('d:/gym/qr_registration.svg', 'utf8');
const qrWebsiteSvg = fs.readFileSync('d:/gym/qr_website.svg', 'utf8');

// HTML Generation
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SetuGym - Technical Project Showcase &amp; Conference Brochure - PCE Nagpur</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');

    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8pt;
      line-height: 1.26;
      color: #1a1a1a;
      background-color: #cbd5e1;
      margin: 0;
      padding: 16px 0;
    }

    /* Interactive Print Bar */
    .print-bar {
      max-width: 297mm;
      margin: 0 auto 12px auto;
      padding: 10px 20px;
      background: #0f172a;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      font-family: 'Montserrat', sans-serif;
    }
    .print-bar .title-tag {
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .print-bar .sub-tag {
      font-size: 11.5px;
      opacity: 0.8;
      margin-left: 10px;
      color: #94a3b8;
    }
    .print-btn {
      background: linear-gradient(135deg, #8b1874, #701a75);
      color: white;
      border: 1px solid #c026d3;
      padding: 7px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(112, 26, 117, 0.4);
      transition: all 0.2s;
    }
    .print-btn:hover {
      background: linear-gradient(135deg, #a21caf, #86198f);
      transform: translateY(-1px);
    }

    /* Page Canvas: Exact A4 Landscape (297mm x 210mm) */
    .page {
      width: 297mm;
      height: 210mm;
      max-height: 210mm;
      margin: 0 auto 20px auto;
      background: #ffffff;
      box-shadow: 0 10px 25px rgba(0,0,0,0.22);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid #94a3b8;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .print-bar {
        display: none !important;
      }
      .page {
        margin: 0;
        box-shadow: none;
        border: none;
        page-break-after: always;
        break-after: page;
        height: 210mm;
        max-height: 210mm;
      }
    }

    /* ------------------------------------------------------------- */
    /* PAGE 1: TOP COLLEGE HEADER BAR                                */
    /* ------------------------------------------------------------- */
    .p1-header {
      height: 24mm;
      border-bottom: 2.2px solid #b91c1c;
      padding: 2.5mm 6mm 2mm 6mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
    }

    .p1-header-left {
      display: flex;
      align-items: center;
      gap: 3.8mm;
    }

    .college-logo-img {
      height: 19mm;
      max-width: 26mm;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.12));
    }

    .college-info {
      display: flex;
      flex-direction: column;
    }

    .college-sanstha {
      font-size: 6.2pt;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.1;
    }

    .college-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 11.5pt;
      font-weight: 900;
      color: #7f1d1d;
      letter-spacing: -0.2px;
      line-height: 1.12;
      text-transform: uppercase;
    }

    .college-subtitle {
      font-family: 'Montserrat', sans-serif;
      font-size: 8.4pt;
      font-weight: 800;
      color: #1e3a8a;
      line-height: 1.15;
    }

    .college-affiliation {
      font-size: 6.3pt;
      font-weight: 600;
      color: #334155;
      line-height: 1.15;
      margin-top: 0.5mm;
    }

    .college-accreditation {
      font-size: 6.2pt;
      font-weight: 700;
      color: #b91c1c;
      line-height: 1.15;
    }

    .p1-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 1.5mm;
    }

    .dte-code {
      font-family: 'Montserrat', sans-serif;
      font-size: 7.8pt;
      font-weight: 800;
      color: #b91c1c;
    }
    .dte-url {
      font-family: 'Montserrat', sans-serif;
      font-size: 7.4pt;
      font-weight: 700;
      color: #b91c1c;
      text-decoration: none;
    }

    .accred-badges-row {
      display: flex;
      gap: 2.5mm;
      align-items: center;
      margin-top: 0.5mm;
    }

    .accred-tag {
      font-size: 5.6pt;
      font-weight: 800;
      padding: 1.8px 4.5px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tag-naac { background: #fef08a; color: #854d0e; border: 0.5px solid #eab308; }
    .tag-nirf { background: #dbeafe; color: #1e40af; border: 0.5px solid #3b82f6; }
    .tag-iso { background: #dcfce7; color: #166534; border: 0.5px solid #22c55e; }
    .tag-auton { background: #f3e8ff; color: #6b21a8; border: 0.5px solid #a855f7; }

    /* ------------------------------------------------------------- */
    /* PAGE 1: BODY LAYOUT (Left Hero + Right 2-Columns)             */
    /* ------------------------------------------------------------- */
    .p1-body {
      flex: 1;
      height: 186mm;
      max-height: 186mm;
      display: flex;
      overflow: hidden;
      background: #fdfcfe;
    }

    /* Left Hero Column (~28.5% width, ~84mm) */
    .p1-left-hero {
      width: 84mm;
      min-width: 84mm;
      max-width: 84mm;
      height: 100%;
      background: linear-gradient(180deg, #09132e 0%, #11204d 30%, #162a63 70%, #0d1738 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      position: relative;
      border-right: 1.5px solid #cbd5e1;
    }

    .hero-image-wrap {
      width: 100%;
      height: 48mm;
      position: relative;
      overflow: hidden;
      border-bottom: 2.5px solid #fbbf24;
      background: #1e293b;
    }
    .hero-image-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .hero-overlay-badge {
      position: absolute;
      bottom: 2mm;
      right: 2.5mm;
      background: rgba(15, 23, 42, 0.88);
      border: 0.5px solid #fbbf24;
      color: #f8fafc;
      font-size: 5.5pt;
      font-weight: 700;
      padding: 1.5px 5px;
      border-radius: 3px;
      backdrop-filter: blur(2px);
    }

    .hero-content {
      flex: 1;
      padding: 2.8mm 4mm 2.2mm 4mm;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      text-align: center;
    }

    .hero-subhead {
      font-family: 'Montserrat', sans-serif;
      font-size: 7.2pt;
      font-weight: 700;
      color: #93c5fd;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 1.2mm;
    }

    .hero-main-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 9.8pt;
      font-weight: 900;
      line-height: 1.26;
      color: #facc15;
      text-shadow: 0 1px 4px rgba(0,0,0,0.6);
      margin-bottom: 1.5mm;
      text-transform: capitalize;
    }

    .hero-logo-tag-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      margin-bottom: 1.5mm;
    }
    .hero-setugym-logo {
      width: 8mm;
      height: 8mm;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    .hero-acronym-badge {
      display: inline-block;
      background: linear-gradient(135deg, #ea580c, #c2410c);
      color: #ffffff;
      font-family: 'Montserrat', sans-serif;
      font-size: 8.2pt;
      font-weight: 800;
      padding: 2px 10px;
      border-radius: 4px;
      letter-spacing: 1px;
      box-shadow: 0 2px 6px rgba(194, 65, 12, 0.5);
    }

    .hero-date-pill {
      background: #ffffff;
      color: #0f172a;
      font-family: 'Montserrat', sans-serif;
      font-size: 7.8pt;
      font-weight: 800;
      padding: 3px 12px;
      border-radius: 12px;
      margin: 1.2mm auto;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: inline-block;
      letter-spacing: 0.3px;
    }

    .hero-organizer-box {
      margin-top: 0.8mm;
    }
    .hero-org-label {
      font-size: 6.5pt;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .hero-org-dept {
      font-family: 'Montserrat', sans-serif;
      font-size: 8.2pt;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.2;
      margin-top: 0.5mm;
      color: #67e8f9;
    }
    .hero-mode {
      font-size: 6.6pt;
      font-weight: 700;
      color: #f472b6;
      margin-top: 0.8mm;
      font-style: italic;
    }

    .hero-association-box {
      border-top: 0.5px solid rgba(255,255,255,0.25);
      padding-top: 1.8mm;
      margin-top: 0.8mm;
    }
    .hero-assoc-title {
      font-size: 6pt;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1.5mm;
    }
    .hero-assoc-logos {
      display: flex;
      justify-content: center;
      gap: 3.5mm;
      align-items: center;
    }
    .assoc-seal {
      width: 7.5mm;
      height: 7.5mm;
      background: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .assoc-seal svg {
      width: 100%;
      height: 100%;
    }

    .hero-bottom-bar {
      background: #701a75;
      padding: 2.4mm 2mm;
      text-align: center;
      border-top: 1px solid #a21caf;
    }
    .hero-portal-label {
      font-size: 5.6pt;
      color: #f5d0fe;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .hero-portal-link {
      font-family: 'Montserrat', sans-serif;
      font-size: 7.2pt;
      font-weight: 800;
      color: #ffffff;
      text-decoration: none;
      display: block;
      word-break: break-all;
    }

    /* Right Section (~71.5% width, ~213mm) */
    .p1-right-content {
      flex: 1;
      height: 100%;
      padding: 3mm 4.5mm 3mm 4.5mm;
      display: flex;
      gap: 4mm;
      overflow: hidden;
    }

    /* Purple Capsule Ribbons */
    .purple-ribbon {
      background: linear-gradient(135deg, #7e22ce 0%, #8b1874 100%);
      color: #ffffff;
      font-family: 'Montserrat', sans-serif;
      font-size: 7.2pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 2.2px 8.5px;
      border-radius: 3px;
      display: inline-block;
      margin-bottom: 1.8mm;
      box-shadow: 0 1.5px 3px rgba(126, 34, 206, 0.25);
    }

    /* Sub-Column 1: Center Column (~101mm) */
    .p1-col-center {
      width: 101mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Sub-Column 2: Far-Right Column (~103mm) */
    .p1-col-right {
      width: 103mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .content-box {
      background: #ffffff;
      border: 0.5px solid #e2e8f0;
      border-radius: 4px;
      padding: 2.2mm 3mm;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .vision-quote {
      font-size: 7.4pt;
      font-weight: 700;
      font-style: italic;
      color: #1e293b;
      line-height: 1.28;
      border-left: 2.5px solid #9333ea;
      padding-left: 2.5mm;
      margin: 0.5mm 0 0 0;
    }

    .bullet-list {
      list-style: none;
      padding: 0;
      margin: 0.8mm 0 0 0;
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
    }
    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 2mm;
      font-size: 6.7pt;
      line-height: 1.25;
      color: #27272a;
      text-align: justify;
    }
    .sq-bullet {
      width: 3.2px;
      height: 3.2px;
      min-width: 3.2px;
      margin-top: 2.5px;
      background: #7e22ce;
      border-radius: 0.5px;
      flex-shrink: 0;
    }
    .sq-bullet.blue { background: #2563eb; }
    .sq-bullet.emerald { background: #059669; }

    .para-text {
      font-size: 6.6pt;
      line-height: 1.26;
      color: #27272a;
      text-align: justify;
      margin-top: 0.8mm;
    }

    /* Technical Track Cards */
    .track-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      margin-top: 1.2mm;
    }
    .track-card {
      background: #fafafa;
      border: 0.5px solid #e4e4e7;
      border-left: 2px solid #8b1874;
      border-radius: 2px;
      padding: 1.4mm 2.2mm;
    }
    .track-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 6.5pt;
      font-weight: 800;
      color: #701a75;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 0.8mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .track-badge {
      font-size: 4.8pt;
      background: #fdf2f8;
      color: #9d174d;
      padding: 0.5px 3.5px;
      border-radius: 2px;
      font-weight: 700;
    }
    .track-items {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8mm 2mm;
      font-size: 6pt;
      color: #3f3f46;
      line-height: 1.2;
    }
    .track-subitem {
      display: flex;
      align-items: center;
      gap: 1.2mm;
    }
    .track-subitem::before {
      content: "■";
      font-size: 4pt;
      color: #7c3aed;
    }

    /* ------------------------------------------------------------- */
    /* PAGE 2: 3-COLUMN DETAILS, COMMITTEES, FEES, DATES, QR CODES  */
    /* ------------------------------------------------------------- */
    .p2-container {
      width: 100%;
      height: 100%;
      padding: 3.5mm 5mm 3.5mm 5mm;
      display: flex;
      gap: 4mm;
      background: #fdfdfe;
      overflow: hidden;
    }

    .p2-col {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    .p2-card {
      background: #ffffff;
      border: 0.5px solid #e2e8f0;
      border-radius: 4px;
      padding: 2.2mm 3mm;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }

    .person-entry {
      margin-bottom: 1.3mm;
      line-height: 1.2;
    }
    .person-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 6.9pt;
      font-weight: 800;
      color: #18181b;
    }
    .person-title {
      font-size: 6.2pt;
      font-weight: 600;
      color: #52525b;
    }

    .lead-author-grid {
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      margin-top: 1mm;
    }
    .lead-author-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 0.5px dashed #e4e4e7;
      padding-bottom: 0.8mm;
    }
    .lead-author-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 6.8pt;
      font-weight: 700;
      color: #701a75;
    }
    .lead-author-role {
      font-size: 5.8pt;
      font-weight: 600;
      color: #3b82f6;
      text-transform: uppercase;
    }

    .faculty-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8mm 2mm;
      font-size: 6pt;
      color: #27272a;
      line-height: 1.2;
      margin-top: 1mm;
    }
    .fac-item {
      display: flex;
      align-items: center;
      gap: 1mm;
    }
    .fac-item::before {
      content: "•";
      color: #8b1874;
      font-size: 8pt;
      line-height: 0;
    }

    /* Table Styles */
    .fees-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.6pt;
      margin-top: 1mm;
    }
    .fees-table th {
      background: #f4effa;
      color: #581c87;
      font-family: 'Montserrat', sans-serif;
      font-weight: 800;
      padding: 2.2px 5px;
      text-align: left;
      border: 0.5px solid #d8b4fe;
    }
    .fees-table td {
      padding: 2.2px 5px;
      border: 0.5px solid #e4e4e7;
      color: #27272a;
    }
    .fees-table tr:nth-child(even) {
      background: #faf5ff;
    }
    .fees-table td.fee-val {
      font-weight: 800;
      color: #701a75;
      text-align: right;
    }

    /* Bank Details Card */
    .bank-box-split {
      display: flex;
      gap: 3mm;
      align-items: center;
      margin-top: 1mm;
    }
    .bank-info-table {
      flex: 1;
      font-size: 6.2pt;
      line-height: 1.35;
    }
    .bank-row {
      display: flex;
      margin-bottom: 0.5mm;
    }
    .bank-label {
      width: 24mm;
      font-weight: 700;
      color: #18181b;
      font-family: 'Montserrat', sans-serif;
      font-size: 5.9pt;
    }
    .bank-val {
      font-weight: 700;
      color: #3b82f6;
    }
    .bank-qr-wrap {
      width: 19.5mm;
      height: 19.5mm;
      flex-shrink: 0;
      border: 1px solid #cbd5e1;
      padding: 1px;
      border-radius: 3px;
      background: #fff;
    }
    .bank-qr-wrap svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* QR Code Card Row */
    .qr-link-box {
      display: flex;
      align-items: center;
      gap: 3mm;
      background: #ffffff;
      border: 0.5px solid #e2e8f0;
      border-radius: 4px;
      padding: 2mm 2.5mm;
    }
    .qr-thumb {
      width: 15.5mm;
      height: 15.5mm;
      flex-shrink: 0;
      border: 0.5px solid #cbd5e1;
      padding: 1px;
      border-radius: 2px;
      background: #ffffff;
    }
    .qr-thumb svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .qr-link-info {
      flex: 1;
      font-size: 6.2pt;
      line-height: 1.25;
    }
    .qr-link-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 6.8pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5mm;
    }
    .qr-url-text {
      color: #2563eb;
      font-weight: 600;
      word-break: break-all;
      font-size: 5.8pt;
    }

    /* Keynote / Sessions */
    .session-entry {
      margin-bottom: 1.4mm;
      line-height: 1.25;
    }
    .session-badge {
      font-family: 'Montserrat', sans-serif;
      font-size: 6.3pt;
      font-weight: 800;
      color: #701a75;
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }
    .session-badge::before {
      content: "■";
      color: #9333ea;
      font-size: 5pt;
    }
    .session-speaker {
      font-size: 6.1pt;
      color: #4b5563;
      padding-left: 2.8mm;
    }

    /* Dates List */
    .date-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.8px 0;
      border-bottom: 0.5px dashed #f1f5f9;
      font-size: 6.5pt;
    }
    .date-event {
      color: #27272a;
    }
    .date-val {
      font-family: 'Montserrat', sans-serif;
      font-weight: 800;
      color: #9333ea;
      white-space: nowrap;
    }

    /* Bottom Brand Strip (Column 3) */
    .gp-brand-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 2.5mm 3mm;
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    .gp-logo-icon {
      height: 10.5mm;
      max-width: 14mm;
      object-fit: contain;
      flex-shrink: 0;
    }
    .gp-brand-text {
      display: flex;
      flex-direction: column;
    }
    .gp-corp-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 6.8pt;
      font-weight: 900;
      color: #1e3a8a;
      line-height: 1.15;
    }
    .gp-slogan-bar {
      background: #1e3a8a;
      color: #ffffff;
      font-family: 'Montserrat', sans-serif;
      font-size: 5.4pt;
      font-weight: 800;
      padding: 1.5px 6px;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 1mm;
      display: inline-block;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- Floating Print Controls for Browser View -->
  <div class="print-bar">
    <div style="display: flex; align-items: center;">
      <span class="title-tag">SETUGYM &bull; Priyadarshini College of Engineering, Nagpur</span>
      <span class="sub-tag">Dept. of Computer Technology &bull; 2-Page Landscape Showcase</span>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
      <a href="SetuGym_Project_Brochure.pdf" download style="color: #60a5fa; font-size: 13px; font-weight: 600; text-decoration: none;">Download PDF File</a>
      <button class="print-btn" onclick="window.print()">
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
        </svg>
        Print / Save to PDF
      </button>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- PAGE 1: HERO, VISION, MISSION, ABOUT, OBJECTIVES, TRACKS      -->
  <!-- ============================================================= -->
  <div class="page">
    
    <!-- Top Institutional Banner with Official PCE Logo -->
    <header class="p1-header">
      <div class="p1-header-left">
        <!-- Official PCE Logo placed right next to College Name -->
        <img src="data:image/png;base64,${pceLogoBase64}" alt="Priyadarshini College of Engineering Logo" class="college-logo-img">

        <div class="college-info">
          <div class="college-sanstha">Lokmanya Tilak Jankalyan Shikshan Sanstha's</div>
          <div class="college-name">PRIYADARSHINI COLLEGE OF ENGINEERING, NAGPUR</div>
          <div class="college-subtitle">Near CRPF Campus, Hingna Road, Digdoh Hills, Nagpur – 440019</div>
          <div class="college-affiliation">An Autonomous Institution Affiliated to Rashtrasant Tukadoji Maharaj Nagpur University, Nagpur</div>
          <div class="college-accreditation">Approved by AICTE, New Delhi &amp; Govt. of Maharashtra | Accredited with &lsquo;A+&rsquo; Grade by NAAC | NBA Accredited</div>
        </div>
      </div>

      <div class="p1-header-right">
        <div style="display: flex; gap: 4mm; align-items: baseline;">
          <span class="dte-code">DTE Code: 4123</span>
          <a class="dte-url" href="https://www.pcenagpur.edu.in" target="_blank">www.pcenagpur.edu.in</a>
        </div>
        <div class="accred-badges-row">
          <span class="accred-tag tag-naac">&#9733; NAAC A+</span>
          <span class="accred-tag tag-nirf">NIRF RANKED</span>
          <span class="accred-tag tag-iso">ISO 9001:2015</span>
          <span class="accred-tag tag-auton">AUTONOMOUS</span>
        </div>
      </div>
    </header>

    <!-- Page 1 Body Grid -->
    <div class="p1-body">
      
      <!-- Left Column: Hero Poster Zone -->
      <aside class="p1-left-hero">
        <div class="hero-image-wrap">
          <img src="data:image/png;base64,${collegeImgBase64}" alt="Priyadarshini College of Engineering Campus">
          <div class="hero-overlay-badge">PCE CAMPUS &bull; NAGPUR</div>
        </div>

        <div class="hero-content">
          <div>
            <div class="hero-subhead">National Conference &amp; Showcase</div>
            <div class="hero-main-title">AI-Enabled Smart Gym Management and Predictive Fitness System</div>
            <div class="hero-logo-tag-row">
              <img src="data:image/png;base64,${setuGymLogoBase64}" alt="SetuGym Logo" class="hero-setugym-logo">
              <div class="hero-acronym-badge">SETUGYM-2026</div>
            </div>
          </div>

          <div>
            <div class="hero-date-pill">&#128197; 8th to 9th October 2026</div>
            <div class="hero-organizer-box">
              <div class="hero-org-label">Organized By</div>
              <div class="hero-org-dept">Department of Computer Technology</div>
              <div class="hero-mode">(Hybrid: Offline Demo &amp; Cloud Platform)</div>
            </div>
          </div>

          <div class="hero-association-box">
            <div class="hero-assoc-title">In Association With</div>
            <div class="hero-assoc-logos">
              <!-- AICTE Seal -->
              <div class="assoc-seal" title="AICTE">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="19" fill="#ea580c"/>
                  <circle cx="20" cy="20" r="14" fill="#ffffff"/>
                  <path d="M20 9 L23 16 L31 16 L24 21 L27 29 L20 24 L13 29 L16 21 L9 16 L17 16 Z" fill="#ea580c"/>
                </svg>
              </div>
              <!-- ISTE Seal -->
              <div class="assoc-seal" title="ISTE">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="19" fill="#0284c7"/>
                  <circle cx="20" cy="20" r="14" fill="#ffffff"/>
                  <text x="20" y="24" font-size="10" font-weight="900" fill="#0284c7" text-anchor="middle">ISTE</text>
                </svg>
              </div>
              <!-- IEI Seal -->
              <div class="assoc-seal" title="IEI">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="19" fill="#166534"/>
                  <circle cx="20" cy="20" r="14" fill="#ffffff"/>
                  <text x="20" y="24" font-size="10" font-weight="900" fill="#166534" text-anchor="middle">IEI</text>
                </svg>
              </div>
              <!-- IEEE Computer Society Seal -->
              <div class="assoc-seal" title="IEEE CS">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="19" fill="#0369a1"/>
                  <circle cx="20" cy="20" r="14" fill="#ffffff"/>
                  <path d="M12 20 L20 10 L28 20 L20 30 Z" fill="#0369a1"/>
                  <circle cx="20" cy="20" r="3" fill="#ffffff"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-bottom-bar">
          <div class="hero-portal-label">Conference &amp; Project Portal</div>
          <a class="hero-portal-link" href="https://www.pcenagpur.edu.in" target="_blank">www.setugym.pcenagpur.edu.in</a>
        </div>
      </aside>

      <!-- Right Content: Center Column + Far-Right Column -->
      <main class="p1-right-content">
        
        <!-- Center Column -->
        <div class="p1-col-center">
          
          <!-- Vision -->
          <div class="content-box">
            <span class="purple-ribbon">VISION</span>
            <p class="vision-quote">
              &ldquo;To emerge as a premier learning Center of Excellence in computer technology, artificial intelligence, digital healthcare engineering, and cloud-native management technologies for sustainable societal impact.&rdquo;
            </p>
          </div>

          <!-- Mission -->
          <div class="content-box">
            <span class="purple-ribbon">MISSION</span>
            <ul class="bullet-list">
              <li class="bullet-item">
                <span class="sq-bullet"></span>
                <span>To empower student researchers to engineer high-impact AI, mobile, and cloud software systems solving critical real-world industry challenges.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet"></span>
                <span>To provide advanced research facilities and software toolchains meeting the rapid digital transformation requirements of fitness enterprises and wellness centers.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet"></span>
                <span>To enforce ethical AI principles, decentralized biometric security, and full privacy compliance with Indian DPDP Act and international GDPR frameworks.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet"></span>
                <span>To foster holistic technical leadership and professional ethics by bridging academic computer technology with live commercial implementations.</span>
              </li>
            </ul>
          </div>

          <!-- About Institute -->
          <div class="content-box">
            <span class="purple-ribbon">ABOUT INSTITUTE</span>
            <p class="para-text">
              <strong>Priyadarshini College of Engineering (PCE), Nagpur</strong>, established in 1990 under the aegis of <strong>Lokmanya Tilak Jankalyan Shikshan Sanstha (LTJSS)</strong>, is one of Maharashtra’s foremost autonomous engineering institutions. Accredited with 'A+' Grade by NAAC and recognized for academic excellence, PCE is committed to nurturing innovative engineers through state-of-the-art laboratories, industry collaboration, and interdisciplinary research. The institution fosters a dynamic, technology-driven environment encouraging students to undertake real-world challenges, societal impact projects, and national competitions under experienced faculty mentorship.
            </p>
          </div>

          <!-- About Department -->
          <div class="content-box">
            <span class="purple-ribbon">ABOUT DEPARTMENT</span>
            <p class="para-text">
              The <strong>Department of Computer Technology</strong> at PCE focuses on computational intelligence, multi-tenant cloud systems, edge computer vision, mobile app engineering, and cybersecurity. Supported by modern computing centers, AI/ML research facilities, digital library resources, and active student professional chapters (IEEE, CSI), the department fosters innovative project-based learning. Under this vibrant innovation ecosystem, the <strong>SetuGym Research Project</strong> was developed to revolutionize fitness club management through intelligent automation.
            </p>
          </div>

        </div>

        <!-- Far-Right Column -->
        <div class="p1-col-right">
          
          <!-- Objectives -->
          <div class="content-box">
            <span class="purple-ribbon">SYSTEM OBJECTIVES</span>
            <ul class="bullet-list">
              <li class="bullet-item">
                <span class="sq-bullet blue"></span>
                <span>Deliver an integrated multi-tenant management ecosystem unifying Super Admins, Gym Owners, Trainers, and Members.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet blue"></span>
                <span>Eliminate proxy attendance (&ldquo;buddy punching&rdquo;) through dynamic cryptographic time-expiring QR codes and biometric authentication.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet blue"></span>
                <span>Generate personalized workout splits and macronutrient profiles via collaborative filtering and heuristic metabolic algorithms.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet blue"></span>
                <span>Predict and prevent subscriber churn using behavioral machine learning models, enhancing gym business sustainability.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet blue"></span>
                <span>Automate financial ledger auditing, subscription renewal reminders, and push notifications via Firebase Cloud Messaging (FCM).</span>
              </li>
            </ul>
          </div>

          <!-- Technical Tracks -->
          <div class="content-box">
            <span class="purple-ribbon">TECHNICAL TRACKS &bull; ARCHITECTURE</span>
            <div class="track-grid">
              
              <!-- Track 1 -->
              <div class="track-card">
                <div class="track-title">
                  <span>Track 1: AI Recommendation &amp; Predictive Models</span>
                  <span class="track-badge">ML &bull; BIOMETRICS</span>
                </div>
                <div class="track-items">
                  <div class="track-subitem">Collaborative Filtering Engine</div>
                  <div class="track-subitem">Predictive Churn Classifier</div>
                  <div class="track-subitem">Heuristic Metabolic Calculator</div>
                  <div class="track-subitem">Dynamic Progressive Overload</div>
                </div>
              </div>

              <!-- Track 2 -->
              <div class="track-card">
                <div class="track-title">
                  <span>Track 2: Contactless Attendance &amp; Security</span>
                  <span class="track-badge">CRYPTO &bull; ENCLAVE</span>
                </div>
                <div class="track-items">
                  <div class="track-subitem">Time-Expiring Cryptographic QR</div>
                  <div class="track-subitem">Sub-500ms Check-In Latency</div>
                  <div class="track-subitem">Hardware Keystore Biometrics</div>
                  <div class="track-subitem">Anti-Proxy Punching Protocol</div>
                </div>
              </div>

              <!-- Track 3 -->
              <div class="track-card">
                <div class="track-title">
                  <span>Track 3: Multi-Tenant Cloud Architecture</span>
                  <span class="track-badge">SUPABASE &bull; RLS</span>
                </div>
                <div class="track-items">
                  <div class="track-subitem">React Native &amp; Expo Mobile</div>
                  <div class="track-subitem">PostgreSQL Row-Level Security</div>
                  <div class="track-subitem">4-Tier Role-Based Access Control</div>
                  <div class="track-subitem">DPDP Act &amp; GDPR Compliance</div>
                </div>
              </div>

              <!-- Track 4 -->
              <div class="track-card">
                <div class="track-title">
                  <span>Track 4: Automated Financial Auditing</span>
                  <span class="track-badge">FCM &bull; BILLING</span>
                </div>
                <div class="track-items">
                  <div class="track-subitem">Automated Invoice Reconciliation</div>
                  <div class="track-subitem">Real-Time FCM Push Alerts</div>
                  <div class="track-subitem">Membership Lifecycle Management</div>
                  <div class="track-subitem">Cashflow &amp; Dues Dashboards</div>
                </div>
              </div>

              <!-- Track 5 -->
              <div class="track-card">
                <div class="track-title">
                  <span>Track 5: Computer Vision &amp; IoT Telemetry</span>
                  <span class="track-badge">EDGE AI &bull; BLE</span>
                </div>
                <div class="track-items">
                  <div class="track-subitem">Real-Time Pose Estimation</div>
                  <div class="track-subitem">Automated Repetition Counting</div>
                  <div class="track-subitem">BLE Wearable Sensor Fusion</div>
                  <div class="track-subitem">Digital Twin Gym Telemetry</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Outcomes -->
          <div class="content-box">
            <span class="purple-ribbon">VALIDATED PROJECT OUTCOMES</span>
            <ul class="bullet-list">
              <li class="bullet-item">
                <span class="sq-bullet emerald"></span>
                <span><strong>98.4% Attendance Accuracy:</strong> Verified sub-500ms check-in validation speed without proxy spoofing.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet emerald"></span>
                <span><strong>92.6% Churn Prediction F1-Score:</strong> Proactive notification pipelines targeting high-attrition members.</span>
              </li>
              <li class="bullet-item">
                <span class="sq-bullet emerald"></span>
                <span><strong>42% Overhead Reduction:</strong> Full automation of manual register entries, payment receipts, and billing cycles.</span>
              </li>
            </ul>
          </div>

        </div>

      </main>
    </div>

  </div>

  <!-- ============================================================= -->
  <!-- PAGE 2: COMMITTEES, GUIDE, TEAM, SESSIONS, FEES, BANK, QRs   -->
  <!-- ============================================================= -->
  <div class="page">
    <div class="p2-container">
      
      <!-- ================= COLUMN 1 ================= -->
      <div class="p2-col">
        
        <!-- Patrons -->
        <div class="p2-card">
          <span class="purple-ribbon">PATRONS</span>
          <div class="person-entry">
            <div class="person-name">Dr. Satish Chaturvedi</div>
            <div class="person-title">Chairman, Lokmanya Tilak Jankalyan Shikshan Sanstha</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Smt. Abha Chaturvedi</div>
            <div class="person-title">Secretary, Lokmanya Tilak Jankalyan Shikshan Sanstha</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Shri. Dushyant Chaturvedi</div>
            <div class="person-title">Director (Governing Body), LTJSS</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Shri. Sheetal Chaturvedi</div>
            <div class="person-title">Trustee, Lokmanya Tilak Jankalyan Shikshan Sanstha</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. Vivek Nanoti</div>
            <div class="person-title">Director (Engineering), LTJSS, Nagpur</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. S. A. Dhale</div>
            <div class="person-title">Principal, Priyadarshini College of Engineering, Nagpur</div>
          </div>
          <div class="person-entry" style="margin-bottom: 0;">
            <div class="person-name">Dr. G. M. Asutkar</div>
            <div class="person-title">Vice Principal, Priyadarshini College of Engineering</div>
          </div>
        </div>

        <!-- Convener & Co-Convener -->
        <div class="p2-card">
          <div style="display: flex; gap: 3mm;">
            <div style="flex: 1;">
              <span class="purple-ribbon" style="font-size: 6.2pt; padding: 1.5px 6px;">CONVENER</span>
              <div class="person-name" style="font-size: 6.6pt;">Head of Department</div>
              <div class="person-title" style="font-size: 5.8pt;">Dept. of Computer Technology, PCE</div>
            </div>
            <div style="flex: 1;">
              <span class="purple-ribbon" style="font-size: 6.2pt; padding: 1.5px 6px;">CO-CONVENER</span>
              <div class="person-name" style="font-size: 6.6pt;">Senior Faculty Coord.</div>
              <div class="person-title" style="font-size: 5.8pt;">Dept. of Computer Technology, PCE</div>
            </div>
          </div>
        </div>

        <!-- Project Guide & Mentor -->
        <div class="p2-card" style="border-left: 2.5px solid #9333ea; background: #faf5ff;">
          <span class="purple-ribbon">PROJECT GUIDE &amp; RESEARCH MENTOR</span>
          <div class="person-entry" style="margin-bottom: 0;">
            <div class="person-name" style="color: #6b21a8; font-size: 7.4pt;">Dr. Jogi John</div>
            <div class="person-title" style="color: #475569; font-size: 6.3pt;">Assistant Professor, Department of Computer Technology, PCE Nagpur</div>
          </div>
        </div>

        <!-- Project Team & Core Authors -->
        <div class="p2-card" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span class="purple-ribbon">PROJECT AUTHORS &bull; SETUGYM TEAM</span>
            <div class="lead-author-grid">
              <div class="lead-author-row">
                <span class="lead-author-name">Janhavi Deshmukh</span>
                <span class="lead-author-role">Project Lead &bull; Architecture</span>
              </div>
              <div class="lead-author-row">
                <span class="lead-author-name">Aditya Mishra</span>
                <span class="lead-author-role">AI / ML Lead &bull; Algorithms</span>
              </div>
              <div class="lead-author-row">
                <span class="lead-author-name">Shraddha Yadav</span>
                <span class="lead-author-role">Mobile App &bull; UX Lead</span>
              </div>
              <div class="lead-author-row">
                <span class="lead-author-name">Divyansh Mishra</span>
                <span class="lead-author-role">Cloud Backend &bull; Security</span>
              </div>
              <div class="lead-author-row" style="border-bottom: none;">
                <span class="lead-author-name">Sonal Balbudhe</span>
                <span class="lead-author-role">Data Analytics &bull; DevOps</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 2mm; border-top: 0.5px solid #e4e4e7; padding-top: 1.5mm;">
            <div style="font-family: 'Montserrat', sans-serif; font-size: 6pt; font-weight: 800; color: #71717a; text-transform: uppercase; margin-bottom: 0.8mm;">Organizing Committee (Computer Technology)</div>
            <div class="faculty-grid">
              <div class="fac-item">Prof. P. U. Tembhare</div>
              <div class="fac-item">Dr. N. M. Thakare</div>
              <div class="fac-item">Prof. S. R. Sen</div>
              <div class="fac-item">Prof. A. S. Sambare</div>
              <div class="fac-item">Prof. R. G. Borkar</div>
              <div class="fac-item">Prof. M. P. Joshi</div>
              <div class="fac-item">Prof. S. D. Bhoyar</div>
              <div class="fac-item">Prof. N. P. Dhawale</div>
              <div class="fac-item">Prof. K. R. Ninawe</div>
              <div class="fac-item">Prof. V. G. Nasre</div>
            </div>
          </div>
        </div>

      </div>

      <!-- ================= COLUMN 2 ================= -->
      <div class="p2-col">
        
        <!-- Advisory Committee -->
        <div class="p2-card">
          <span class="purple-ribbon">ADVISORY COMMITTEE</span>
          <div class="person-entry">
            <div class="person-name">Dr. Subidh Ali</div>
            <div class="person-title">Associate Professor, Indian Institute of Technology (IIT), Bhilai</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. Sanjay Apturkar</div>
            <div class="person-title">Associate Scientist, GIS at MRSAC, Nagpur, Maharashtra</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. Gajendra Bamnote</div>
            <div class="person-title">Principal &amp; Prof., Prof. Ram Meghe Inst. of Tech. &amp; Research, Amravati</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. KTV Reddy</div>
            <div class="person-title">Dean, Faculty of Engineering &amp; Technology, Wardha</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. O.G. Kakade</div>
            <div class="person-title">Professor, VNIT (Director, IIIT Nagpur)</div>
          </div>
          <div class="person-entry">
            <div class="person-name">Dr. Rakesh Sinha</div>
            <div class="person-title">Assistant Professor, National Institute of Technology (NIT), Rourkela</div>
          </div>
          <div class="person-entry" style="margin-bottom: 0;">
            <div class="person-name">Dr. Gaurav Shrivastava</div>
            <div class="person-title">Assistant Professor, KIET (DU), Delhi-NCR, Ghaziabad</div>
          </div>
        </div>

        <!-- Keynote & Technical Sessions -->
        <div class="p2-card">
          <span class="purple-ribbon">KEYNOTE &amp; TECHNICAL SESSIONS</span>
          <div class="session-entry">
            <div class="session-badge">Session 1: AI Recommendation &amp; Health Telemetry</div>
            <div class="session-speaker">Dr. Subidh Ali, Associate Professor, IIT Bhilai</div>
          </div>
          <div class="session-entry">
            <div class="session-badge">Session 2: Cryptographic QR &amp; Zero-Trust Access</div>
            <div class="session-speaker">Dr. Sanket Joshi, Professor, St. Vincent Pallotti COE, Nagpur</div>
          </div>
          <div class="session-entry">
            <div class="session-badge">Session 3: Multi-Tenant Cloud Architecture &amp; RLS</div>
            <div class="session-speaker">Dr. Gendalal Vaidya, Assistant Professor, YCCE, Nagpur</div>
          </div>
          <div class="session-entry" style="margin-bottom: 0;">
            <div class="session-badge">Session 4: Edge Vision in Resistance Exercise Form</div>
            <div class="session-speaker">Dr. Mrudula Nimbarte, Assistant Prof., Symbiosis Inst. of Tech, Nagpur</div>
          </div>
        </div>

        <!-- Contact Details -->
        <div class="p2-card">
          <span class="purple-ribbon">CONTACT DETAILS</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; font-size: 6.2pt;">
            <div>
              <div style="font-weight: 700; color: #1e293b;">Dept. of Computer Tech.</div>
              <div style="color: #64748b;">PCE, Digdoh Hills, Nagpur</div>
            </div>
            <div>
              <div style="font-weight: 700; color: #1e293b;">Faculty Mentor</div>
              <div style="color: #64748b;">Dr. Jogi John (CT Dept)</div>
            </div>
            <div>
              <div style="font-weight: 700; color: #1e293b;">Aditya Mishra (Student)</div>
              <div style="color: #64748b;">Lead ML Researcher</div>
            </div>
            <div>
              <div style="font-weight: 700; color: #1e293b;">Janhavi Deshmukh</div>
              <div style="color: #64748b;">Lead System Architect</div>
            </div>
          </div>
          <div style="margin-top: 1.5mm; font-size: 6.2pt; border-top: 0.5px dashed #cbd5e1; padding-top: 1mm;">
            <strong>Email:</strong> <span style="color: #2563eb;">setugym.ct@pcenagpur.edu.in</span> &bull; <span style="color: #2563eb;">hod.ct@pcenagpur.edu.in</span>
          </div>
        </div>

        <!-- Guidelines For Paper Submission with QR -->
        <div class="p2-card" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span class="purple-ribbon">GUIDELINE FOR PAPER &amp; PROJECT SUBMISSION</span>
            <div style="display: flex; gap: 3mm; align-items: flex-start; margin-top: 1mm;">
              <div style="flex: 1; font-size: 6.2pt; line-height: 1.28; color: #27272a; text-align: justify;">
                <div style="font-weight: 700; color: #1e1b4b; margin-bottom: 0.8mm;">Website &amp; Research Portal Link:</div>
                <div style="color: #2563eb; font-weight: 600; font-size: 5.8pt; margin-bottom: 1mm;">www.setugym.pcenagpur.edu.in</div>
                <p>
                  The authors should strictly adhere to the IEEE format. Acceptance of research papers implies that at least one author must register and present the paper &amp; live software demonstration. There will be an <strong>Award for the Best Three Innovations</strong>. All accepted papers will be published in official Conference Proceedings. Selected papers will be recommended for publication in Scopus / UGC-CARE indexed journals.
                </p>
              </div>
              <div class="qr-thumb" style="width: 20mm; height: 20mm;">
                ${qrWebsiteSvg}
              </div>
            </div>
          </div>
          <div style="font-size: 5.7pt; color: #6b7280; font-style: italic; text-align: center; border-top: 0.5px dashed #e2e8f0; padding-top: 1mm;">
            * Peer-reviewed proceedings indexed with International Standard Book Number (ISBN).
          </div>
        </div>

      </div>

      <!-- ================= COLUMN 3 ================= -->
      <div class="p2-col">
        
        <!-- Important Dates -->
        <div class="p2-card">
          <span class="purple-ribbon">IMPORTANT DATES</span>
          <div class="date-row">
            <span class="date-event">Full Paper Submission</span>
            <span class="date-val">10 September 2026</span>
          </div>
          <div class="date-row">
            <span class="date-event">Paper &amp; Code Acceptance</span>
            <span class="date-val">25 September 2026</span>
          </div>
          <div class="date-row">
            <span class="date-event">Delegate Registration Deadline</span>
            <span class="date-val">28 September 2026</span>
          </div>
          <div class="date-row">
            <span class="date-event">Camera-Ready Paper Submission</span>
            <span class="date-val">30 September 2026</span>
          </div>
          <div class="date-row" style="border-bottom: none;">
            <span class="date-event"><strong>Conference &amp; Live Demo Days</strong></span>
            <span class="date-val" style="color: #b91c1c;">8th &ndash; 9th October 2026</span>
          </div>
        </div>

        <!-- Registration Fees Table -->
        <div class="p2-card">
          <span class="purple-ribbon">PAYMENT MODE &amp; REGISTRATION FEES</span>
          <table class="fees-table">
            <thead>
              <tr>
                <th>Participant Category</th>
                <th style="text-align: right;">Registration Fees</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>UG Students &bull; SetuGym Researchers</td>
                <td class="fee-val">&#8377; 1,000/-</td>
              </tr>
              <tr>
                <td>PG Students &bull; Research Scholars</td>
                <td class="fee-val">&#8377; 1,000/-</td>
              </tr>
              <tr>
                <td>Industry Delegates &bull; Gym Enterprise</td>
                <td class="fee-val">&#8377; 1,200/-</td>
              </tr>
              <tr>
                <td>Academia &bull; Faculty Members</td>
                <td class="fee-val">&#8377; 1,200/-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bank Details Card with UPI QR -->
        <div class="p2-card">
          <span class="purple-ribbon">BANK DETAILS (NEFT / IMPS / UPI)</span>
          <div class="bank-box-split">
            <div class="bank-info-table">
              <div class="bank-row">
                <span class="bank-label">ACCOUNT NAME:</span>
                <span class="bank-val">PCE CT RESEARCH / LTJSS</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">ACCOUNT NO:</span>
                <span class="bank-val" style="letter-spacing: 0.5px;">875620110000113</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">BANK NAME:</span>
                <span class="bank-val">BANK OF INDIA</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">BRANCH NAME:</span>
                <span class="bank-val">MIDC HINGNA ROAD</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">IFSC CODE:</span>
                <span class="bank-val">BKID0008756</span>
              </div>
              <div class="bank-row" style="margin-bottom: 0;">
                <span class="bank-label">ACCOUNT TYPE:</span>
                <span class="bank-val">CURRENT A/C</span>
              </div>
            </div>
            <div class="bank-qr-wrap" title="Scan to Pay via UPI">
              ${qrBankSvg}
            </div>
          </div>
        </div>

        <!-- Submission Link & QR -->
        <div class="qr-link-box">
          <div class="qr-thumb">
            ${qrSubmissionSvg}
          </div>
          <div class="qr-link-info">
            <div class="qr-link-title">Paper Submission Link:</div>
            <a class="qr-url-text" href="https://forms.gle/PtjTQbkoUWcKYUnRA" target="_blank">https://forms.gle/PtjTQbkoUWcKYUnRA</a>
            <div style="font-size: 5.5pt; color: #64748b; margin-top: 0.5mm;">Submit IEEE formatted paper &amp; project code</div>
          </div>
        </div>

        <!-- Registration Link & QR -->
        <div class="qr-link-box">
          <div class="qr-thumb">
            ${qrRegistrationSvg}
          </div>
          <div class="qr-link-info">
            <div class="qr-link-title">Author / Delegate Registration:</div>
            <a class="qr-url-text" href="https://forms.gle/m4aEJBTgxogWawMM6" target="_blank">https://forms.gle/m4aEJBTgxogWawMM6</a>
            <div style="font-size: 5.5pt; color: #64748b; margin-top: 0.5mm;">Register attendance &amp; live demonstration slot</div>
          </div>
        </div>

        <!-- LTJSS Brand Footer with Official PCE Logo -->
        <div class="gp-brand-box">
          <img src="data:image/png;base64,${pceLogoBase64}" alt="PCE Logo" class="gp-logo-icon">
          <div class="gp-brand-text">
            <div class="gp-corp-name">LOKMANYA TILAK JANKALYAN SHIKSHAN SANSTHA</div>
            <div class="gp-slogan-bar">PRIYADARSHINI GROUP OF INSTITUTIONS &bull; NAGPUR</div>
          </div>
        </div>

      </div>

    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('d:/gym/SetuGym_Project_Brochure.html', htmlContent);
console.log('HTML file successfully written: d:/gym/SetuGym_Project_Brochure.html');
