import { ProductCarousel } from "./ProductCarousel";

export function FestivalPicks({ userId, month }: { userId: string; month: number }) {
  if (![10, 11].includes(month)) return null;
  return <div className="banner"><h2>{month === 10 ? "Dashain Special Picks" : "Tihar Special Picks"}</h2><ProductCarousel userId={userId} title="Seasonal recommendations" month={month} /></div>;
}
