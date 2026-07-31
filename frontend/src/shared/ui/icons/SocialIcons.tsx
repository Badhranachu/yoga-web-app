// lucide-react dropped brand/logo icons, so the social marks are hand-drawn to match its stroke style.
export type IconProps = { size?: number; strokeWidth?: number; className?: string };

export const InstagramIcon = ({ size = 24, strokeWidth = 1.5, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const FacebookIcon = ({ size = 24, strokeWidth = 1.5, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const XSocialIcon = ({ size = 24, strokeWidth = 1.5, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const WhatsAppIcon = ({ size = 24, strokeWidth = 1.5, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2z" />
    <path d="M8.7 9.4c.2-.5.4-.5.6-.5h.5c.2 0 .4.1.5.3l.7 1.6c.1.2 0 .5-.1.6l-.5.6c.5 1.1 1.4 2 2.5 2.5l.6-.5c.2-.2.4-.2.6-.1l1.6.7c.2.1.3.3.3.5v.5c0 .3-.2.5-.5.6-2.9.6-6-1.9-6.9-4.8-.1-.4-.1-1.1.1-1.4z" />
  </svg>
);

export const socialLinks = [
  { name: 'Instagram', href: '#', Icon: InstagramIcon },
  { name: 'Facebook', href: '#', Icon: FacebookIcon },
  { name: 'X', href: '#', Icon: XSocialIcon },
  { name: 'WhatsApp', href: '#', Icon: WhatsAppIcon },
];
