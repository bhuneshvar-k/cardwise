export default {
  '*.{ts,tsx,js,mjs}': ['oxlint --quiet', 'prettier --write'],
  '*.{json,md,css,yml,yaml}': ['prettier --write'],
};
