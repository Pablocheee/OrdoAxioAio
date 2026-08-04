// === START: UI_MODULE ===
export interface Product {
    id: string;
    title: string;
    description: string;
    stack: string[];
    details: string;
}

const PRODUCTS: Product[] = [
    {
        id: "core-sync",
        title: "AI_CORE ARCH",
        description: "Разработка невидимой инфраструктуры для ИИ-агентов и LLM.",
        stack: ["TypeScript", "n8n", "Vercel"],
        details: "Архитектура, ориентированная на семантическую индексацию и работу без прямого интерфейса."
    },
    {
        id: "tg-systems",
        title: "TG_BOT LOGIC",
        description: "Сложные Telegram-системы с глубокой автоматизацией.",
        stack: ["Node.js", "Telegram API", "Webhooks"],
        details: "Создание ботов, которые интегрируются в рабочие процессы как часть команды."
    }
];

export const renderProducts = async (): Promise<void> => {
    const root = document.getElementById('catalog-root');
    if (!root) return;

    root.innerHTML = PRODUCTS.map(p => `
        <article class="node-card">
            <div class="node-header">
                <h3>${p.title}</h3>
                <span class="node-tag">DEPLOYED</span>
            </div>
            <p>${p.description}</p>
            <div style="font-size: 0.8rem; margin-top: 10px; color: #00ff41; opacity: 0.7;">
                ${p.stack.join(' | ')}
            </div>
            <button onclick="toggleProduct('${p.id}')" style="background:none; border: 1px solid #333; color: #fff; margin-top: 15px; cursor: pointer; padding: 5px 10px;">
                DETAILS_
            </button>
            <div id="details-${p.id}" style="display:none; margin-top: 10px; font-size: 0.85rem; border-left: 1px solid #00ff41; padding-left: 10px; opacity: 0.8;">
                ${p.details}
            </div>
        </article>
    `).join('');
};

export const toggleProduct = (id: string): void => {
    const el = document.getElementById(`details-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};
// === END: UI_MODULE ===