// NAV Online Számla 3.0 XML generator
// Dokumentáció: https://onlineszamla.nav.gov.hu

export interface NavInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  fulfillmentDate?: string;
  paymentDate: string;
  paymentMethod: 'TRANSFER' | 'CASH' | 'CARD';
  seller: {
    taxNumber: string;
    name: string;
    address: string;
    zipCode: string;
    city: string;
    countryCode?: string;
  };
  buyer?: {
    taxNumber?: string;
    name: string;
    address: string;
    zipCode: string;
    city: string;
    countryCode?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }>;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  isVatExempt?: boolean;
}

export const generateNavXml = (data: NavInvoiceData): string => {
  const invoiceLines = data.items.map((item, idx) => `
    <invoiceLine>
      <lineNumber>${idx + 1}</lineNumber>
      <lineDescription>${escapeXml(item.description)}</lineDescription>
      <quantity>${item.quantity}</quantity>
      <unitOfMeasureOwn>${item.unit}</unitOfMeasureOwn>
      <unitPrice>${item.unitPrice.toFixed(2)}</unitPrice>
      <lineNetAmountData>
        <lineNetAmount>${item.netAmount.toFixed(2)}</lineNetAmount>
        <lineNetAmountHUF>${item.netAmount.toFixed(2)}</lineNetAmountHUF>
      </lineNetAmountData>
      <lineVatRate>
        ${data.isVatExempt
          ? '<vatExemption><case>TAM</case><reason>Alanyi adómentesség</reason></vatExemption>'
          : `<vatPercentage>${item.vatRate}</vatPercentage>`
        }
      </lineVatRate>
      <lineVatData>
        <lineVatAmount>${item.vatAmount.toFixed(2)}</lineVatAmount>
        <lineVatAmountHUF>${item.vatAmount.toFixed(2)}</lineVatAmountHUF>
      </lineVatData>
      <lineGrossAmountData>
        <lineGrossAmountNormal>${item.grossAmount.toFixed(2)}</lineGrossAmountNormal>
        <lineGrossAmountNormalHUF>${item.grossAmount.toFixed(2)}</lineGrossAmountNormalHUF>
      </lineGrossAmountData>
    </invoiceLine>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceData xmlns="http://schemas.nav.gov.hu/OSA/3.0/data"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://schemas.nav.gov.hu/OSA/3.0/data invoiceData.xsd">
  <invoiceNumber>${escapeXml(data.invoiceNumber)}</invoiceNumber>
  <invoiceIssueDate>${data.issueDate}</invoiceIssueDate>
  <completenessIndicator>false</completenessIndicator>
  <invoiceMain>
    <invoice>
      <invoiceHead>
        <supplierInfo>
          <supplierTaxNumber>
            <taxpayerId>${data.seller.taxNumber.replace(/[-]/g, '').substring(0, 8)}</taxpayerId>
            <vatCode>${data.seller.taxNumber.split('-')[1] ?? '1'}</vatCode>
            <countyCode>${data.seller.taxNumber.split('-')[2] ?? '01'}</countyCode>
          </supplierTaxNumber>
          <supplierName>${escapeXml(data.seller.name)}</supplierName>
          <supplierAddress>
            <simpleAddress>
              <countryCode>${data.seller.countryCode ?? 'HU'}</countryCode>
              <postalCode>${data.seller.zipCode}</postalCode>
              <city>${escapeXml(data.seller.city)}</city>
              <additionalAddressDetail>${escapeXml(data.seller.address)}</additionalAddressDetail>
            </simpleAddress>
          </supplierAddress>
        </supplierInfo>
        ${data.buyer ? `
        <customerInfo>
          ${data.buyer.taxNumber ? `
          <customerTaxNumber>
            <taxpayerId>${data.buyer.taxNumber.replace(/[-]/g, '').substring(0, 8)}</taxpayerId>
            <vatCode>${data.buyer.taxNumber.split('-')[1] ?? '1'}</vatCode>
            <countyCode>${data.buyer.taxNumber.split('-')[2] ?? '01'}</countyCode>
          </customerTaxNumber>` : ''}
          <customerName>${escapeXml(data.buyer.name)}</customerName>
          <customerAddress>
            <simpleAddress>
              <countryCode>${data.buyer.countryCode ?? 'HU'}</countryCode>
              <postalCode>${data.buyer.zipCode}</postalCode>
              <city>${escapeXml(data.buyer.city)}</city>
              <additionalAddressDetail>${escapeXml(data.buyer.address)}</additionalAddressDetail>
            </simpleAddress>
          </customerAddress>
        </customerInfo>` : ''}
        <invoiceDetail>
          <invoiceCategory>NORMAL</invoiceCategory>
          <invoiceDeliveryDate>${data.fulfillmentDate ?? data.issueDate}</invoiceDeliveryDate>
          <currencyCode>HUF</currencyCode>
          <exchangeRate>1</exchangeRate>
          <paymentMethod>${data.paymentMethod}</paymentMethod>
          <paymentDate>${data.paymentDate}</paymentDate>
          <invoiceAppearance>PAPER</invoiceAppearance>
        </invoiceDetail>
      </invoiceHead>
      <invoiceLines>
        ${invoiceLines}
      </invoiceLines>
      <invoiceSummary>
        <summaryNormal>
          <invoiceNetAmount>${data.totalNet.toFixed(2)}</invoiceNetAmount>
          <invoiceNetAmountHUF>${data.totalNet.toFixed(2)}</invoiceNetAmountHUF>
          <invoiceVatAmountHUF>${data.totalVat.toFixed(2)}</invoiceVatAmountHUF>
        </summaryNormal>
        <summaryGrossData>
          <invoiceGrossAmount>${data.totalGross.toFixed(2)}</invoiceGrossAmount>
          <invoiceGrossAmountHUF>${data.totalGross.toFixed(2)}</invoiceGrossAmountHUF>
        </summaryGrossData>
      </invoiceSummary>
    </invoice>
  </invoiceMain>
</InvoiceData>`;
};

const escapeXml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
