export const TITLE_COMPACT_THRESHOLD = 10;

export const getTitleLength = (title) => Array.from(String(title || '').trim()).length;

export const getTitleDisplayStyle = (
  title,
  { compactFontSize, maxChars = TITLE_COMPACT_THRESHOLD } = {}
) => ({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'clip',
  maxWidth: '100%',
  ...(getTitleLength(title) > maxChars && compactFontSize ? { fontSize: compactFontSize } : {})
});
