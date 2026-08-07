import * as cheerio from 'cheerio';
import * as crypto from 'crypto';

/**
 * Интерфейс, описывающий структурированные данные, извлеченные из HTML.
 * Включает заголовки, описания, списки, а также опциональные таблицы характеристик и цены.
 */
export interface ParsedContent {
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  description: string;
  lists: string[];
  tables?: Record<string, string>;
  prices?: string[];
}

/**
 * Основная функция для очистки HTML и извлечения значимых данных.
 * Устойчива к некорректному HTML, возвращает пустые массивы/строки вместо ошибок.
 * 
 * @param html Сырой HTML-код страницы.
 * @param businessType Тип бизнеса: 'e-commerce' (коммерция) или 'services' (услуги), влияет на приоритет извлечения.
 * @returns Структурированный объект ParsedContent.
 */
export function parseHtmlContent(html: string, businessType: 'e-commerce' | 'services'): ParsedContent {
  // Инициализируем базовую структуру возвращаемого объекта
  const result: ParsedContent = {
    headings: { h1: [], h2: [], h3: [] },
    description: '',
    lists: []
  };

  try {
    const $ = cheerio.load(html);

    // 1. Фаза очистки: удаляем шум и нерелевантные элементы
    $(
      'script, style, header, footer, nav, iframe, svg, noscript, ' +
      '[class*="widget"], [id*="widget"], [class*="popup"], [id*="popup"], ' +
      '[class*="banner"], [class*="cookie"]'
    ).remove();
    
    // Удаляем HTML-комментарии
    $('*').contents().each(function(_, el) {
      if (el.type === 'comment') {
        $(el).remove();
      }
    });

    // 2. Определение главного контейнера (main, article или body)
    let $main = $('main');
    if ($main.length === 0) {
      $main = $('article');
    }
    if ($main.length === 0) {
      $main = $('body');
    }

    // Извлечение заголовков
    $main.find('h1').each((_, el) => {
      const text = $(el).text().trim();
      if (text) result.headings.h1.push(text);
    });
    $main.find('h2').each((_, el) => {
      const text = $(el).text().trim();
      if (text) result.headings.h2.push(text);
    });
    $main.find('h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) result.headings.h3.push(text);
    });

    // Извлечение абзацев (описания)
    const paragraphs: string[] = [];
    $main.find('p').each((_, el) => {
      const text = $(el).text().trim();
      // Отфильтровываем слишком короткие абзацы (вероятно, кнопки или шум)
      if (text && text.length > 20) {
        paragraphs.push(text);
      }
    });
    result.description = paragraphs.join('\n\n');

    // Извлечение списков
    $main.find('ul, ol').each((_, listEl) => {
      const listItems: string[] = [];
      $(listEl).find('li').each((_, liEl) => {
        const text = $(liEl).text().trim();
        if (text) listItems.push(text);
      });
      if (listItems.length > 0) {
        result.lists.push(listItems.join('; '));
      }
    });

    // Извлечение данных в зависимости от типа бизнеса
    if (businessType === 'e-commerce') {
      // Для интернет-магазинов приоритет отдается ценам и таблицам характеристик
      result.tables = {};
      result.prices = [];

      // Простой поиск цен (числа с символами валют, например, $100, 100 руб, 100₽)
      const priceRegex = /(?:[$€£₽]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*(?:руб|р\.|usd|eur|₽))/gi;
      $main.find('*').each((_, el) => {
        // Проверяем только текстовые узлы, чтобы избежать дублирования из-за вложенности
        const elText = $(el).children().length === 0 ? $(el).text().trim() : '';
        if (elText) {
          const matches = elText.match(priceRegex);
          if (matches) {
            result.prices!.push(...matches);
          }
        }
      });
      // Оставляем только уникальные цены
      result.prices = [...new Set(result.prices)];

      // Парсинг таблиц со спецификациями (ожидаем структуру ключ-значение в ячейках)
      $main.find('table tr').each((_, trEl) => {
        const tds = $(trEl).find('td, th');
        if (tds.length >= 2) {
          const key = $(tds[0]).text().trim();
          const value = $(tds[1]).text().trim();
          if (key && value && result.tables) {
            result.tables[key] = value;
          }
        }
      });
    }

  } catch (error) {
    // В случае критической ошибки парсинга логируем ее, но возвращаем частично заполненный или пустой объект
    console.error('Ошибка при парсинге HTML:', error);
  }

  return result;
}

/**
 * Генерирует детерминированный SHA-256 хеш на основе переданного объекта.
 * Полезно для отслеживания изменений в контенте.
 * 
 * @param data Объект ParsedContent или любой другой объект для хеширования.
 * @returns SHA-256 хеш в формате hex-строки.
 */
export function generateContentHash(data: ParsedContent | object): string {
  try {
    const jsonString = JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  } catch (error) {
    console.error('Ошибка при генерации хеша:', error);
    return '';
  }
}
