// === START: GEO_MODULE ===
export const initGeo = async (): Promise<void> => {
    const geoEl = document.querySelector('.user-city');
    if (!geoEl) return;

    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Форматируем вывод как в консоли
        geoEl.innerHTML = `LOC: ${data.city.toUpperCase()} // IP: ${data.ip}`;
    } catch (error) {
        // Оставляем дефолт, если API заблокировано
        geoEl.innerHTML = `LOC: TORE_ANONYMOUS`;
    }
};
// === END: GEO_MODULE ===