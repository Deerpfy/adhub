/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app.js", "./index.html"],
  theme: {
    extend: {
      colors: {
        slate: {
          750: '#293548',
          850: '#172033',
        }
      }
    }
  },
  plugins: [],
}
