module.exports = {
  theme: {
    extend: {
      colors: {
        backgroundColor: "#f6f5f5",
        primaryColor: "#5bd1d7",
        secondaryColor: "#248ea9",
        accentColor: "#556fb5"
      },
    
    },
    screens: {
      'lt': '456px',
      'sm': '640px',
      // => @media (min-width: 640px) { ... }

      'md': '768px',
      // => @media (min-width: 768px) { ... }

      'lg': '1024px',
      // => @media (min-width: 1024px) { ... }

      'xl': '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }
    },
  },
  variants: {},
  plugins: []
};
