/**
 * Pazar tipini boolean'dan MarketType'a dönüştürmek için yardımcı fonksiyon
 */
export const convertToMarketType = (isDomestic) => {
  return isDomestic ? 'DOMESTIC' : 'INTERNATIONAL';
};

/**
 * MarketType'ı boolean'a dönüştürmek için yardımcı fonksiyon
 */
export const isMarketTypeDomestic = (marketType) => {
  if (marketType === 'DOMESTIC') return true;
  if (marketType === 'INTERNATIONAL') return false;
  return true; // Varsayılan olarak yurtiçi
};
