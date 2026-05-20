import { Linking } from 'react-native';

export const sendWhatsAppInvoice = (phone: string, invoiceUrl: string, amount: string): void => {
  const cleaned = phone.replace(/\D/g, '');
  const intlPhone = cleaned.startsWith('06') ? '36' + cleaned.slice(1) : cleaned;
  const message = encodeURIComponent(
    `Tisztelt Ügyfelünk!\n\nMellékelem a számlát: ${invoiceUrl}\n\nÖsszeg: ${amount}\n\nKöszönjük a bizalmat!\nMesterAI`
  );
  Linking.openURL(`https://wa.me/${intlPhone}?text=${message}`);
};

export const sendWhatsAppMessage = (phone: string, message: string): void => {
  const cleaned = phone.replace(/\D/g, '');
  const intlPhone = cleaned.startsWith('06') ? '36' + cleaned.slice(1) : cleaned;
  Linking.openURL(`https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`);
};
