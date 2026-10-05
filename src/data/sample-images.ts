/** Demonstration photography only; replace with your supplier's product photos before launch. */
const photo = (key: string) => `/images/demo/${key}.jpg`;
export const sampleProductImages: Record<string, string> = {
  "Wai Wai Instant Noodles (Chicken)": photo("noodles"),
  "Gundruk (Fermented Leafy Greens)": photo("gundruk"),
  "Timur (Sichuan Pepper)": photo("timur"),
  "Everest Meat Masala": photo("masala"),
  "Nepali Black Tea (Ilam)": photo("tea"),
  "Chiura (Beaten Rice)": photo("chiura"),
  "Sel Roti Mix": photo("sel-roti"),
  "Frozen Chicken Momo (24 pcs)": photo("chicken-momo"),
  "Frozen Veg Momo (24 pcs)": photo("veg-momo"),
  "Mustard Oil Achar (Mixed Pickle)": photo("achar"),
  "Masoor Dal (Red Lentils)": photo("lentils"),
  "Aged Basmati Rice": photo("rice"),
  "Chhurpi (Dried Yak Cheese Chew)": photo("chhurpi"),
  "Lalmohan & Barfi Sweet Box": photo("sweets"),
  "Puja Thali Set": photo("puja"),
};
export const sampleCategoryImages: Record<string, string> = {
  Groceries: photo("rice"),
  "Spices & Masala": photo("masala"),
  "Pickles & Chutneys": photo("achar"),
  Snacks: photo("chhurpi"),
  Sweets: photo("sweets"),
  Beverages: photo("tea"),
  "Ready-to-Eat": photo("chicken-momo"),
  "Frozen Foods": photo("veg-momo"),
  "Fresh Foods": photo("fresh-foods"),
  "Festival & Puja": photo("puja"),
  "Clothing & Accessories": photo("clothing"),
  Gifts: photo("gifts"),
  Household: photo("puja"),
  "Personal Care": photo("personal-care"),
  Rice: photo("rice"),
  Lentils: photo("lentils"),
  Flour: photo("flour"),
  Noodles: photo("noodles"),
  "Cooking Essentials": photo("masala"),
};
export function demoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}
export const isPlaceholderImage = (url: string | null) => {
  if (!url) return true;
  try {
    return new URL(url).hostname === "placehold.co";
  } catch {
    return false;
  }
};
