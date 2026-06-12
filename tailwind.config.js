/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // surfaces
        paper:      '#F0F7FD',
        card:       '#FFFFFF',
        // text
        ink:        '#0E2A47',
        ink2:       '#0A2040',
        muted:      '#5B7A99',
        line:       '#D8EAF6',
        // brand blue
        blue:       '#2BB5EF',
        blueInk:    '#0A78BE',
        blueSoft:   '#D0EDFB',
        blueMid:    '#7DCEF5',
        // brand yellow
        yellow:     '#FFD43B',
        yellowDeep: '#F2BE00',
        yellowSoft: '#FFF0A8',
        // hero
        heroFrom:   '#0E2A47',
        heroTo:     '#0A3A6B',
        heroBg:     '#0C2340',
        // direction
        long:       '#1FA8E8',
        short:      '#F55C7A',
        shortSoft:  '#FFE8ED',
        // semantic
        profit:     '#16A34A',
        profitSoft: '#DCFCE7',
        loss:       '#DC2626',
        lossSoft:   '#FEE2E2',
        safe:       '#16A34A',
        tight:      '#D97706',
        danger:     '#DC2626',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '1380px',
      },
      borderRadius: {
        card:   '20px',
        cardLg: '24px',
      },
      boxShadow: {
        card:      '0 1px 3px rgba(14,42,71,.06), 0 12px 32px -16px rgba(14,42,71,.16)',
        cardHover: '0 1px 3px rgba(14,42,71,.08), 0 20px 40px -14px rgba(14,42,71,.22)',
        input:     '0 1px 2px rgba(14,42,71,.04)',
        hero:      '0 8px 40px -8px rgba(10,42,107,.45)',
        tile:      '0 1px 3px rgba(14,42,71,.08)',
      },
    },
  },
  plugins: [],
}
