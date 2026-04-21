/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@remotion/install-whisper-cpp",
    "@remotion/bundler",
    "@remotion/renderer",
    "@rspack/core",
    "@rspack/binding",
    "@rspack/binding-win32-x64-msvc",
    "esbuild",
    "ffmpeg-static",
    "ffprobe-static",
    "music-metadata"
  ]
};

export default nextConfig;
