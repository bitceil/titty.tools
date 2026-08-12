/*
    registry of services cobalt knows about.

    extraction itself is handled by yt-dlp, so this file is only used for:
    - detecting known services (for friendly names & DISABLED_SERVICES)
    - url normalization (aliases, subdomains, alternative domains)
    - service-specific behavior flags
*/

export const audioIgnore = new Set(["vk", "ok", "loom"]);

export const services = {
    bilibili: {
        subdomains: ["m"],
    },
    bsky: {
        tld: "app",
    },
    dailymotion: {},
    facebook: {
        subdomains: ["web", "m"],
        altDomains: ["fb.watch"],
    },
    instagram: {
        altDomains: ["ddinstagram.com"],
    },
    loom: {},
    ok: {
        tld: "ru",
    },
    pinterest: {},
    newgrounds: {},
    reddit: {
        subdomains: "*",
    },
    rutube: {
        tld: "ru",
    },
    snapchat: {
        subdomains: ["t", "story"],
    },
    soundcloud: {
        subdomains: ["on", "m"],
    },
    streamable: {},
    tiktok: {
        subdomains: ["vt", "vm", "m", "t", "pro"],
    },
    tumblr: {
        subdomains: "*",
    },
    twitch: {
        tld: "tv",
        subdomains: ["clips", "www", "m"],
    },
    twitter: {
        subdomains: ["mobile"],
        altDomains: ["x.com", "vxtwitter.com", "fixvx.com"],
    },
    vimeo: {
        subdomains: ["player"],
    },
    vk: {
        subdomains: ["m"],
        altDomains: ["vkvideo.ru", "vk.ru"],
    },
    youtube: {
        subdomains: ["music", "m"],
    }
}
