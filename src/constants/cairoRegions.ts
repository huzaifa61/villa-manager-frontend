export type CairoRegionKey = 'northern' | 'eastern' | 'southern' | 'western';

export type CairoArea = {
  name: string;
  alias?: string;
};

export type CairoRegion = {
  key: CairoRegionKey;
  labelKey: string;
  color: string;
  areas: CairoArea[];
};

export const CAIRO_REGIONS: CairoRegion[] = [
  {
    key: 'northern',
    labelKey: 'northernRegion',
    color: '#38BDF8',
    areas: [
      { name: 'Ain Shams', alias: 'Ain Shams' },
      { name: 'Al Amiriya' },
      { name: 'Al Marg', alias: 'El Marg' },
      { name: 'Al Zaytoun', alias: 'Al-Zaitoun' },
      { name: 'El Sahel', alias: 'El Sahel' },
      { name: 'El Sharabeya' },
      { name: 'Hadayeq El Zaitoun' },
      { name: 'Shubra', alias: 'Shubra' },
      { name: 'Zawya El Hamraa' },
    ],
  },
  {
    key: 'eastern',
    labelKey: 'easternRegion',
    color: '#22C55E',
    areas: [
      { name: 'Al Matareya', alias: 'Mataria' },
      { name: 'El Nozha' },
      { name: 'El Salam 1 & El Salam 2' },
      { name: 'El Shorouk', alias: 'El Shorouk' },
      { name: 'Heliopolis', alias: 'Heliopolis' },
      { name: 'Manshiyat Naser', alias: 'Manshiyat Naser' },
      { name: 'Mokattam', alias: 'Mokattam' },
      { name: 'Nasr City 1 (East)' },
      { name: 'Nasr City 2 (West)', alias: 'Nasr City' },
      { name: 'New Cairo 1, New Cairo 2, and New Cairo 3', alias: 'New Cairo' },
    ],
  },
  {
    key: 'southern',
    labelKey: 'southernRegion',
    color: '#F59E0B',
    areas: [
      { name: '15th of May City', alias: '15th of May' },
      { name: 'Al Basatin' },
      { name: 'Al Khalifa' },
      { name: "Al Ma'sara" },
      { name: 'Al Qahira Al Gedida (Historic Southern sections)' },
      { name: 'Al Tebin' },
      { name: 'Dar El Salam' },
      { name: 'El Saida Zeinab' },
      { name: 'El Tabin' },
      { name: 'Helwan', alias: 'Helwan' },
      { name: 'Old Cairo (Masr Al Qadima)', alias: 'Masr Al-Qadima' },
      { name: 'Tura', alias: 'Tura' },
    ],
  },
  {
    key: 'western',
    labelKey: 'westernRegion',
    color: '#A78BFA',
    areas: [
      { name: 'Abdeen', alias: 'Abdin' },
      { name: 'Al Azbakeya', alias: 'Al-Azbakeya' },
      { name: 'Al Mosky', alias: 'Al-Mosky' },
      { name: 'Bab El Sharia', alias: 'Bab al-Shariyah' },
      { name: 'Bulaq', alias: 'Bulaq' },
      { name: 'Downtown Cairo (West Cairo)', alias: 'Downtown Cairo' },
      { name: 'El Darrb El Ahmar', alias: 'El-Darb El-Ahmar' },
      { name: 'El Gamaleya', alias: 'El-Gamaliyya' },
      { name: 'El Waili' },
      { name: 'Garden City', alias: 'Garden City' },
      { name: 'Manshiyet El Sadr' },
    ],
  },
];
