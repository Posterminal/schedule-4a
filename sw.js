const CACHE_NAME = "schedule-4a-v11";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
];

/* Встановлення PWA */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );

  self.skipWaiting();
});

/* Видалення старих кешів */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

/* Запити сайту */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  /*
    NEPTUN ніколи не кешуємо.
    Завжди отримуємо актуальний статус тривоги з інтернету.
  */
  if (url.origin === "https://neptun.in.ua") {
    event.respondWith(fetch(event.request));
    return;
  }

  /*
    Для файлів самого сайту:
    спершу кеш, якщо файлу немає — інтернет.
  */
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
