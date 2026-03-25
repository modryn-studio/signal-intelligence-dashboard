import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      // Disabled: false positive in Next.js SSR context. localStorage and URL params
      // are only available client-side, so useEffect is the correct initialization
      // pattern — lazy useState initializers would crash on the server.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
