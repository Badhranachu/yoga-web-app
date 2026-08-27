import { FacebookIcon, InstagramIcon, WhatsAppIcon, XSocialIcon } from './SocialIcons';

// wa.me deep link: opens WhatsApp with the studio's number and a pre-filled
// greeting already typed into the message box, so a tap starts a real
// conversation instead of just opening an empty chat. buildWhatsAppHref lets
// callers swap in a more specific message (e.g. for a particular plan)
// while sharing the same studio number.
export const WHATSAPP_NUMBER = '919946451723';
export const buildWhatsAppHref = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
export const whatsappHref = buildWhatsAppHref("Hi! I'd like to know more about classes at Harmony Fusion Studio.");

export const socialLinks = [
  { name: 'Instagram', href: 'https://www.instagram.com/harmonyfusion.yogaco/?utm_source=ig_web_button_share_sheet', Icon: InstagramIcon },
  { name: 'Facebook', href: '#', Icon: FacebookIcon },
  { name: 'X', href: '#', Icon: XSocialIcon },
  { name: 'WhatsApp', href: whatsappHref, Icon: WhatsAppIcon },
];
