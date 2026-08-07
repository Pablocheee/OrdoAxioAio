import React, { useState, useEffect } from 'react';

interface ClientDashboardProps {
  clientId?: string;
}

export default function ClientDashboard({ clientId = 'client_10984_xyz' }: ClientDashboardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [botVisits, setBotVisits] = useState<number | null>(null);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);

  // Стейты для активной индексации (IndexNow)
  const [isFastIndexingEnabled, setIsFastIndexingEnabled] = useState(true);
  const indexNowKey = '5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d'; // Имитация ключа из БД
  const pendingPings = 24; // Имитация счетчика
  const lastPingSent = 'Сегодня, 14:30'; // Имитация метки времени

  // Шаблон скрипта интеграции согласно требованиям
  const scriptSnippet = `<script src="https://[YOUR_VERCEL_DOMAIN]/assets/injector.js?clientId=${clientId}" async></script>`;

  // Имитация загрузки данных аналитики (например, из Firestore bot_analytics)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBotVisits(14205);
      setIsLoadingVisits(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Копирование скрипта в буфер обмена с обратной связью
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  /**
   * Генерация и скачивание TXT файла для верификации IndexNow
   */
  const handleDownloadKey = () => {
    const blob = new Blob([indexNowKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${indexNowKey}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 font-sans selection:bg-black selection:text-white">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Заголовок */}
        <header className="border-b border-gray-300 pb-6 flex flex-col space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-black uppercase">Панель клиента</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">Управление AI Search Optimization</p>
        </header>

        {/* Секция: Код интеграции (Vaccine Script) */}
        <section className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
            1. Интеграция (Vaccine Script)
          </h2>
          <p className="text-sm text-gray-600">
            Разместите данный скрипт внутри тега &lt;head&gt; вашего сайта. Скрипт полностью асинхронный и не влияет на скорость загрузки страницы для обычных пользователей.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-stretch">
            <div className="flex-1 w-full bg-gray-50 border border-gray-300 p-4 overflow-x-auto rounded-none">
              <code className="text-sm font-mono text-gray-800 whitespace-pre">{scriptSnippet}</code>
            </div>
            <button 
              onClick={handleCopy}
              className="w-full md:w-auto shrink-0 bg-black text-white border border-black px-8 py-4 text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors focus:outline-none rounded-none"
            >
              {isCopied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
        </section>

        {/* Секция: Аналитика */}
        <section className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
            2. Аналитика сканирования
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-300 p-6 flex flex-col justify-between h-32 rounded-none">
              <span className="text-xs uppercase tracking-widest text-gray-500">Визиты AI-ботов (30 дней)</span>
              <div className="text-4xl font-light tracking-tighter text-black">
                {isLoadingVisits ? (
                  <span className="animate-pulse text-gray-300">...</span>
                ) : (
                  botVisits?.toLocaleString('ru-RU')
                )}
              </div>
            </div>
            <div className="border border-gray-200 p-6 flex flex-col justify-between h-32 bg-gray-50 rounded-none">
              <span className="text-xs uppercase tracking-widest text-gray-400">Статус парсера</span>
              <div className="text-lg font-medium tracking-tight text-gray-800">Активен</div>
            </div>
            <div className="border border-gray-200 p-6 flex flex-col justify-between h-32 bg-gray-50 rounded-none">
              <span className="text-xs uppercase tracking-widest text-gray-400">Генерация ИИ</span>
              <div className="text-lg font-medium tracking-tight text-gray-800">Активна</div>
            </div>
          </div>
        </section>

        {/* Секция: До/После (Proof of Work) */}
        <section className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
            3. Пример оптимизации (Proof of Work)
          </h2>
          <p className="text-sm text-gray-600">
            Сравнение исходного кода и данных, отдаваемых AI-ботам для страницы <span className="font-mono bg-gray-100 px-1">/products/sample</span>.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-300 rounded-none">
            {/* Левая часть: Исходные данные */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-300 bg-gray-50">
              <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-6">Исходные данные</h3>
              <div className="h-72 flex items-center justify-center border border-dashed border-gray-300 bg-white">
                <span className="text-sm text-gray-400 uppercase tracking-widest">Нет структурированных данных</span>
              </div>
            </div>

            {/* Правая часть: AI Данные */}
            <div className="p-6 bg-white">
              <h3 className="text-xs uppercase tracking-widest text-black mb-6">AI Оптимизированные данные (JSON-LD)</h3>
              <div className="h-72 overflow-y-auto bg-gray-900 p-6 border border-gray-900 rounded-none scrollbar-thin">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
{`{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Пример продукта",
  "description": "Детальное семантическое описание, созданное ИИ для лучшего понимания поисковыми ботами (ChatGPT, Perplexity).",
  "mainEntityOfPage": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Закрытый интент пользователя (Data Void)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Развернутый экспертный ответ, повышающий релевантность при прямых ответах в LLM-поисковиках."
        }
      }
    ]
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Секция: Активная индексация (IndexNow) */}
        <section className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
            4. Активная индексация (IndexNow)
          </h2>
          <p className="text-sm text-gray-600">
            Мгновенное уведомление поисковых систем (Bing, Yandex, Perplexity) об обновлении контента. Для активации загрузите файл верификации в корень вашего домена.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Управление и ключ */}
            <div className="border border-gray-300 p-6 space-y-6 rounded-none flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-black uppercase tracking-widest">Быстрая индексация</h3>
                  <p className="text-xs text-gray-500 mt-1">Автоматический пинг при генерации AI-данных</p>
                </div>
                {/* Кастомный минималистичный тумблер */}
                <button 
                  onClick={() => setIsFastIndexingEnabled(!isFastIndexingEnabled)}
                  className={`w-12 h-6 border transition-colors duration-200 focus:outline-none flex items-center px-1 rounded-none ${
                    isFastIndexingEnabled ? 'bg-black border-black' : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white transition-transform duration-200 shadow-sm ${
                    isFastIndexingEnabled ? 'translate-x-6 border border-black' : 'translate-x-0 border border-gray-300'
                  }`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">Ключ IndexNow</label>
                <div className="flex flex-col xl:flex-row gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={indexNowKey}
                    className="flex-1 bg-gray-50 border border-gray-300 px-4 py-2 text-sm font-mono text-gray-800 focus:outline-none rounded-none"
                  />
                  <button 
                    onClick={handleDownloadKey}
                    className="shrink-0 bg-white text-black border border-black px-6 py-2 text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors focus:outline-none rounded-none"
                  >
                    Скачать TXT
                  </button>
                </div>
              </div>
            </div>

            {/* Статистика пингов */}
            <div className="border border-gray-300 p-6 flex flex-col justify-between rounded-none bg-gray-50">
              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-gray-500">Ожидают отправки (Ping)</span>
                  <div className="text-4xl font-light tracking-tighter text-black mt-2">
                    {pendingPings}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <span className="text-xs uppercase tracking-widest text-gray-500">Последний успешный пинг</span>
                  <div className="text-sm font-medium tracking-tight text-gray-800 mt-1">
                    {lastPingSent}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
