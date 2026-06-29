/** @type {import('next').NextConfig} */
module.exports = { 
  reactStrictMode: true,
  experimental: {
    turbopack: {
      root: __dirname,
    }
  }
};
