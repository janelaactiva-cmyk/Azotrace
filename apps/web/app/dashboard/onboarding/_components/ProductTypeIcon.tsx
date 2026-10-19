import { Beef, Fish, Flower2, Grape, Milk, Shapes, Sprout } from 'lucide-react';

const icons = {
  agriculture: Sprout,
  apiculture: Flower2,
  wine: Grape,
  meat: Beef,
  dairy: Milk,
  fish: Fish,
  custom: Shapes,
};

export function ProductTypeIcon({ type }: { type: string }) {
  const Icon = icons[type as keyof typeof icons] || Shapes;
  return <Icon size={28} strokeWidth={1.7} aria-hidden="true" />;
}
