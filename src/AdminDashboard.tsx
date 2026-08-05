import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface Project {
  id: string;
  client_id: string;
  project_url: string;
  status: string;
  createdAt: any;
}

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('ordoaxio@gmail.com');
  const [password, setPassword] = useState('Bos20199320');
  const [error, setError] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [newClientId, setNewClientId] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId || !newProjectUrl) return;

    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        client_id: newClientId,
        project_url: newProjectUrl,
        status: 'pending_ingestion',
        createdAt: serverTimestamp()
      });
      setNewClientId('');
      setNewProjectUrl('');
      
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
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'var(--font-main)'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '20px', textAlign: 'center' }}>Control Room</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{
                padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)',
                background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              style={{
                padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)',
                background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
            <button type="submit" className="btn-metal" style={{ border: 'none', cursor: 'pointer', marginTop: '10px' }}>
              Войти
            </button>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)',
      padding: '40px 20px',
      fontFamily: 'var(--font-main)'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div className="logo" style={{ margin: 0 }}>ORDOAXIO / HQ</div>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'transparent', border: '1px solid var(--card-border)', 
              color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' 
            }}
          >
            Выйти
          </button>
        </header>

        <div className="section-label">Добавить проект</div>
        <form onSubmit={handleAddProject} style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '40px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '15px',
          alignItems: 'end'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Client ID</label>
            <input
              type="text"
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
              placeholder="e.g. electronics_store_msk"
              required
              style={{
                padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)',
                background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Project URL</label>
            <input
              type="url"
              value={newProjectUrl}
              onChange={(e) => setNewProjectUrl(e.target.value)}
              placeholder="https://"
              required
              style={{
                padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)',
                background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn-metal" style={{ border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', padding: '10px 20px', height: '100%' }}>
            {isLoading ? '...' : 'Добавить'}
          </button>
        </form>

        <div className="section-label">Активные проекты</div>
        {isLoading && projects.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Нет проектов.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {projects.map((project) => (
              <div key={project.id} style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{project.client_id}</h3>
                  <a href={project.project_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.9rem', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                    {project.project_url}
                  </a>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: project.status === 'pending_ingestion' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: project.status === 'pending_ingestion' ? '#f59e0b' : 'var(--text-secondary)',
                    border: project.status === 'pending_ingestion' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--card-border)'
                  }}>
                    {project.status || 'unknown'}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteProject(project.id)}
                  disabled={isLoading}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
