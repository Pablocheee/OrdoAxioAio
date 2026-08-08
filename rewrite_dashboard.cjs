const fs = require('fs');

const content = fs.readFileSync('src/MasterDashboard.tsx', 'utf8');

let newContent = content.replace(
  /const \[clients, setClients\] = useState<ClientInfo\[\]>\(\[\]\);/,
  `const [clients, setClients] = useState<ClientInfo[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);`
);

newContent = newContent.replace(
  /const handleDeleteClient = async \(clientId: string, domain: string\) => {[\s\S]*?};\n/,
  `const handleDeleteClient = async (clientId: string, domain: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот сайт и связанные с ним данные?")) {
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        if (selectedClientId === clientId) setSelectedClientId(null);
        addLog(\`> Успех: Удален клиент \${domain} (ID: \${clientId})\`);
      } catch (error: any) {
        addLog(\`> Ошибка: Не удалось удалить клиента \${domain}. \${error.message}\`);
      }
    }
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);\n`
);

newContent = newContent.replace(
  /className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans selection:bg-gray-300 selection:text-gray-900"/,
  'className="min-h-screen bg-[#040a18] text-gray-100 p-8 font-sans selection:bg-gray-300 selection:text-gray-900"'
);

newContent = newContent.replace(
  /<section className="bg-gray-800 border border-gray-700 p-6">/g,
  '<section className="bg-[#0a1224] border border-gray-800 p-4 rounded-sm">'
);

newContent = newContent.replace(
  /<section className="bg-gray-800 border border-gray-700 p-6 overflow-x-auto">/,
  '<section className="bg-[#0a1224] border border-gray-800 p-4 rounded-sm overflow-x-auto">'
);

newContent = newContent.replace(
  /<th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal">Управление \(Master Switch Board\)<\/th>\n\s*<th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal text-right">Действия<\/th>/,
  '<th className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-normal text-right">Действия</th>'
);

newContent = newContent.replace(
  /<td colSpan=\{5\} className="py-6 text-center text-sm text-gray-500">Нет активных клиентов<\/td>/,
  '<td colSpan={4} className="py-6 text-center text-sm text-gray-500">Нет активных клиентов</td>'
);

const tableBodyRegex = /clients\.map\(\(client\) => \([\s\S]*?\)\)\n\s*\)}/;
const newTableBody = `clients.map((client) => (
                  <tr 
                    key={client.id} 
                    onClick={() => setSelectedClientId(client.id)}
                    className={\`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors \${selectedClientId === client.id ? 'bg-gray-800/50' : ''}\`}
                  >
                    <td className="py-4 px-4 text-sm text-gray-200">
                      <div>{client.domain}</div>
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
                        className="px-4 py-1.5 border border-gray-800 text-gray-500 hover:text-red-400 hover:border-red-800 transition-colors text-xs tracking-widest uppercase rounded-none"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              )}`;

newContent = newContent.replace(tableBodyRegex, newTableBody);

const controlsSection = `
        {/* Панель управления выбранным клиентом */}
        <section className="bg-[#0a1224] border border-gray-800 p-4 rounded-sm">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-6">Управление фичами (Master Switch Board)</h2>
          {selectedClient ? (
            <div>
              <div className="mb-6 text-sm text-gray-300">
                Выбран клиент: <span className="font-medium text-white">{selectedClient.domain}</span>
              </div>
              <div className="flex flex-wrap items-center gap-8">
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
`;

newContent = newContent.replace(/<\/table>\n\s*<\/section>\n/, `</table>\n        </section>\n${controlsSection}`);

newContent = newContent.replace(
  /<section className="border border-gray-700 bg-black p-0 shadow-none">[\s\S]*?<\/section>/,
  `<section className="bg-[#0a1224] border border-gray-800 p-4 rounded-sm flex flex-col">
          <div className="border-b border-gray-800 pb-3 mb-3 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-gray-500">Системный журнал (Action Log Console)</h2>
            <div className="flex space-x-2">
              {/* Декоративные "лампочки" терминала в плоском стиле */}
              <div className="w-2 h-2 bg-gray-600 rounded-sm"></div>
              <div className="w-2 h-2 bg-gray-600 rounded-sm"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto font-mono text-xs flex flex-col space-y-1 pr-2">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-400 break-words">
                {log}
              </div>
            ))}
            <div ref={endOfLogsRef} />
          </div>
        </section>`
);

fs.writeFileSync('src/MasterDashboard.tsx', newContent);
console.log('done');
