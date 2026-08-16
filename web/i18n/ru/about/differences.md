<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { contacts } from "$lib/env";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="what-is-titty">
<SectionHeading
    title={$t("about.heading.differences_what")}
    sectionId="what-is-titty"
/>

titty.tools это форк [cobalt](https://github.com/imputnet/cobalt), открытого загрузчика медиа. он был сделан для общей пользы: бесплатный, приватный и безопасный способ сохранять медиа из интернета.

оригинальный cobalt отличный, но его встроенные экстракторы обновляются нечасто, поэтому некоторые сайты ломаются и не работают месяцами. titty.tools решает это заменой всего бэкенда на [yt-dlp](https://github.com/yt-dlp/yt-dlp), который обновляется постоянно и поддерживает тысячи сайтов.
</section>

<section id="differences">
<SectionHeading
    title={$t("about.heading.differences")}
    sectionId="differences"
/>

## Бэкенд на yt-dlp

вместо ручного скрейпера на каждый сайт titty.tools передаёт извлечение yt-dlp. это значит:

- тысячи поддерживаемых сайтов из коробки, а не только крупные;
- сломанные сайты чинятся в yt-dlp, обычно в течение нескольких дней;
- сервер обновляет экстрактор автоматически, так что ничего не ломается в ожидании релиза.

## Конвертация файлов тоже происходит в браузере

вкладка конвертер превращает локальные файлы в другие форматы без загрузки на сервер. перетащите файл, выберите формат, и конвертация произойдёт на вашем устройстве через ffmpeg, imagemagick и pandoc, скомпилированные в WebAssembly. видео, аудио, изображения и документы — всё поддерживается, и ваши файлы никогда не покидают ваш компьютер.

## Что осталось прежним

всё остальное унаследовано от cobalt: тот же чистый интерфейс, настройки приватности по умолчанию, никакой рекламы, трекеров и регистрации.
</section>

<section id="where-to-report">
<SectionHeading
    title={$t("about.heading.differences_report")}
    sectionId="where-to-report"
/>

если что-то не работает, пожалуйста, сообщайте об этом в репозиторий titty.tools, а не в оригинальный cobalt. разработчики оригинального проекта не поддерживают бэкенд yt-dlp этого форка, поэтому не смогут исправить его проблемы.

репозиторий titty.tools: [bitceil/titty.tools]({contacts.fork})

оригинальный cobalt: [imputnet/cobalt]({contacts.github})
</section>
