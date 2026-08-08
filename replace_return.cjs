const fs = require('fs');

const content = fs.readFileSync('src/MasterDashboard.tsx', 'utf8');

const returnRegex = /  return \([\s\S]*?\);\n}/;

const newReturn = `  return (
    <div className="min-h-screen bg-[#040a18] text-gray-200 p-8 font-sans selection:bg-gray-300 selection:text-gray-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Заголовок */}
        <header className="mb-8">
          <h1 className="text-2xl font-normal tracking-wide uppercase text-gray-200">AIO Master Dashboard</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Левая колонка */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Форма добавления (Onboarding Form) */}
            <section className="bg-[#0a1224] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-6">Регистрация нового клиента</h2>
              <form onSubmit={handleAddClient} className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="domain" className="text-xs uppercase tracking-wider text-gray-500">URL сайта (Домен)</label>
                  <input
                    id="domain"
                    type="text"
                    placeholder="example.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full bg-[#040a18] border border-gray-700 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 transition-colors rounded"
                    required
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label htmlFor="businessType" className="text-xs uppercase tracking-wider text-gray-500">Тип бизнеса</label>
                  <select
                    id="businessType"
                    value={businessTypeInput}
                    onChange={(e) => setBusinessTypeInput(e.target.value as BusinessType)}
                    className="w-full bg-[#040a18] border border-gray-700 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 transition-colors rounded appearance-none"
                  >
                    <option value="ecommerce">Электронная коммерция (E-commerce)</option>
                    <option value="services">Услуги (Services)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm uppercase tracking-wider transition-colors focus:outline-none rounded font-medium mt-2"
                >
                  Добавить проект
                </button>
              </form>
            </section>

            {/* Консоль */}
            <section className="bg-[#0a1224] border border-gray-800 rounded-xl p-6 flex flex-col">
              <div className="border-b border-gray-800 pb-3 mb-3 flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-widest text-gray-500">Системный журнал</h2>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto font-mono text-xs flex flex-col space-y-1 pr-2 text-green-400">
                {logs.map((log, index) => (
                  <div key={index} className="break-words">
                    {log}
                  </div>
                ))}
                <div ref={endOfLogsRef} />
              </div>
            </section>

          </div>

          {/* Правая колонка */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Таблица клиентов */}
            <section className="bg-[#0a1224] border border-gray-800 rounded-xl p-6 overflow-x-auto">
              <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-6">Управление клиентами</h2>
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Домен</th>
                    <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Проиндексировано</th>
                    <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Последнее обновление</th>
                    <th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-gray-500">Нет активных клиентов</td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr 
                        key={client.id} 
                        onClick={() => setSelectedClientId(client.id)}
                        className={\`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors \${selectedClientId === client.id ? 'bg-gray-800/80' : ''}\`}
                      >
                        <td className="py-4 px-4 text-sm text-gray-200">
                          <div className="font-medium text-white">{client.domain}</div>
                          <div 
                            onClick={(e) => handleCopyId(e, client.id)}
                            className={\`text-xs font-mono mt-1 cursor-pointer transition-colors \${copiedId === client.id ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}\`}
                            title="Скопировать ID"
                          >
                            {copiedId === client.id ? 'Скопировано!' : client.id}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400">{client.indexedPages.toLocaleString('ru-RU')} стр.</td>
                        <td className="py-4 px-4 text-sm text-gray-400">{client.lastUpdate}</td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.domain); }}
                            className="px-3 py-1.5 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-800 hover:bg-red-900/20 transition-all text-xs tracking-widest uppercase rounded"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            {/* Панель управления выбранным клиентом */}
            <section className="bg-[#0a1224] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-6">Управление фичами (Master Switch Board)</h2>
              {selectedClient ? (
                <div>
                  <div className="mb-6 text-sm text-gray-400">
                    Выбран клиент: <span className="font-medium text-white ml-2">{selectedClient.domain}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <MinimalToggle
                      label="Парсинг (Parser)"
                      checked={selectedClient.features.isParserEnabled}
                      onChange={() => handleToggleFeature(selectedClient.id, 'isParserEnabled')}
                    />
                    <MinimalToggle
                      label="Генерация ИИ (AI Gen)"
                      checked={selectedClient.features.isAiGenerationEnabled}
                      onChange={() => handleToggleFeature(selectedClient.id, 'isAiGenerationEnabled')}
                    />
                    <MinimalToggle
                      label="ИИ Маршрутизация (AI Routing)"
                      checked={selectedClient.features.isAiRoutingEnabled}
                      onChange={() => handleToggleFeature(selectedClient.id, 'isAiRoutingEnabled')}
                    />
                    <MinimalToggle
                      label="Быстрая индексация (IndexNow)"
                      checked={selectedClient.features.isFastIndexingEnabled}
                      onChange={() => handleToggleFeature(selectedClient.id, 'isFastIndexingEnabled')}
                    />
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">
                  Выберите сайт из списка для управления
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}`;

const replacedContent = content.replace(returnRegex, newReturn);
fs.writeFileSync('src/MasterDashboard.tsx', replacedContent);
console.log('Done');
