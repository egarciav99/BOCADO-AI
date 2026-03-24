/**
 * Emoji utility functions
 * Centralized to avoid duplication across components
 */

/**
 * Strips ALL emojis and extra whitespace from a string
 * Used for text processing and comparison
 */
export const stripEmoji = (str: string): string => {
  if (!str) return str;
  return str
    .replace(
      /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+/g,
      " ",
    )
    .trim();
};

/**
 * Strips ONLY leading emojis from a string
 * Preserves emojis in the middle or end
 * Used in ProfileScreen for initial cleanup
 */
export const stripLeadingEmoji = (str: string): string => {
  if (!str) return str;
  const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+/;
  return str.replace(emojiRegex, "").trim();
};
