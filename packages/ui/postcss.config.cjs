// If you want to use other PostCSS plugins, see the following:
// https://tailwindcss.com/docs/using-with-preprocessors

const config = require("@fa/tailwind-config/tailwind.config.js");

module.exports = {
    syntax: 'postcss-scss',
    plugins: {
        // Specifying the config is not necessary in most cases, but it is included
        // here to share the same config across the entire monorepo
        tailwindcss: { config },
        autoprefixer: {},
    },
};
