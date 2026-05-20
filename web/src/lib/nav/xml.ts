import type { NavInvoiceData, NavLineItem } from './types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmt(num: number): string {
  return num.toFixed(2);
}

interface ParsedAddress {
  countryCode: string;
  postalCode: string;
  city: string;
  streetName: string;
  publicPlaceCategory: string;
  number: string;
}

/**
 * Attempts to parse a Hungarian address string.
 * Expected patterns:
 *   "1234 Budapest, Teszt utca 1."
 *   "Budapest, Teszt utca 1."
 * Falls back to putting the whole string in streetName.
 */
function parseHungarianAddress(address: string): ParsedAddress {
  const fallback: ParsedAddress = {
    countryCode: 'HU',
    postalCode: '1234',
    city: '',
    streetName: escapeXml(address),
    publicPlaceCategory: 'utca',
    number: '1',
  };

  // Try: "NNNN City, Street type number"
  const fullPattern = /^(\d{4})\s+([^,]+),\s*(.+?)\s+(utca|út|tér|köz|sor|körút|sugárút|fasor|dűlő|dűlőút|liget|park|rakpart|sétány|lépcső|átjáró)\s+(\S+)$/i;
  const fullMatch = address.match(fullPattern);
  if (fullMatch) {
    return {
      countryCode: 'HU',
      postalCode: fullMatch[1],
      city: escapeXml(fullMatch[2].trim()),
      streetName: escapeXml(fullMatch[3].trim()),
      publicPlaceCategory: fullMatch[4].toLowerCase(),
      number: escapeXml(fullMatch[5].replace(/\.$/, '')),
    };
  }

  // Try: "City, Street type number" (no postal code)
  const noPostalPattern = /^([^,]+),\s*(.+?)\s+(utca|út|tér|köz|sor|körút|sugárút|fasor|dűlő|dűlőút|liget|park|rakpart|sétány|lépcső|átjáró)\s+(\S+)$/i;
  const noPostalMatch = address.match(noPostalPattern);
  if (noPostalMatch) {
    return {
      countryCode: 'HU',
      postalCode: '1234',
      city: escapeXml(noPostalMatch[1].trim()),
      streetName: escapeXml(noPostalMatch[2].trim()),
      publicPlaceCategory: noPostalMatch[3].toLowerCase(),
      number: escapeXml(noPostalMatch[4].replace(/\.$/, '')),
    };
  }

  return fallback;
}

function parseTaxNumber(taxNumber: string): {
  taxpayerId: string;
  vatCode: string;
  countyCode: string;
} {
  // Format: 12345678-1-11
  const parts = taxNumber.replace(/-/g, '');
  return {
    taxpayerId: parts.slice(0, 8) || taxNumber,
    vatCode: parts.slice(8, 9) || '1',
    countyCode: parts.slice(9, 11) || '11',
  };
}

function renderAddress(address: string): string {
  const a = parseHungarianAddress(address);
  return `<detailedAddress>
              <countryCode>${a.countryCode}</countryCode>
              <postalCode>${a.postalCode}</postalCode>
              <city>${a.city}</city>
              <streetName>${a.streetName}</streetName>
              <publicPlaceCategory>${escapeXml(a.publicPlaceCategory)}</publicPlaceCategory>
              <number>${a.number}</number>
            </detailedAddress>`;
}

interface VatGroup {
  vatRate: number; // -1 means AAM/exempt
  netAmount: number;
  vatAmount: number;
}

function groupByVat(items: NavLineItem[]): VatGroup[] {
  const map = new Map<number, VatGroup>();
  for (const item of items) {
    const net = item.quantity * item.unitPrice;
    const rate = item.vatRate;
    const vatAmount = rate > 0 ? net * (rate / 100) : 0;
    const existing = map.get(rate);
    if (existing) {
      existing.netAmount += net;
      existing.vatAmount += vatAmount;
    } else {
      map.set(rate, { vatRate: rate, netAmount: net, vatAmount });
    }
  }
  return Array.from(map.values());
}

function renderLine(item: NavLineItem, isAAM: boolean): string {
  const net = item.quantity * item.unitPrice;
  const vatRate = item.vatRate;
  const vatAmount = vatRate > 0 && !isAAM ? net * (vatRate / 100) : 0;
  const gross = net + vatAmount;

  const vatBlock =
    isAAM || vatRate < 0
      ? `<vatExemption>
              <case>${escapeXml(item.vatExemptionReason ?? 'TAM')}</case>
            </vatExemption>`
      : `<vatPercentage>${fmt(vatRate / 100)}</vatPercentage>`;

  return `        <line>
          <lineNumber>${item.lineNumber}</lineNumber>
          <lineDescription>${escapeXml(item.description)}</lineDescription>
          <quantity>${fmt(item.quantity)}</quantity>
          <unitOfMeasureOwn>${escapeXml(item.unit)}</unitOfMeasureOwn>
          <unitPrice>${fmt(item.unitPrice)}</unitPrice>
          ${vatBlock}
          <lineNetAmount>${fmt(net)}</lineNetAmount>
          <lineVatAmount>${fmt(vatAmount)}</lineVatAmount>
          <lineGrossAmount>${fmt(gross)}</lineGrossAmount>
        </line>`;
}

function renderSummary(groups: VatGroup[], isAAM: boolean, totalNet: number, totalVat: number, totalGross: number): string {
  if (isAAM) {
    // For AAM invoices use summarySimplified or summaryGrossData approach;
    // NAV 3.0 allows summaryNormal with vatExemption per rate group
    const vatRateBlocks = groups
      .map(
        (g) => `      <summaryByVatRate>
          <vatRate>
            <vatExemption>
              <case>TAM</case>
            </vatExemption>
          </vatRate>
          <vatNetAmount>${fmt(g.netAmount)}</vatNetAmount>
          <vatAmount>${fmt(0)}</vatAmount>
        </summaryByVatRate>`,
      )
      .join('\n');

    return `    <invoiceSummary>
      <summaryNormal>
${vatRateBlocks}
        <invoiceNetAmount>${fmt(totalNet)}</invoiceNetAmount>
        <invoiceVatAmount>${fmt(0)}</invoiceVatAmount>
      </summaryNormal>
      <invoiceGrossAmount>${fmt(totalNet)}</invoiceGrossAmount>
    </invoiceSummary>`;
  }

  const vatRateBlocks = groups
    .map(
      (g) => `        <summaryByVatRate>
          <vatRate>
            <vatPercentage>${fmt(g.vatRate / 100)}</vatPercentage>
          </vatRate>
          <vatNetAmount>${fmt(g.netAmount)}</vatNetAmount>
          <vatAmount>${fmt(g.vatAmount)}</vatAmount>
        </summaryByVatRate>`,
    )
    .join('\n');

  return `    <invoiceSummary>
      <summaryNormal>
${vatRateBlocks}
        <invoiceNetAmount>${fmt(totalNet)}</invoiceNetAmount>
        <invoiceVatAmount>${fmt(totalVat)}</invoiceVatAmount>
      </summaryNormal>
      <invoiceGrossAmount>${fmt(totalGross)}</invoiceGrossAmount>
    </invoiceSummary>`;
}

export function generateNavInvoiceXml(data: NavInvoiceData): string {
  const { supplier, customer, items, isAAM = false } = data;
  const supplierTax = parseTaxNumber(supplier.taxNumber);

  const groups = groupByVat(items);
  const totalNet = groups.reduce((s, g) => s + g.netAmount, 0);
  const totalVat = isAAM ? 0 : groups.reduce((s, g) => s + g.vatAmount, 0);
  const totalGross = totalNet + totalVat;

  const bankAccountBlock = supplier.bankAccountNumber
    ? `          <bankAccountNumber>${escapeXml(supplier.bankAccountNumber)}</bankAccountNumber>`
    : '';

  const customerTaxBlock = customer.taxNumber
    ? `          <customerTaxNumber>
            <taxpayerId>${escapeXml(parseTaxNumber(customer.taxNumber).taxpayerId)}</taxpayerId>
            <vatCode>${escapeXml(parseTaxNumber(customer.taxNumber).vatCode)}</vatCode>
            <countyCode>${escapeXml(parseTaxNumber(customer.taxNumber).countyCode)}</countyCode>
          </customerTaxNumber>`
    : '';

  const linesXml = items.map((item) => renderLine(item, isAAM)).join('\n');
  const summaryXml = renderSummary(groups, isAAM, totalNet, totalVat, totalGross);

  return `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceData xmlns="http://schemas.nav.gov.hu/OSA/3.0/data"
             xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common"
             xmlns:base="http://schemas.nav.gov.hu/OSA/3.0/base">
  <invoiceNumber>${escapeXml(data.invoiceNumber)}</invoiceNumber>
  <invoiceIssueDate>${escapeXml(data.invoiceIssueDate)}</invoiceIssueDate>
  <completenessIndicator>false</completenessIndicator>
  <invoiceMain>
    <invoice>
      <invoiceHead>
        <supplierInfo>
          <supplierTaxNumber>
            <taxpayerId>${escapeXml(supplierTax.taxpayerId)}</taxpayerId>
            <vatCode>${escapeXml(supplierTax.vatCode)}</vatCode>
            <countyCode>${escapeXml(supplierTax.countyCode)}</countyCode>
          </supplierTaxNumber>
          <supplierName>${escapeXml(supplier.name)}</supplierName>
          <supplierAddress>
            ${renderAddress(supplier.address)}
          </supplierAddress>
${bankAccountBlock}
        </supplierInfo>
        <customerInfo>
          <customerVatStatus>${customer.taxNumber ? 'DOMESTIC' : 'PRIVATE_PERSON'}</customerVatStatus>
${customerTaxBlock}
          <customerName>${escapeXml(customer.name)}</customerName>
          <customerAddress>
            ${renderAddress(customer.address)}
          </customerAddress>
        </customerInfo>
        <invoiceDetail>
          <invoiceCategory>NORMAL</invoiceCategory>
          <invoiceDeliveryDate>${escapeXml(data.invoiceDeliveryDate)}</invoiceDeliveryDate>
          <paymentDate>${escapeXml(data.paymentDate)}</paymentDate>
          <paymentMethod>${escapeXml(data.paymentMethod)}</paymentMethod>
          <invoiceAppearance>${escapeXml(data.invoiceAppearance)}</invoiceAppearance>
          <selfBillingIndicator>${data.isSelfBilled ? 'true' : 'false'}</selfBillingIndicator>
        </invoiceDetail>
      </invoiceHead>
      <invoiceLines>
${linesXml}
      </invoiceLines>
${summaryXml}
    </invoice>
  </invoiceMain>
</InvoiceData>`;
}
