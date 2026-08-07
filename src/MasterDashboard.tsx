import React, { useState, useRef, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Типы бизнеса для клиентских сайтов.
 */
type BusinessType = 'ecommerce' | 'services';

/**
 * Интерфейс управления фичами клиента (Master Switch Board).
 */
interface ClientFeatureToggles {
  isParserEnabled: boolean;
  isAiGenerationEnabled: boolean;
  isAiRoutingEnabled: boolean;
}

/**
 * Интерфейс данных клиента.
 */
interface ClientInfo {
  id: string;
  domain: string;
  businessType: BusinessType;
  indexedPages: number;
  lastUpdate: string;
  features: ClientFeatureToggles;
}

/**
 * Строгий, минималистичный компонент переключателя (Toggle).
 * Реализован без скруглений и теней для соответствия плоскому дизайну.
 */
function MinimalToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center space-x-2 cursor-pointer group">
      <div className="relative w-8 h-4">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`absolute inset-0 border transition-colors ${checked ? 'bg-gray-300 border-gray-300' : 'bg-gray-900 border-gray-600'}`}></div>
        <div className={`absolute left-0.5 top-0.5 w-3 h-3 transition-transform ${checked ? 'translate-x-4 bg-gray-900' : 'translate-x-0 bg-gray-500 group-hover:bg-gray-400'}`}></div>
      </div>
      <span className="text-xs uppercase tracking-wider text-gray-400 group-hover:text-gray-200 select-none">{label}</span>
    </label>
  );
}

/**
 * Главный дашборд управления AIO (AI Search Optimization).
 */
export default function MasterDashboard() {
  // Реальные данные клиентов из Firestore
  const [clients, setClients] = useState<ClientInfo[]>([]);

  // Состояние формы регистрации
  const [urlInput, setUrlInput] = useState('');
  const [businessTypeInput, setBusinessTypeInput] = useState<BusinessType>('ecommerce');

  // Состояние логов консоли
  const [logs, setLogs] = useState<string[]>([
    '> Система AIO Master инициализирована.',
    '> Подключение к Firebase Firestore установлено.',
    '> Ожидание команд...'
  ]);
  
  const endOfLogsRef = useRef<HTMLDivElement>(null);

  /**
   * Добавление новой записи в лог терминала.
   */
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Автоскролл консоли при добавлении новых логов
  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Подписка на коллекцию clients
  useEffect(() => {
    const clientsRef = collection(db, 'clients');
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const clientsData: ClientInfo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        clientsData.push({
          id: docSnap.id,
          domain: data.domain || '',
          businessType: data.businessType || 'ecommerce',
          indexedPages: data.indexedPages || 0,
          lastUpdate: data.lastUpdate || '',
          features: {
            isParserEnabled: data.features?.isParserEnabled || false,
            isAiGenerationEnabled: data.features?.isAiGenerationEnabled || false,
            isAiRoutingEnabled: data.features?.isAiRoutingEnabled || false,
          }
        });
      });
      setClients(clientsData);
      
      const timestamp = new Date().toLocaleTimeString('ru-RU');
      setLogs(prev => [...prev, `[${timestamp}] > Данные клиентов обновлены из базы (${clientsData.length} записей).`]);
    }, (error) => {
      const timestamp = new Date().toLocaleTimeString('ru-RU');
      setLogs(prev => [...prev, `[${timestamp}] > Ошибка подписки на клиентов: ${error.message}`]);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Обработчик добавления нового клиента в Firestore.
   */
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      const newClientData = {
        domain: urlInput.trim(),
        businessType: businessTypeInput,
        indexedPages: 0,
        lastUpdate: new Date().toISOString().slice(0, 16).replace('T', ' '),
        features: {
          isParserEnabled: false,
          isAiGenerationEnabled: false,
          isAiRoutingEnabled: false,
        }
      };

      const docRef = await addDoc(collection(db, 'clients'), newClientData);
      addLog(`> Успех: Зарегистрирован клиент ${newClientData.domain} (ID: ${docRef.id})`);
      setUrlInput('');
    } catch (error: any) {
      addLog(`> Ошибка: Не удалось добавить клиента. ${error.message}`);
    }
  };

  /**
   * Обработчик переключения тумблеров в Firestore.
   */
  const handleToggleFeature = async (clientId: string, featureKey: keyof ClientFeatureToggles) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newValue = !client.features[featureKey];
    
    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        [`features.${featureKey}`]: newValue
      });
      addLog(`> Успех: ${client.domain} -> ${featureKey} переведен в ${newValue ? 'ВКЛ' : 'ВЫКЛ'}`);
    } catch (error: any) {
      addLog(`> Ошибка: Не удалось обновить статус фичи для ${client.domain}. ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans selection:bg-gray-300 selection:text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Заголовок */}
        <header className="border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-normal tracking-wide uppercase text-gray-200">AIO Master Dashboard</h1>
        </header>

        {/* Форма добавления (Onboarding Form) */}
        <section className="bg-gray-800 border border-gray-700 p-6">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-6">Регистрация нового клиента</h2>
          <form onSubmit={handleAddClient} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex flex-col space-y-2 w-full md:w-1/3">
              <label htmlFor="domain" className="text-xs uppercase tracking-wider text-gray-500">URL сайта (Домен)</label>
              <input
                id="domain"
                type="text"
                placeholder="example.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 transition-colors rounded-none"
                required
              />
            </div>
            
            <div className="flex flex-col space-y-2 w-full md:w-1/3">
              <label htmlFor="businessType" className="text-xs uppercase tracking-wider text-gray-500">Тип бизнеса</label>
              <select
                id="businessType"
                value={businessTypeInput}
                onChange={(e) => setBusinessTypeInput(e.target.value as BusinessType)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 transition-colors rounded-none appearance-none"
              >
                <option value="ecommerce">Электронная коммерция (E-commerce)</option>
                <option value="services">Услуги (Services)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-gray-200 text-gray-900 border border-gray-200 px-6 py-2 text-sm uppercase tracking-wider hover:bg-white transition-colors focus:outline-none rounded-none font-medium"
            >
              Добавить проект
            </button>
          </form>
        </section>

        {/* Таблица клиентов */}
        <section className="bg-gray-800 border border-gray-700 p-6 overflow-x-auto">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-6">Управление клиентами</h2>
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Домен</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Проиндексировано</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Последнее обновление</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Управление (Master Switch Board)</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-500">Нет активных клиентов</td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-200">{client.domain}</td>
                    <td className="py-4 px-4 text-sm text-gray-400">{client.indexedPages.toLocaleString('ru-RU')} стр.</td>
                    <td className="py-4 px-4 text-sm text-gray-400">{client.lastUpdate}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-6">
                        <MinimalToggle
                          label="Парсинг (Parser)"
                          checked={client.features.isParserEnabled}
                          onChange={() => handleToggleFeature(client.id, 'isParserEnabled')}
                        />
                        <MinimalToggle
                          label="Генерация ИИ (AI Gen)"
                          checked={client.features.isAiGenerationEnabled}
                          onChange={() => handleToggleFeature(client.id, 'isAiGenerationEnabled')}
                        />
                        <MinimalToggle
                          label="ИИ Маршрутизация (AI Routing)"
                          checked={client.features.isAiRoutingEnabled}
                          onChange={() => handleToggleFeature(client.id, 'isAiRoutingEnabled')}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Консоль */}
        <section className="border border-gray-700 bg-black p-0 shadow-none">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-gray-500">Системный журнал (Action Log Console)</h2>
            <div className="flex space-x-2">
              {/* Декоративные "лампочки" терминала в плоском стиле */}
              <div className="w-2 h-2 bg-gray-600"></div>
              <div className="w-2 h-2 bg-gray-600"></div>
              <div className="w-2 h-2 bg-gray-400"></div>
            </div>
          </div>
          <div className="p-4 h-64 overflow-y-auto font-mono text-xs flex flex-col space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-400 break-words">
                {log}
              </div>
            ))}
            <div ref={endOfLogsRef} />
          </div>
        </section>

      </div>
    </div>
  );
}
