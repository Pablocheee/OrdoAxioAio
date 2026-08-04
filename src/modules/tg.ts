// === START: TG_MODULE ===
// [SETTINGS]
/* // МЕНЯТЬ ТУТ: Раскомментировать, когда появятся реальные токены
const TG_CONFIG = {
    botToken: "YOUR_TOKEN",
    chatId: "YOUR_ID"
};
*/

export const sendMessage = async (text: string): Promise<void> => {
    // Временно выводим в консоль, чтобы избежать ошибок неиспользуемых переменных
    console.log(`[TG_LOG]: ${text}`);
    
    /* await fetch(`https://api.telegram.org/bot${TG_CONFIG.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CONFIG.chatId, text: text })
    });
    */
};
// === END: TG_MODULE ===