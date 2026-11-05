/** Cửa hàng trang trí — chỉ đổi bằng Hạt sen, không có tiền thật. */
export type ShopCategory = 'incense' | 'lantern' | 'music' | 'theme';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  price: number;
  nameKey: string;
  /** Giá trị dùng cho hiển thị: màu khói, kiểu đèn, chủ đề nhạc… */
  value: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'incense-tram', category: 'incense', price: 0, nameKey: 'shop.incense-tram', value: '#e8e2d6' },
  { id: 'incense-que', category: 'incense', price: 15, nameKey: 'shop.incense-que', value: '#efd9b8' },
  { id: 'incense-sen', category: 'incense', price: 25, nameKey: 'shop.incense-sen', value: '#f4d4e0' },
  { id: 'incense-bai', category: 'incense', price: 35, nameKey: 'shop.incense-bai', value: '#d8e8ef' },
  { id: 'lantern-sen', category: 'lantern', price: 0, nameKey: 'shop.lantern-sen', value: 'sen' },
  { id: 'lantern-vuong', category: 'lantern', price: 20, nameKey: 'shop.lantern-vuong', value: 'vuong' },
  { id: 'lantern-tron', category: 'lantern', price: 30, nameKey: 'shop.lantern-tron', value: 'tron' },
  { id: 'music-default', category: 'music', price: 0, nameKey: 'shop.music-default', value: 'default' },
  { id: 'music-dan-bau', category: 'music', price: 40, nameKey: 'shop.music-dan-bau', value: 'dan-bau' },
  { id: 'music-sao-truc', category: 'music', price: 40, nameKey: 'shop.music-sao-truc', value: 'sao-truc' },
  { id: 'music-tinh-lang', category: 'music', price: 0, nameKey: 'shop.music-tinh-lang', value: 'tinh-lang' },
  { id: 'theme-mac-dinh', category: 'theme', price: 0, nameKey: 'shop.theme-mac-dinh', value: 'none' },
  { id: 'theme-xuan', category: 'theme', price: 50, nameKey: 'shop.theme-xuan', value: 'petals' },
  { id: 'theme-thu', category: 'theme', price: 50, nameKey: 'shop.theme-thu', value: 'leaves' },
  { id: 'theme-dom-dom', category: 'theme', price: 60, nameKey: 'shop.theme-dom-dom', value: 'fireflies' },
];

export const DEFAULT_OWNED = SHOP_ITEMS.filter((i) => i.price === 0).map((i) => i.id);
export const DEFAULT_EQUIPPED: Record<ShopCategory, string> = {
  incense: 'incense-tram',
  lantern: 'lantern-sen',
  music: 'music-default',
  theme: 'theme-mac-dinh',
};

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}
