// === START: CORE_APP ===
// [SETTINGS]
const APP_CONFIG = {
    version: "3.4.0"
};

// МЕНЯТЬ ТУТ: Стили теперь в index.html, тут только логика
import { initGeo } from '../modules/geo';
import { renderProducts, toggleProduct } from '../modules/ui';

const bootstrap = async (): Promise<void> => {
    (window as any).toggleProduct = toggleProduct;
    try {
        await Promise.all([initGeo(), renderProducts()]);
        console.log(`[ORDO_AXIO]: System v${APP_CONFIG.version}`);
    } catch (e) {
        console.error("[BOOT_ERROR]:", e);
    }
};

document.addEventListener('DOMContentLoaded', bootstrap);
// === END: CORE_APP ===