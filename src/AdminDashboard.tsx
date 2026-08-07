import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface Project {
  id: string;
  client_id: string;
  project_url: string;
  status: string;
  business_type?: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('ordoaxio@gmail.com');
  const [password, setPassword] = useState('Bos20199320');
  const [error, setError] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [newClientId, setNewClientId] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('ecommerce');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    setIsLoading(true);
    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      projectsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setProjects(projectsData);
      setIsLoading(false);
    }, (err) => {
      console.error('Ошибка загрузки проектов:', err);
      setIsLoading(false);
    });

    return () => unsubscribeProjects();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyScript = (projectId: string, clientId: string) => {
    const scriptTag = `<script src="https://ordoaxio.vercel.app/assets/injector.js?clientId=${clientId}" async></script>`;
    navigator.clipboard.writeText(scriptTag);
    setCopiedId(projectId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId || !newProjectUrl) return;

    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        client_id: newClientId,
        project_url: newProjectUrl,
        business_type: newBusinessType,
        status: 'pending_ingestion',
        createdAt: serverTimestamp()
      });
      setNewClientId('');
      setNewProjectUrl('');
      setNewBusinessType('ecommerce');
      
      fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUrl: newProjectUrl })
      })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Ошибка сервера: ${res.status} - ${text.substring(0, 50)}`);
        }
        return res.json();
      })
      .then(async (result) => {
        if (result.success) {
           await addDoc(collection(db, 'raw_client_data'), {
             projectId: docRef.id,
             data: result.data,
             createdAt: serverTimestamp()
           });
           await updateDoc(docRef, { status: 'analyzing' });

           // --- ЗАПУСК АНАЛИЗА GEMINI ---
           fetch('/api/analyze', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ projectId: docRef.id })
           })
           .then(async analyzeRes => {
             if (!analyzeRes.ok) throw new Error('Сбой API анализатора');
             return analyzeRes.json();
           })
           .then(async analyzeData => {
             if (analyzeData.success) {
               alert('Анализ завершен успешно!');
             } else {
               await updateDoc(docRef, { status: 'analysis_failed' });
               alert(`Ошибка нейросети: ${analyzeData.error}`);
             }
           })
           .catch(async analyzeErr => {
             console.error('Ошибка вызова Gemini:', analyzeErr);
             await updateDoc(docRef, { status: 'analysis_failed' });
             alert(`Ошибка нейросети: ${analyzeErr.message}`);
           });
           // --- КОНЕЦ БЛОКА АНАЛИЗА ---
        } else {
           console.error('Ошибка парсинга:', result.error);
           await updateDoc(docRef, { status: 'ingestion_failed' });
           alert(`Ошибка сбора данных: ${result.error || 'Неизвестная ошибка'}`);
        }
      })
      .catch(async (err) => {
        console.error('Ошибка триггера парсера:', err);
        await updateDoc(docRef, { status: 'ingestion_failed' });
        alert(`Сетевая ошибка или сбой API: ${err.message}`);
      });

    } catch (err) {
      console.error('Ошибка добавления:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Удалить проект?')) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err) {
      console.error('Ошибка удаления:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#040a18] text-gray-200 flex items-center justify-center p-5 font-sans">
        <div className="bg-[#0a1224] border border-gray-800 rounded-none p-10 w-full max-w-md shadow-2xl">
          <h1 className="text-xl font-medium mb-6 text-center text-white tracking-widest uppercase">Secret Command Center</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="px-4 py-3 bg-[#040a18] border border-gray-800 text-gray-200 outline-none focus:border-blue-500/50 transition-colors rounded-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="px-4 py-3 bg-[#040a18] border border-gray-800 text-gray-200 outline-none focus:border-blue-500/50 transition-colors rounded-none"
            />
            <button type="submit" className="mt-2 px-6 py-3 bg-blue-600/10 text-blue-400 border border-blue-900/50 hover:bg-blue-600/20 hover:border-blue-700 transition-all uppercase tracking-widest text-sm font-medium rounded-none">
              Войти
            </button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040a18] text-gray-300 p-6 md:p-10 font-sans selection:bg-blue-900/50">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="text-xl font-bold tracking-widest text-white uppercase">ORDOAXIO / HQ</div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-xs tracking-widest uppercase rounded-none"
          >
            Выйти
          </button>
        </header>

        <section className="space-y-6">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-800 pb-2">Добавить проект</div>
          <form onSubmit={handleAddProject} className="bg-[#0a1224] border border-gray-800 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-end rounded-none">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs text-gray-500 uppercase tracking-widest">Client ID</label>
              <input
                type="text"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                placeholder="e.g. electronics_store_msk"
                required
                className="px-4 py-3 bg-[#040a18] border border-gray-800 text-gray-200 outline-none focus:border-blue-500/50 transition-colors w-full rounded-none"
              />
            </div>
            
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs text-gray-500 uppercase tracking-widest">Тип бизнеса</label>
              <select
                value={newBusinessType}
                onChange={(e) => setNewBusinessType(e.target.value)}
                className="px-4 py-3 bg-[#040a18] border border-gray-800 text-gray-200 outline-none focus:border-blue-500/50 transition-colors w-full rounded-none appearance-none cursor-pointer"
              >
                <option value="ecommerce">E-commerce</option>
                <option value="services">Услуги (Services)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs text-gray-500 uppercase tracking-widest">Project URL</label>
              <input
                type="url"
                value={newProjectUrl}
                onChange={(e) => setNewProjectUrl(e.target.value)}
                placeholder="https://"
                required
                className="px-4 py-3 bg-[#040a18] border border-gray-800 text-gray-200 outline-none focus:border-blue-500/50 transition-colors w-full rounded-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="px-8 py-3 bg-blue-600/10 text-blue-400 border border-blue-900/50 hover:bg-blue-600/20 hover:border-blue-700 transition-all uppercase tracking-widest text-xs font-medium h-[46px] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
            >
              {isLoading ? 'Загрузка...' : 'Добавить'}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-800 pb-2">Активные проекты</div>
          
          {isLoading && projects.length === 0 ? (
            <p className="text-sm text-gray-500">Загрузка данных...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500">Нет активных проектов.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {projects.map((project) => (
                <div key={project.id} className="bg-[#0a1224] border border-gray-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 rounded-none">
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="text-base text-gray-200 hover:text-white transition-colors truncate font-medium">
                        {project.project_url}
                      </a>
                      <span className={`text-[10px] px-2 py-1 uppercase tracking-widest border rounded-none ${
                        project.status === 'pending_ingestion' 
                          ? 'bg-amber-900/20 text-amber-500 border-amber-900/50' 
                          : 'bg-gray-800/30 text-gray-400 border-gray-800'
                      }`}>
                        {project.status || 'unknown'}
                      </span>
                      {project.business_type && (
                        <span className="text-[10px] px-2 py-1 uppercase tracking-widest border border-blue-900/50 bg-blue-900/10 text-blue-400 rounded-none">
                          {project.business_type}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Client ID:</span>
                      <code className="text-xs text-gray-400 font-mono bg-[#040a18] px-2 py-1 border border-gray-800">{project.client_id}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => handleCopyScript(project.id, project.client_id)}
                      className="flex-1 md:flex-none px-6 py-2 bg-gray-800/30 text-gray-300 border border-gray-700 hover:bg-gray-800/50 hover:text-white transition-all text-xs tracking-widest uppercase rounded-none"
                    >
                      {copiedId === project.id ? 'Скопировано!' : 'Копировать скрипт'}
                    </button>
                    <button 
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={isLoading}
                      className="px-6 py-2 bg-red-900/10 text-red-500 border border-red-900/30 hover:bg-red-900/20 hover:border-red-900/50 transition-all text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
