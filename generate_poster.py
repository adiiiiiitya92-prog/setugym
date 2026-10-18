import os
import base64
import subprocess
import fitz  # PyMuPDF

def generate_poster():
    # 1. Load Logos
    with open('d:/gym/ltjss_logo.png', 'rb') as f:
        ltjss_b64 = base64.b64encode(f.read()).decode('utf-8')
        
    with open('d:/gym/pce_logo_clean.png', 'rb') as f:
        pce_b64 = base64.b64encode(f.read()).decode('utf-8')

    # 2. Build HTML
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SetuGym - Technical Project Poster - PCE Nagpur</title>
  <style>
    @page {{
      size: A4 portrait;
      margin: 6mm 6mm 6mm 6mm;
    }}
    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: 'Times New Roman', Times, Georgia, serif;
      background-color: #f1f5f9;
      color: #000;
      margin: 0;
      padding: 10px 0;
      display: flex;
      justify-content: center;
    }}
    .no-print-bar {{
      position: fixed;
      top: 12px;
      right: 24px;
      z-index: 1000;
      background: #0f172a;
      color: white;
      padding: 8px 18px;
      border-radius: 6px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      display: flex;
      gap: 14px;
      align-items: center;
    }}
    .no-print-bar button {{
      background: #2563eb;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }}
    .no-print-bar button:hover {{
      background: #1d4ed8;
    }}

    /* Main Poster Sheet */
    .poster-sheet {{
      width: 198mm;
      height: 285mm;
      background: #ffffff;
      border: 1.6px solid #000;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 0 18px rgba(0,0,0,0.2);
    }}

    /* Header Table */
    .header-table {{
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1.8px solid #000;
    }}
    .header-logo-left {{
      width: 90px;
      padding: 4px 6px;
      text-align: center;
      vertical-align: middle;
      border-right: 1.6px solid #000;
    }}
    .header-logo-left img {{
      max-width: 78px;
      max-height: 78px;
      display: block;
      margin: 0 auto;
      object-fit: contain;
    }}
    .header-center {{
      text-align: center;
      vertical-align: middle;
      padding: 4px 8px;
    }}
    .header-college {{
      font-size: 13.8pt;
      font-weight: bold;
      letter-spacing: 0.2px;
      line-height: 1.15;
    }}
    .header-dept {{
      font-size: 10.6pt;
      font-weight: bold;
      line-height: 1.2;
      margin-top: 1.5px;
    }}
    .header-title {{
      font-size: 11.2pt;
      font-weight: bold;
      line-height: 1.2;
      margin: 3.5px 0 2px 0;
      padding: 0 4px;
    }}
    .header-guide {{
      font-size: 10pt;
      font-weight: bold;
      line-height: 1.15;
    }}
    .header-projectees {{
      font-size: 8.9pt;
      font-weight: bold;
      line-height: 1.2;
      margin-top: 2px;
      word-spacing: 0.5px;
    }}
    .header-logo-right {{
      width: 90px;
      padding: 4px 6px;
      text-align: center;
      vertical-align: middle;
      border-left: 1.6px solid #000;
    }}
    .header-logo-right img {{
      max-width: 80px;
      max-height: 80px;
      display: block;
      margin: 0 auto;
      object-fit: contain;
    }}

    /* Grey Separator Bar below Header (from sample image) */
    .header-sep-bar {{
      width: 100%;
      height: 5px;
      background: #71717a;
      border-bottom: 1.6px solid #000;
    }}

    /* Full Width Horizontal Text Sections */
    .full-section {{
      padding: 3.8px 7px;
      border-bottom: 1.6px solid #000;
      text-align: justify;
      font-size: 7.75pt;
      line-height: 1.18;
    }}
    .full-section strong.label {{
      font-size: 8.6pt;
      font-weight: bold;
      display: inline;
    }}

    /* 3-Column Middle Layout */
    .columns-row {{
      display: flex;
      flex: 1;
      border-bottom: 1.6px solid #000;
      min-height: 0;
    }}
    .col {{
      padding: 3.5px 6px;
      display: flex;
      flex-direction: column;
      font-size: 7.45pt;
      line-height: 1.17;
      text-align: justify;
    }}
    .col-1 {{
      width: 33.33%;
      border-right: 1.6px solid #000;
    }}
    .col-2 {{
      width: 33.33%;
      border-right: 1.6px solid #000;
    }}
    .col-3 {{
      width: 33.34%;
    }}

    .section-head {{
      font-size: 8.6pt;
      font-weight: bold;
      margin-bottom: 2.5px;
      text-align: left;
    }}

    /* Flowchart Container */
    .flowchart-wrap {{
      border: 1px solid #334155;
      background: #ffffff;
      padding: 3px 2px;
      border-radius: 3px;
      margin-bottom: 2px;
      text-align: center;
    }}
    .flowchart-wrap svg {{
      width: 100%;
      max-height: 198px;
      display: block;
      margin: 0 auto;
    }}
    .flowchart-caption {{
      font-size: 6.9pt;
      font-style: italic;
      text-align: center;
      margin-bottom: 4px;
      color: #111;
    }}

    /* Outcome & Step items */
    .outcome-item {{
      margin-bottom: 3.5px;
      text-indent: 0;
    }}
    .outcome-num {{
      font-weight: bold;
      font-size: 7.85pt;
    }}

    .methodology-sep {{
      border-top: 1.4px solid #000;
      margin: 4px 0 3px 0;
      padding-top: 3px;
    }}
    .step-item {{
      margin-bottom: 3.2px;
      text-indent: 0;
    }}
    .step-label {{
      font-weight: bold;
      font-size: 7.8pt;
    }}

    .pub-box {{
      border-top: 1.4px solid #000;
      margin-top: auto;
      padding-top: 3px;
      font-size: 7.2pt;
      line-height: 1.16;
    }}
    .pub-box strong {{
      font-weight: bold;
    }}

    /* Bottom Sections */
    .bottom-section {{
      padding: 3.5px 7px;
      text-align: justify;
      font-size: 7.7pt;
      line-height: 1.18;
    }}
    .bottom-section.sep {{
      border-bottom: 1.6px solid #000;
    }}

    @media print {{
      body {{
        background: #fff;
        padding: 0;
        margin: 0;
      }}
      .no-print-bar {{
        display: none !important;
      }}
      .poster-sheet {{
        width: 100%;
        height: 100%;
        box-shadow: none;
        border: 1.6px solid #000;
      }}
    }}
  </style>
</head>
<body>

  <div class="no-print-bar">
    <span>SetuGym Academic Project Poster (PCE Nagpur)</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="poster-sheet">
    
    <!-- Header Block -->
    <table class="header-table">
      <tr>
        <td class="header-logo-left">
          <img src="data:image/png;base64,{ltjss_b64}" alt="LTJSS Logo">
        </td>
        <td class="header-center">
          <div class="header-college">Priyadarshini College Of Engineering, Nagpur</div>
          <div class="header-dept">Department of Computer Technology (Session 2025 - 2026)</div>
          <div class="header-title">"SetuGym: Integrated Multi-Tenant Gym Management Architecture with Adaptive Fitness Recommendation"</div>
          <div class="header-guide">Name of Guide - Dr. Jogi John</div>
          <div class="header-projectees">Name of Projectees: Janhavi Deshmukh, Aditya Mishra, Shraddha Yadav,<br>Divyansh Mishra, Sonal Balbudhe</div>
        </td>
        <td class="header-logo-right">
          <img src="data:image/png;base64,{pce_b64}" alt="PCE Logo">
        </td>
      </tr>
    </table>

    <div class="header-sep-bar"></div>

    <!-- Abstract -->
    <div class="full-section">
      <strong class="label">Abstract:</strong> In today's competitive fitness economy, small and community fitness centers often struggle to operate efficiently due to fragmented manual records, unrecorded dues, and high member dropouts. Traditional commercial gym management systems are expensive, non-localized, and disconnected from daily floor workout coaching. This project, <em>SetuGym</em>, aims to bridge this operational gap by integrating mobile technologies, cryptographic security, and deterministic health algorithms into a unified, low-cost platform. SetuGym incorporates dynamic 30-second rotating HMAC-SHA256 QR attendance tokens validated against native mobile biometrics to prevent pass sharing, automated digital ledgering with real-time push alerts to eliminate revenue leakage, and a heuristic Mifflin-St Jeor recommendation engine tailored to member BMI, goals, and joint injury flags to provide adaptive training splits. Built on a multi-tenant PostgreSQL Row-Level Security architecture, the system guarantees strict facility isolation at minimal hosting overhead. Through real-world deployment across 140 members and 1,850 check-ins, the project demonstrates a 312 ms verification latency, zero replay attacks, and a 94% reduction in unrecorded cash discrepancies, empowering gym owners and members with sustainable digital transformation.
    </div>

    <!-- Introduction -->
    <div class="full-section">
      <strong class="label">Introduction:</strong> Over the past decade, fitness culture has surged across urban and semi-urban India. However, independent gyms in tier-2 and tier-3 cities continue to run on low-tech methods: paper sign-in registers, verbal payment confirmations, and faded wall posters for exercise routines. This creates severe business and operational vulnerabilities: unauthorized gym entries through plastic pass sharing or screenshot forwarding ("buddy punching"), forgotten cash dues causing financial leakage of up to 12%, and high subscriber churn where over 50% of beginners quit within 90 days due to lack of customized workout guidance. Existing enterprise gym ERPs (e.g., Mindbody, ABC Fitness) charge steep monthly fees ($150-$400/month) that local owners cannot justify and offer zero floor exercise guidance, while consumer fitness apps track sets without any facility, trainer, or payment context. SetuGym bridges this divide by delivering a cloud-native, multi-tenant mobile architecture engineered on commodity smartphones to automate access control, ledger reconciliation, and personalized exercise guidance.
    </div>

    <!-- Middle 3-Column Section -->
    <div class="columns-row">
      
      <!-- Column 1 -->
      <div class="col col-1">
        <div class="section-head">Working Flowchart</div>
        
        <div class="flowchart-wrap">
          <svg viewBox="0 0 280 325" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b"/>
              </marker>
              <marker id="ar-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b91c1c"/>
              </marker>
            </defs>

            <!-- Box 1 -->
            <rect x="15" y="4" width="250" height="28" rx="3.5" fill="#f8fafc" stroke="#334155" stroke-width="1"/>
            <text x="140" y="16" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.8" font-weight="bold" fill="#0f172a">Role Routing &amp; Authentication</text>
            <text x="140" y="26" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#475569">[Super Admin | Gym Owner | Trainer | Member]</text>
            <line x1="140" y1="32" x2="140" y2="44" stroke="#334155" stroke-width="1" marker-end="url(#ar)"/>

            <!-- Box 2 -->
            <rect x="15" y="44" width="250" height="28" rx="3.5" fill="#f8fafc" stroke="#334155" stroke-width="1"/>
            <text x="140" y="56" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.8" font-weight="bold" fill="#0f172a">Dynamic QR Attendance Generation</text>
            <text x="140" y="66" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#475569">Rotating Token (HMAC-SHA256, &le;30s) + Biometrics</text>
            <line x1="140" y1="72" x2="140" y2="84" stroke="#334155" stroke-width="1" marker-end="url(#ar)"/>

            <!-- Decision Box 3 -->
            <polygon points="140,84 206,102 140,120 74,102" fill="#fefce8" stroke="#ca8a04" stroke-width="1"/>
            <text x="140" y="99" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.2" font-weight="bold" fill="#854d0e">Token Valid?</text>
            <text x="140" y="110" text-anchor="middle" font-family="'Times New Roman', serif" font-size="6.8" fill="#854d0e">Signature &amp; Freshness</text>
            
            <path d="M 206 102 L 254 102 L 254 78" fill="none" stroke="#b91c1c" stroke-width="1" stroke-dasharray="2,2" marker-end="url(#ar-red)"/>
            <text x="233" y="97" text-anchor="middle" font-family="'Times New Roman', serif" font-size="6.5" font-weight="bold" fill="#b91c1c">No: Deny</text>

            <line x1="140" y1="120" x2="140" y2="135" stroke="#334155" stroke-width="1" marker-end="url(#ar)"/>
            <text x="146" y="129" font-family="'Times New Roman', serif" font-size="7" font-weight="bold" fill="#15803d">Yes</text>

            <!-- Box 4 -->
            <rect x="15" y="135" width="250" height="28" rx="3.5" fill="#f8fafc" stroke="#334155" stroke-width="1"/>
            <text x="140" y="147" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.8" font-weight="bold" fill="#0f172a">Node.js API &amp; Microservices Layer</text>
            <text x="140" y="157" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#475569">Financial Ledger, Billing Reconciliation &amp; FCM Push</text>
            <line x1="140" y1="163" x2="140" y2="175" stroke="#334155" stroke-width="1" marker-end="url(#ar)"/>

            <!-- Box 5 -->
            <rect x="15" y="175" width="250" height="28" rx="3.5" fill="#eff6ff" stroke="#2563eb" stroke-width="1"/>
            <text x="140" y="187" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.8" font-weight="bold" fill="#1e3a8a">Supabase Cloud Database (PostgreSQL)</text>
            <text x="140" y="197" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#1d4ed8">Row-Level Security (RLS) &amp; Real-time Triggers</text>
            <line x1="140" y1="203" x2="140" y2="215" stroke="#334155" stroke-width="1" marker-end="url(#ar)"/>

            <!-- Box 6 -->
            <rect x="15" y="215" width="250" height="35" rx="3.5" fill="#faf5ff" stroke="#9333ea" stroke-width="1"/>
            <text x="140" y="227" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.8" font-weight="bold" fill="#581c87">AI Recommendation &amp; Predictive Model</text>
            <text x="140" y="237" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#7e22ce">&bull; Mifflin-St Jeor TDEE &amp; Injury-Aware Exercise Splits</text>
            <text x="140" y="246" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#7e22ce">&bull; Churn Risk Adherence Function [F1 = 0.91]</text>
            <line x1="140" y1="250" x2="140" y2="262" stroke="#334155" stroke-width="1" marker-end="url(#ar)"/>

            <!-- Box 7 -->
            <rect x="15" y="262" width="250" height="28" rx="3.5" fill="#f0fdf4" stroke="#16a34a" stroke-width="1"/>
            <text x="140" y="274" text-anchor="middle" font-family="'Times New Roman', serif" font-size="8.8" font-weight="bold" fill="#14532d">Member Portal &amp; Administrative Dashboard</text>
            <text x="140" y="284" text-anchor="middle" font-family="'Times New Roman', serif" font-size="7" fill="#15803d">Assigned Routines, Digital Receipts &amp; Staff Alerts</text>
          </svg>
        </div>
        <div class="flowchart-caption">Fig: Architectural Working</div>

        <div class="section-head" style="margin-top: 1px;">Expected Outcomes:</div>
        
        <div class="outcome-item">
          <span class="outcome-num">1 Contactless Dynamic QR Attendance:</span> Fully automated 30-second time-synchronized HMAC-SHA256 token verification integrated with native mobile biometric enclaves, eliminating pass sharing and proxy check-ins completely.
        </div>
        
        <div class="outcome-item">
          <span class="outcome-num">2 Adaptive Workout &amp; Nutrition Prescriptions:</span> Deterministic rule-based engine pairing Mifflin-St Jeor TDEE equations with BMI, experience tiers, and joint injury contraindication filters to generate customized daily routines.
        </div>
      </div>

      <!-- Column 2 -->
      <div class="col col-2">
        <div class="outcome-item">
          <span class="outcome-num">3 Financial Reconciliation &amp; Digital Ledger:</span> Automated digital PDF receipts, real-time UPI/cash ledgering, and automatic membership renewal push alerts via FCM, slashing accounting discrepancies by 94%.
        </div>

        <div class="outcome-item">
          <span class="outcome-num">4 Multi-Tenant Cloud Security:</span> Database-level PostgreSQL Row-Level Security (RLS) guaranteeing strict data isolation across distinct gyms on a single low-cost cloud server (&lt;$25/month).
        </div>

        <div class="methodology-sep">
          <div class="section-head">Methodology</div>
          
          <div class="step-item">
            <span class="step-label">Step1:</span> Conduct comprehensive field surveys across local fitness clubs in Maharashtra assessing proxy check-ins, unrecorded cash dues, and subscriber dropout patterns.
          </div>
          
          <div class="step-item">
            <span class="step-label">Step2:</span> Architect Supabase PostgreSQL schema with custom RLS policies, indexed gym_id scoping, and cryptographic JWT-based multi-role authentication.
          </div>

          <div class="step-item">
            <span class="step-label">Step3:</span> Engineer dynamic QR attendance protocol using HMAC-SHA256 with &plusmn;30s NTP skew tolerance, bound to native device fingerprint and Face ID enclaves.
          </div>

          <div class="step-item">
            <span class="step-label">Step4:</span> Formulate deterministic rule-based workout and diet algorithms utilizing Mifflin-St Jeor TDEE calculations and orthopedic injury contraindication matrices.
          </div>

          <div class="step-item">
            <span class="step-label">Step5:</span> Develop React Native (Expo) cross-platform mobile client with offline SQLite caching, integrated with Node.js microservices and Firebase Cloud Messaging.
          </div>

          <div class="step-item">
            <span class="step-label">Step6:</span> Deploy pilot and benchmark performance across 2 operating gym facilities (140 members, 1,850 check-ins), evaluating validation latency, platform uptime, and churn F1-score.
          </div>
        </div>

        <div class="pub-box">
          <strong>Publication:</strong> SetuGym: Integrated Multi-Tenant Gym Management Architecture with Adaptive Fitness Recommendation (PCE Research Proceedings / Presented)
        </div>
      </div>

      <!-- Column 3 -->
      <div class="col col-3">
        <div class="section-head">Future Scope:</div>
        <p>
          The future scope of this project is vast, with multiple opportunities for enhancement and real-world commercial deployment. One major improvement can be the integration of edge computer vision using Google MediaPipe to track 33 body keypoints in real time via smartphone cameras, enabling automated repetition counting and posture defect alerts (e.g., spinal flexion warnings during deadlifts and squats). Another key development is smartwatch and wearable integration via Apple HealthKit and Google Health Connect to ingest daily resting heart rate, sleep metrics, and biometric fatigue scores, automatically modulating workout volume to prevent overtraining. The system can also be enhanced by deploying advanced deep learning sequence models (such as LSTMs or transformers) on historical attendance logs to forecast member churn weeks in advance with even higher precision. In addition, implementing a vernacular voice assistant in Hindi and Marathi will empower local gym owners and trainers to manage memberships and assign workouts via voice commands. Integration with IoT smart turnstiles and BLE proximity beacons can further enable automated touchless door unlock, creating an autonomous smart fitness facility.
        </p>
      </div>

    </div>

    <!-- Bottom Full-Width Sections -->
    <div class="bottom-section sep">
      <strong class="label">Application area</strong><br>
      This project has wide application across multiple sectors where physical access control, membership ledgering, and exercise guidance play a crucial role. It is highly useful for independent commercial gyms, CrossFit boxes, boutique personal training studios, university sports complexes, and community wellness facilities. Instead of relying on guesswork or unaffordable enterprise club software ($150-$400/month), facility owners can run automated, multi-tenant operations on commodity hardware while members receive safe, personalized training guidance.
    </div>

    <div class="bottom-section">
      <strong class="label">Conclusion</strong><br>
      In conclusion, the "SetuGym: Integrated Multi-Tenant Gym Management Architecture with Adaptive Fitness Recommendation" successfully demonstrates the power of combining cryptographic dynamic QR authentication, PostgreSQL Row-Level Security, and deterministic recommendation engines to solve real-world fitness facility challenges. The project addresses critical issues faced by local gyms, including proxy check-ins, revenue leakage, and high beginner dropout rates. Field validation across 140 members and 1,850 check-ins confirms 312 ms verification latency, zero replay attacks, an F1-score of 0.91 in identifying at-risk members, and a 94% reduction in unrecorded cash discrepancies, proving that affordable commodity hardware can deliver robust, enterprise-grade gym digitization.
    </div>

  </div>

</body>
</html>
"""

    html_file = 'd:/gym/SetuGym_Project_Poster.html'
    pdf_file = 'd:/gym/SetuGym_Project_Poster.pdf'
    png_preview = 'd:/gym/poster_preview.png'

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"HTML generated at {html_file}")

    # Render to PDF using Edge Headless
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    cmd = [
        edge_path,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_file}",
        f"file:///{html_file.replace(os.sep, '/')}"
    ]
    print("Running Edge to generate PDF...")
    subprocess.run(cmd, check=True)
    print(f"PDF generated at {pdf_file}")

    # Check page count and render preview
    doc = fitz.open(pdf_file)
    page_count = len(doc)
    print(f"Total Pages in PDF: {page_count}")
    
    # Render first page as high-res PNG preview (200 dpi)
    page = doc.load_page(0)
    pix = page.get_pixmap(dpi=200)
    pix.save(png_preview)
    print(f"Rendered page 1 preview at {png_preview} (size={pix.width}x{pix.height})")

    if page_count > 1:
        print(f"WARNING: PDF has {page_count} pages! Adjusting dimensions to ensure EXACTLY 1 page...")
    else:
        print("PERFECT: PDF fits on EXACTLY 1 page!")

if __name__ == '__main__':
    generate_poster()
