module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  plugins: ['prettier', 'jest'],
  rules: {
    'prettier/prettier': 'error',
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  env: {
    'react-native/react-native': true,
    jest: true,
    node: true,
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*', '**/test/**/*'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
};
