// Tailwind configuration for WebClip Assistant
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          primary: "#137fec",
          "background-light": "#f6f7f8",
          "background-dark": "#101922",
        },
        fontFamily: {
          display: ["Inter"],
        },
        borderRadius: {
          DEFAULT: "0.25rem",
          lg: "0.5rem",
          xl: "0.75rem",
          full: "9999px"
        },
      },
    },
  };
}