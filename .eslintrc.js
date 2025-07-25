module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Allow img elements in specific cases
    '@next/next/no-img-element': 'warn',
  },
  overrides: [
    {
      files: ['src/hooks/use-accessibility.tsx'],
      rules: {
        'react-hooks/exhaustive-deps': 'off'
      }
    },
    {
      files: ['src/hooks/use-advanced-visualizer.ts'],
      rules: {
        'react-hooks/exhaustive-deps': 'off'
      }
    },
    {
      files: ['src/components/requests-view.tsx'],
      rules: {
        'react-hooks/exhaustive-deps': 'off'
      }
    },
    {
      files: ['src/components/audio-player-simple.tsx'],
      rules: {
        'react-hooks/exhaustive-deps': 'off'
      }
    }
  ]
};