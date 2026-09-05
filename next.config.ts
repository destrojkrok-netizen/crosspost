import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// `next dev` gets the same D1 / R2 bindings the Worker has, served by wrangler locally.
void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {};

export default nextConfig;
