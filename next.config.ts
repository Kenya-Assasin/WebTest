import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.MCA_TEST === '1' ? '.next-test' : '.next',
  async redirects() {
    const pages = ['kho-du-lieu', 'chi-tiet-sinh-vat', 'tao-ho-so', 'dieu-tra-vien',
      'dang-nhap', 'dang-ky', 'admin', 'admin-chi-tiet'];
    return [
      { source: '/index.html', destination: '/', permanent: true },
      ...pages.map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true })),
      { source: '/create.html', destination: '/tao-ho-so', permanent: true },
    ];
  },
};

export default nextConfig;

