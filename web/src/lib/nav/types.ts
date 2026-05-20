export type NavEnvironment = 'test' | 'prod';

export interface NavCredentials {
  username: string;
  passwordHash: string; // SHA-512 of uppercase password
  signatureKey: string; // 32-char hex
  exchangeKey: string; // 32-char hex
  environment: NavEnvironment;
  taxNumber: string; // eladó adószám
}

export interface NavSupplier {
  taxNumber: string; // format: 12345678-1-11
  name: string;
  address: string;
  bankAccountNumber?: string;
}

export interface NavCustomer {
  taxNumber?: string;
  name: string;
  address: string;
}

export interface NavLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string; // 'db' | 'óra' | 'm' | 'm2'
  unitPrice: number; // nettó egységár
  vatRate: number; // 0 | 5 | 27 | -1 (for AAM/exempt)
  vatExemptionReason?: string; // 'TAM' for KATA/alanyi mentes
}

export interface NavInvoiceData {
  invoiceNumber: string;
  invoiceIssueDate: string; // YYYY-MM-DD
  invoiceDeliveryDate: string;
  paymentDate: string;
  paymentMethod: 'TRANSFER' | 'CASH' | 'CARD';
  supplier: NavSupplier;
  customer: NavCustomer;
  items: NavLineItem[];
  isSelfBilled: boolean;
  invoiceAppearance: 'PAPER' | 'ELECTRONIC';
  isAAM?: boolean; // alanyi adómentes
}

export interface NavTokenResponse {
  encodedExchangeToken: string;
  tokenValidityFrom: string;
  tokenValidityTo: string;
}

export interface NavManageInvoiceResponse {
  transactionId: string;
  requestStatus: 'RECEIVED' | 'PROCESSING' | 'SAVED' | 'FINISHED';
}

export interface NavTransactionStatus {
  transactionId: string;
  requestStatus: string;
  invoiceStatuses: Array<{
    index: number;
    invoiceStatus: string;
    technicalValidationMessages?: Array<{ message: string; pointer: string }>;
    businessValidationMessages?: Array<{ message: string; pointer: string }>;
  }>;
}
