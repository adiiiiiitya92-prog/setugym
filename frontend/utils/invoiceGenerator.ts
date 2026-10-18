import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Invoice, Gym, Member } from '../types';
import { formatDate } from './dateHelper';
import { getCurrencySymbol } from './currencyHelper';

export const generateInvoicePDF = async (
  invoice: Invoice,
  gym: Gym,
  member?: Member
): Promise<{ success: boolean; error?: string; fallbackToLink?: boolean; pdfUri?: string }> => {
  try {
    // Select status watermark color and label
    const isPaid = invoice.status === 'paid';
    const watermarkText = isPaid ? 'PAID' : 'UNPAID';
    const watermarkColor = isPaid ? '#00C896' : '#FF6B35';
    
    // Resolve dynamic currency symbol
    const currencySymbol = getCurrencySymbol(invoice.currency);

    // HTML template rendered as string with styled invoice details
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SetuGym Invoice - ${invoice.invoiceNo}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0F0F1A;
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            position: relative;
          }
          .watermark {
            position: absolute;
            top: 35%;
            left: 20%;
            transform: rotate(-30deg);
            font-size: 110px;
            font-weight: 900;
            color: ${watermarkColor};
            opacity: 0.12;
            z-index: 999;
            pointer-events: none;
            letter-spacing: 12px;
          }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #F5F5F5;
            padding-bottom: 25px;
            margin-bottom: 30px;
          }
          .logo {
            width: 70px;
            height: 70px;
            border-radius: 16px;
            background-color: #6C47FF;
            object-fit: cover;
          }
          .gym-details {
            font-size: 13px;
            color: #6B7280;
            line-height: 1.5;
            text-align: right;
          }
          .gym-name {
            font-size: 20px;
            font-weight: bold;
            color: #6C47FF;
            margin-bottom: 4px;
          }
          .bill-to-table {
            width: 100%;
            margin-bottom: 40px;
          }
          .bill-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #6B7280;
            letter-spacing: 1px;
            margin-bottom: 6px;
          }
          .bill-details {
            font-size: 14px;
            line-height: 1.5;
          }
          .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .item-table th {
            border-bottom: 2px solid #EEEEEE;
            padding: 10px 0;
            text-align: left;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #6B7280;
          }
          .item-table td {
            border-bottom: 1px solid #F3F4F6;
            padding: 15px 0;
            font-size: 13px;
          }
          .summary-table {
            width: 320px;
            float: right;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .summary-table td {
            padding: 8px 0;
            font-size: 13px;
            color: #4B5563;
          }
          .total-row td {
            font-size: 18px;
            font-weight: bold;
            color: #6C47FF;
            border-top: 2px solid #6C47FF;
            padding-top: 12px;
          }
          .footer {
            clear: both;
            text-align: center;
            padding-top: 50px;
            border-top: 1px solid #EEEEEE;
            font-size: 12px;
            color: #9CA3AF;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="watermark">${watermarkText}</div>
          
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td>
                ${gym.logoUrl ? `
                  <img src="${gym.logoUrl}" class="logo" />
                ` : `
                  <div class="logo" style="display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">SG</div>
                `}
              </td>
              <td class="gym-details">
                <div class="gym-name">${gym.name}</div>
                <div>${gym.addressLine1}</div>
                ${gym.addressLine2 ? `<div>${gym.addressLine2}</div>` : ''}
                <div>${gym.city}, ${gym.state} - ${gym.pin}</div>
                <div>Phone: ${gym.phone} | Email: ${gym.email}</div>
                ${gym.gstNumber ? `<div>GSTIN: <b>${gym.gstNumber}</b></div>` : ''}
              </td>
            </tr>
          </table>

          <!-- Bill To and Invoice details -->
          <table class="bill-to-table">
            <tr>
              <td style="width: 50%;">
                <div class="bill-title">Client Billing Profile</div>
                <div class="bill-details">
                  <b>${invoice.memberName}</b><br>
                  Email: ${member?.email || 'N/A'}<br>
                  Phone: ${member?.phone || 'N/A'}
                </div>
              </td>
              <td style="width: 50%; text-align: right; vertical-align: top;">
                <div class="bill-title">Statement Receipt</div>
                <div class="bill-details">
                  Invoice Number: <b>${invoice.invoiceNo}</b><br>
                  Issued Date: ${formatDate(invoice.date, "PP")}<br>
                  Due Settlement: <b>${formatDate(invoice.dueDate, "PP")}</b>
                </div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <table class="item-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>Membership Plan: ${invoice.planName}</b><br>
                  <span style="font-size: 11px; color: #6B7280;">Access rights to training facilities and basic amenities</span>
                </td>
                <td style="text-align: right; font-weight: bold;">${currencySymbol}${invoice.subtotal.toFixed(2)}</td>
              </tr>
              ${invoice.addOns > 0 ? `
              <tr>
                <td><b>Custom Add-Ons</b><br><span style="font-size: 11px; color: #6B7280;">Locker or private training amenities</span></td>
                <td style="text-align: right; font-weight: bold;">${currencySymbol}${invoice.addOns.toFixed(2)}</td>
              </tr>` : ''}
            </tbody>
          </table>

          <!-- Summary list -->
          <table class="summary-table">
            <tr>
              <td>Subtotal</td>
              <td style="text-align: right; font-weight: bold;">${currencySymbol}${invoice.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>GST (18%)</td>
              <td style="text-align: right; font-weight: bold;">${currencySymbol}${invoice.tax.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td>Total</td>
              <td style="text-align: right;">${currencySymbol}${invoice.total.toFixed(2)}</td>
            </tr>
          </table>

          ${invoice.hasInstallments ? `
          <div style="clear: both; margin-top: 20px; border-top: 1px dashed #E5E7EB; padding-top: 15px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #6B7280; letter-spacing: 1px; margin-bottom: 8px;">Installment Schedule</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #F3F4F6; height: 32px;">
                <td>1st Installment</td>
                <td style="text-align: right; font-weight: bold;">${currencySymbol}${invoice.firstInstallmentAmount?.toFixed(2)}</td>
                <td style="text-align: right; color: ${invoice.firstInstallmentStatus === 'paid' ? '#00C896' : '#FF6B35'}; font-weight: bold; width: 100px;">${invoice.firstInstallmentStatus?.toUpperCase()}</td>
              </tr>
              <tr style="height: 32px;">
                <td>
                  2nd Installment
                  ${invoice.secondInstallmentDueDate ? `<span style="font-size: 11px; color: #6B7280; margin-left: 8px;">(Due: ${formatDate(invoice.secondInstallmentDueDate, "PP")})</span>` : ''}
                </td>
                <td style="text-align: right; font-weight: bold;">${currencySymbol}${invoice.secondInstallmentAmount?.toFixed(2)}</td>
                <td style="text-align: right; color: ${invoice.secondInstallmentStatus === 'paid' ? '#00C896' : '#FF6B35'}; font-weight: bold; width: 100px;">${invoice.secondInstallmentStatus?.toUpperCase()}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <!-- Footer terms and thank you -->
          <div class="footer">
            <div>Thank you for training with us! Your commitment to health inspires our platform.</div>
            <div style="margin-top: 6px; font-weight: bold;">${gym.name} © 2026. Powered by SetuGym.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Use printAsync on web as Sharing is not available
    if (Platform.OS === 'web') {
      await Print.printAsync({ html: htmlTemplate });
      return { success: true };
    }

    // Write file using printToFileAsync
    const { uri } = await Print.printToFileAsync({ html: htmlTemplate });

    // Open native sharing drawer
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `Share Invoice ${invoice.invoiceNo}`
      });
      return { success: true };
    } else {
      return { success: false, fallbackToLink: true, pdfUri: uri, error: "Sharing is not supported on this simulator device." };
    }
  } catch (e) {
    console.error("PDF generation failure", e);
    return { success: false, error: "System failed to build PDF invoice document." };
  }
};
