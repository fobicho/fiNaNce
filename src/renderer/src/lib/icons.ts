import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard,
  ShoppingCart, Home, Car, Heart, BookOpen, Briefcase,
  Gift, Coffee, Smartphone, Utensils, Plane, Zap,
  Shirt, Gamepad2, Plus, DollarSign, Landmark, Building,
  Receipt, Fuel, Bus, GraduationCap, Music, Monitor,
  Inbox, type LucideIcon
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard,
  ShoppingCart, Home, Car, Heart, BookOpen, Briefcase,
  Gift, Coffee, Smartphone, Utensils, Plane, Zap,
  Shirt, Gamepad2, Plus, DollarSign, Landmark, Building,
  Receipt, Fuel, Bus, GraduationCap, Music, Monitor, Inbox
}

export function resolveIcon(name: string): LucideIcon {
  return iconMap[name] || Receipt
}

export const allIconNames = Object.keys(iconMap).sort()
