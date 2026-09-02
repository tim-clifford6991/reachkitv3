// Tailwind CSS 4 pipeline only. daisyUI is wired in WO-029, not here.
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
