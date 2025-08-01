// utils/notificationHelpers.js
import {
  PackageCheck,
  CalendarCheck,
  Star,
  Gift,
  ShieldAlert,
  Megaphone,
  Wallet,
} from "lucide-react";

export const typeIcons = {
  order_update: PackageCheck,
  booking_update: CalendarCheck,
  review_update: Star,
  promotion: Gift,
  warning: ShieldAlert,
  announcement: Megaphone,
  withdrawal_update: Wallet,
};
