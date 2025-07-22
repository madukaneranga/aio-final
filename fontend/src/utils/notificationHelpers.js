import {
  PackageCheck,    // For order updates
  CalendarCheck,   // For booking updates
  Star,            // For review updates
  Gift,            // For promotions
  ShieldAlert,     // For warnings
  Megaphone,       // For announcements
} from "lucide-react";

export const typeIcons = {
  order_update: <PackageCheck className="w-5 h-5" />,
  booking_update: <CalendarCheck className="w-5 h-5" />,
  review_update: <Star className="w-5 h-5" />,
  promotion: <Gift className="w-5 h-5" />,
  warning: <ShieldAlert className="w-5 h-5" />,
  announcement: <Megaphone className="w-5 h-5" />,
};
