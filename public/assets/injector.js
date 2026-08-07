(function() {
  try {
    // 1. Извлекаем текущий тег скрипта для получения параметров
    var scriptTag = document.currentScript;
    if (!scriptTag) return;

    // Парсим URL скрипта для получения API-домена и clientId
    var scriptUrl = new URL(scriptTag.src);
    var clientId = scriptUrl.searchParams.get('clientId');
    var apiDomain = scriptUrl.origin;

    if (!clientId) return;

    // 2. Получаем текущий URL страницы, отсекая query-параметры
    var cleanUrl = window.location.href.split('?')[0];

    // 3. Асинхронно запрашиваем оптимизированные данные (Fail Silently - без логов)
    fetch(apiDomain + '/api/serve-assets?url=' + encodeURIComponent(cleanUrl) + '&clientId=' + encodeURIComponent(clientId))
      .then(function(response) {
        if (response.ok) {
          return response.json();
        }
        throw new Error(); // Пробрасываем ошибку в catch для тихого завершения
      })
      .then(function(data) {
        // 4. Безопасное внедрение JSON-LD в <head>
        if (data && data.jsonLd) {
          var ldScript = document.createElement('script');
          ldScript.type = 'application/ld+json';
          ldScript.textContent = typeof data.jsonLd === 'string' ? data.jsonLd : JSON.stringify(data.jsonLd);
          document.head.appendChild(ldScript);
        }

        // 5. Безопасное внедрение семантического HTML блока в <body> (визуально скрыто)
        if (data && data.semanticHtmlBlock) {
          var hiddenWrapper = document.createElement('div');
          hiddenWrapper.style.position = 'absolute';
          hiddenWrapper.style.left = '-9999px';
          hiddenWrapper.innerHTML = data.semanticHtmlBlock;
          document.body.appendChild(hiddenWrapper);
        }
      })
      .catch(function() {
        // Тихое завершение при ошибках 404/500 или недоступности API
      });
  } catch (e) {
    // Абсолютно тихое падение любых непредвиденных ошибок в браузере клиента
  }
})();
