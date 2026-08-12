<div align="center">
    <br/>
    <p>
        <img src="web/static/favicon.png" title="titty.tools" alt="titty.tools logo" width="100" />
    </p>
    <p>
        best way to save what you love
        <br/>
        <a href="https://titty.tools">
            titty.tools
        </a>
    </p>
    <br/>
</div>

titty.tools is a media downloader that doesn't piss you off. it's friendly, efficient, and doesn't have ads, trackers, paywalls or other nonsense.

paste the link, get the file, move on. that simple, just how it should be.

titty.tools is a fork of [cobalt](https://github.com/imputnet/cobalt), made for public benefit. cobalt is a great project, but it doesn't get updated too often, so support for some platforms falls behind. that's why we replaced the custom per-site scrapers with [yt-dlp](https://github.com/yt-dlp/yt-dlp), which keeps downloads working across 1000+ sites. remuxing and local processing still happen right in your browser.

### monorepo
this monorepo includes source code for api, frontend, and related packages:
- [api tree & readme](/api/)
- [web tree & readme](/web/)
- [packages tree](/packages/)

it also includes documentation in the [docs tree](/docs/):
- [how to run an instance](/docs/run-an-instance.md)
- [how to protect an instance](/docs/protect-an-instance.md)
- [api instance environment variables](/docs/api-env-variables.md)
- [api documentation](/docs/api.md)

### ethics
titty.tools is a tool that makes downloading public content easier. it takes **zero liability**.
the end user is responsible for what they download, how they use and distribute that content.
titty.tools never caches any content, it [works like a fancy proxy](/api/src/stream/).

the backend uses yt-dlp for extraction, and it never downloads the media to the server.
extraction only fetches metadata and direct media links, then the files stream straight
from the source to your device, like a proxy. nothing is cached or written to disk.
the only temporary files are per-request cookie files, which are deleted immediately
after extraction.

titty.tools is in no way a piracy tool and cannot be used as such.
it can only download free & publicly accessible content.
same content can be downloaded via dev tools of any modern web browser.

### contributing
if you're considering contributing to titty.tools, first of all, thank you! check the [contribution guidelines here](/CONTRIBUTING.md) before getting started, they'll help you do your best right away.

### thank you
titty.tools is built on top of [cobalt](https://github.com/imputnet/cobalt), an open source project made with love and care by [imput](https://imput.net/). we're grateful for the years of work that went into it, and we're especially thankful for [yt-dlp](https://github.com/yt-dlp/yt-dlp), which powers our backend.

### licenses
for relevant licensing information, see the [api](api/README.md) and [web](web/README.md) READMEs.
unless specified otherwise, the remainder of this repository is licensed under [AGPL-3.0](LICENSE).
