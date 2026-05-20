import type {
  NavCredentials,
  NavManageInvoiceResponse,
  NavTokenResponse,
  NavTransactionStatus,
} from './types';
import { createDecipheriv } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import {
  aes128ecb,
  crc32,
  generateRequestId,
  navTimestamp,
  requestSignature,
} from './crypto';

function getBaseUrl(environment: NavCredentials['environment']): string {
  if (environment === 'prod') {
    return 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3';
  }
  return 'https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3';
}

function extractXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<[^:>]*:?${tag}[^>]*>([^<]*)<`));
  return match ? match[1].trim() : '';
}

function buildSoftwareBlock(): string {
  return `  <common:software>
    <common:softwareId>HU00000000-MESTERAI-WEB</common:softwareId>
    <common:softwareName>MesterAI</common:softwareName>
    <common:softwareOperation>ONLINE_SERVICE</common:softwareOperation>
    <common:softwareMainVersion>1.0</common:softwareMainVersion>
    <common:softwareDevName>DomRol Kft</common:softwareDevName>
    <common:softwareDevContact>info@mesterai.hu</common:softwareDevContact>
    <common:softwareCountryCode>HU</common:softwareCountryCode>
    <common:softwareTaxNumber>00000000</common:softwareTaxNumber>
  </common:software>`;
}

function buildHeaderAndUser(
  requestId: string,
  timestamp: string,
  creds: NavCredentials,
  sigHex: string,
): string {
  return `  <common:header>
    <common:requestId>${requestId}</common:requestId>
    <common:timestamp>${timestamp}</common:timestamp>
    <common:requestVersion>3.0</common:requestVersion>
    <common:headerVersion>1.0</common:headerVersion>
  </common:header>
  <common:user>
    <common:login>${creds.username}</common:login>
    <common:passwordHash cryptoType="SHA-512">${creds.passwordHash}</common:passwordHash>
    <common:taxNumber>${creds.taxNumber}</common:taxNumber>
    <common:requestSignature cryptoType="SHA3-512">${sigHex}</common:requestSignature>
  </common:user>`;
}

// Uses node:https instead of fetch — undici (fetch) validates response headers
// against ISO-8859-1 and throws on characters like ő/ű (U+0151/U+0171) that
// the NAV API returns in its error response headers.
function postXml(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyBuf = Buffer.from(body, 'utf8');

    const req = httpsRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          Accept: 'application/xml',
          'Content-Length': bodyBuf.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if ((res.statusCode ?? 200) >= 400) {
            reject(new Error(`NAV API error ${res.statusCode}: ${text}`));
          } else {
            resolve(text);
          }
        });
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

export async function tokenExchange(creds: NavCredentials): Promise<NavTokenResponse> {
  const requestId = generateRequestId();
  const timestamp = navTimestamp();
  const sig = requestSignature(requestId, timestamp, creds.signatureKey);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TokenExchangeRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api"
                      xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
${buildHeaderAndUser(requestId, timestamp, creds, sig)}
${buildSoftwareBlock()}
</TokenExchangeRequest>`;

  const responseXml = await postXml(`${getBaseUrl(creds.environment)}/tokenExchange`, xml);

  const encodedExchangeToken = extractXmlValue(responseXml, 'encodedExchangeToken');
  const tokenValidityFrom = extractXmlValue(responseXml, 'tokenValidityFrom');
  const tokenValidityTo = extractXmlValue(responseXml, 'tokenValidityTo');

  if (!encodedExchangeToken) {
    throw new Error(`Failed to extract token from NAV response: ${responseXml}`);
  }

  return { encodedExchangeToken, tokenValidityFrom, tokenValidityTo };
}

export async function manageInvoice(
  creds: NavCredentials,
  token: string,
  invoiceXml: string,
  operation: 'CREATE' | 'STORNO',
): Promise<NavManageInvoiceResponse> {
  const requestId = generateRequestId();
  const timestamp = navTimestamp();

  // Encrypt invoice XML with AES-128-ECB using the exchange key
  const keyBuffer = Buffer.from(creds.exchangeKey, 'hex').slice(0, 16);
  const xmlBuffer = Buffer.from(invoiceXml, 'utf8');
  const encrypted = aes128ecb(xmlBuffer, keyBuffer);
  const invoiceData = encrypted.toString('base64');

  // CRC32 of original XML bytes → lowercase hex for signature
  const crc = crc32(xmlBuffer);
  const crcHex = crc.toString(16).toLowerCase().padStart(8, '0');

  const sig = requestSignature(requestId, timestamp, creds.signatureKey, crcHex);

  // Decode the exchange token for the exchangeToken element
  // The token is base64-encoded by NAV; we AES-decrypt it with exchangeKey to get the actual token
  const tokenBuffer = Buffer.from(token, 'base64');
  const decryptedToken = decryptAes128ecb(tokenBuffer, keyBuffer).toString('utf8').replace(/\0+$/, '');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ManageInvoiceRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api"
                      xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
${buildHeaderAndUser(requestId, timestamp, creds, sig)}
${buildSoftwareBlock()}
  <exchangeToken>${decryptedToken}</exchangeToken>
  <invoiceOperations>
    <compressedContent>false</compressedContent>
    <invoiceOperation>
      <index>1</index>
      <invoiceOperation>${operation}</invoiceOperation>
      <invoiceData>${invoiceData}</invoiceData>
    </invoiceOperation>
  </invoiceOperations>
</ManageInvoiceRequest>`;

  const responseXml = await postXml(`${getBaseUrl(creds.environment)}/manageInvoice`, xml);

  const transactionId = extractXmlValue(responseXml, 'transactionId');
  const requestStatus = extractXmlValue(responseXml, 'requestStatus') as NavManageInvoiceResponse['requestStatus'];

  if (!transactionId) {
    throw new Error(`Failed to extract transactionId from NAV response: ${responseXml}`);
  }

  return { transactionId, requestStatus: requestStatus || 'RECEIVED' };
}

export async function queryTransactionStatus(
  creds: NavCredentials,
  token: string,
  transactionId: string,
): Promise<NavTransactionStatus> {
  const requestId = generateRequestId();
  const timestamp = navTimestamp();
  const sig = requestSignature(requestId, timestamp, creds.signatureKey);

  // Decrypt the exchange token
  const keyBuffer = Buffer.from(creds.exchangeKey, 'hex').slice(0, 16);
  const tokenBuffer = Buffer.from(token, 'base64');
  const decryptedToken = decryptAes128ecb(tokenBuffer, keyBuffer).toString('utf8').replace(/\0+$/, '');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<QueryTransactionStatusRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api"
                                xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
${buildHeaderAndUser(requestId, timestamp, creds, sig)}
${buildSoftwareBlock()}
  <exchangeToken>${decryptedToken}</exchangeToken>
  <transactionId>${transactionId}</transactionId>
  <returnOriginalRequest>false</returnOriginalRequest>
</QueryTransactionStatusRequest>`;

  const responseXml = await postXml(
    `${getBaseUrl(creds.environment)}/queryTransactionStatus`,
    xml,
  );

  return parseTransactionStatusResponse(responseXml, transactionId);
}

function parseTransactionStatusResponse(xml: string, transactionId: string): NavTransactionStatus {
  const requestStatus = extractXmlValue(xml, 'requestStatus');

  const invoiceStatuses: NavTransactionStatus['invoiceStatuses'] = [];
  const processingResultPattern = /<processingResult>([\s\S]*?)<\/processingResult>/g;
  let resultMatch: RegExpExecArray | null;

  while ((resultMatch = processingResultPattern.exec(xml)) !== null) {
    const block = resultMatch[1];
    const index = parseInt(extractXmlValue(block, 'index') || '1', 10);
    const invoiceStatus = extractXmlValue(block, 'invoiceStatus');

    const technicalValidationMessages: NavTransactionStatus['invoiceStatuses'][number]['technicalValidationMessages'] = [];
    const businessValidationMessages: NavTransactionStatus['invoiceStatuses'][number]['businessValidationMessages'] = [];

    const techPattern = /<technicalValidationMessages>([\s\S]*?)<\/technicalValidationMessages>/g;
    let techMatch: RegExpExecArray | null;
    while ((techMatch = techPattern.exec(block)) !== null) {
      const msgBlock = techMatch[1];
      technicalValidationMessages.push({
        message: extractXmlValue(msgBlock, 'message'),
        pointer: extractXmlValue(msgBlock, 'pointer'),
      });
    }

    const bizPattern = /<businessValidationMessages>([\s\S]*?)<\/businessValidationMessages>/g;
    let bizMatch: RegExpExecArray | null;
    while ((bizMatch = bizPattern.exec(block)) !== null) {
      const msgBlock = bizMatch[1];
      businessValidationMessages.push({
        message: extractXmlValue(msgBlock, 'message'),
        pointer: extractXmlValue(msgBlock, 'pointer'),
      });
    }

    invoiceStatuses.push({
      index,
      invoiceStatus,
      ...(technicalValidationMessages.length > 0 && { technicalValidationMessages }),
      ...(businessValidationMessages.length > 0 && { businessValidationMessages }),
    });
  }

  return {
    transactionId,
    requestStatus,
    invoiceStatuses,
  };
}

// AES-128-ECB decrypt helper (for token decryption)
function decryptAes128ecb(data: Buffer, key: Buffer): Buffer {
  const decipher = createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(true);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
