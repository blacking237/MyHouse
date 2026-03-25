import { Linking } from 'react-native';

function getMonthLabel(mois: string): string {
  const months = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
  ];
  const parts = mois.split('-');
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${months[monthIndex]} ${parts[0]}`;
}

function formatNumber(val: number): string {
  return Math.round(val).toLocaleString('fr-FR');
}

export interface WhatsAppInvoiceData {
  mois: string;
  roomNumber: string;
  residentName: string;
  phone: string;
  anEau: number;
  niEau: number;
  anElec: number;
  niElec: number;
  consoEau: number;
  montantHtEau: number;
  tvaEau: number;
  lcEau: number;
  surplusEau: number;
  amendeEau: number;
  montantTtcEau: number;
  consoElec: number;
  montantHtElec: number;
  tvaElec: number;
  lcElec: number;
  surplusElec: number;
  montantTtcElec: number;
  totalFacture: number;
  penaltyMissingIndex?: number;
  dette: number;
  netAPayer: number;
  delaiPaiement: string;
}

export function buildInvoiceMessage(data: WhatsAppInvoiceData): string {
  const monthLabel = getMonthLabel(data.mois);
  let msg = `*Facture eau et electricite*\n`;
  msg += `*Mois ${monthLabel}* *chambre No ${data.roomNumber} :*\n\n`;

  msg += `???? *Eau:*\n`;
  msg += `Ancien index: ${data.anEau}\n`;
  msg += `Nouvel index : ${data.niEau}\n`;
  msg += `Consommation : ${data.consoEau}\n`;
  msg += `Montant HT : ${formatNumber(data.montantHtEau)} FCFA\n`;
  msg += `TVA : ${formatNumber(data.tvaEau)} FCFA\n`;
  msg += `Location compteur : ${formatNumber(data.lcEau)} FCFA\n`;
  if (data.surplusEau > 0) {
    msg += `Surplus : ${formatNumber(data.surplusEau)} FCFA\n`;
  }
  if (data.amendeEau > 0) {
    msg += `Amende : ${formatNumber(data.amendeEau)} FCFA\n`;
  }
  msg += `Montant TTC eau: ${formatNumber(data.montantTtcEau)} FCFA\n\n`;

  msg += `???? *Electricite :*\n`;
  msg += `Ancien index: ${data.anElec}\n`;
  msg += `Nouvel index : ${data.niElec}\n`;
  msg += `Consommation : ${data.consoElec}\n`;
  msg += `Montant HT : ${formatNumber(data.montantHtElec)} FCFA\n`;
  msg += `TVA : ${formatNumber(data.tvaElec)} FCFA\n`;
  msg += `Location compteur : ${formatNumber(data.lcElec)} FCFA\n`;
  if (data.surplusElec > 0) {
    msg += `Surplus : ${formatNumber(data.surplusElec)} FCFA\n`;
  }
  msg += `Montant TTC electricite : ${formatNumber(data.montantTtcElec)} FCFA\n\n`;

  msg += `Total facture mois ${monthLabel} : ${formatNumber(data.totalFacture)} FCFA\n\n`;
  if ((data.penaltyMissingIndex ?? 0) > 0) {
    msg += `Penalite retard / index manquant : ${formatNumber(data.penaltyMissingIndex ?? 0)} FCFA\n\n`;
  }

  if (data.dette > 0) {
    msg += `Dette: ${formatNumber(data.dette)} FCFA (details disponibles si besoin)\n\n`;
  }
  msg += `*Net a payer : ${formatNumber(data.netAPayer)} FCFA*\n\n`;
  msg += `*NB: Delai de paiement le ${data.delaiPaiement}*`;

  return msg;
}

export async function sendWhatsAppMessage(phoneRaw: string, message: string): Promise<boolean> {
  const phone = phoneRaw.replace(/[^0-9]/g, '');
  if (phone.length < 9) {
    return false;
  }
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encodedMessage}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    return false;
  }
  await Linking.openURL(url);
  return true;
}

export interface BroadcastResult {
  totalActiveRooms: number;
  validRecipients: number;
  sentCount: number;
  invalidCount: number;
}

export async function sendWhatsAppBroadcastMessage(
  recipients: Array<{ phone: string }>,
  message: string,
): Promise<BroadcastResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      totalActiveRooms: recipients.length,
      validRecipients: 0,
      sentCount: 0,
      invalidCount: recipients.length,
    };
  }

  let sentCount = 0;
  let validRecipients = 0;
  let invalidCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const phone = recipients[i].phone.replace(/[^0-9]/g, '');
    if (phone.length < 9) {
      invalidCount += 1;
      continue;
    }

    validRecipients += 1;
    const ok = await sendWhatsAppMessage(phone, trimmed);
    if (ok) {
      sentCount += 1;
    } else {
      invalidCount += 1;
    }

    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }

  return {
    totalActiveRooms: recipients.length,
    validRecipients,
    sentCount,
    invalidCount,
  };
}
