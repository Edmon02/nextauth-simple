/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Ignore node-pre-gyp and its files in client-side bundles
            config.resolve.alias['@mapbox/node-pre-gyp'] = false;
        }
        return config;
    },
};

module.exports = nextConfig;