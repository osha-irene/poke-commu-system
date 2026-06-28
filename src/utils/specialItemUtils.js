export const isSoyYYNItem = (item = {}) => {
  const normalizedNames = [
    item.id,
    item.itemId,
    item.nameEn,
    item.name
  ].map(value => String(value || '').trim().toLowerCase());

  return normalizedNames.includes('soy_yyn');
};
