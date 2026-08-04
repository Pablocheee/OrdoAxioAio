import React, { useState } from 'react';
import './index.css';

const Landing: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleOpenModal = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsModalOpen(true);
        setSubmitStatus('idle');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; 
        const CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID'; 
        const text = `Новая заявка!\nИмя: ${name}\nКонтакт/URL: ${contact}`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: text,
                }),
            });

            if (response.ok) {
                setSubmitStatus('success');
                setName('');
                setContact('');
                setTimeout(() => setIsModalOpen(false), 2000);
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <React.Fragment>
            <header>
                <div className="logo">ORDOAXIO</div>
            </header>

            <main>
                {/* HERO */}
                <section className="hero">
                    <div className="explanation">
                        <p className="step-text" style={{ color: 'var(--text-primary)', fontWeight: 400 }}>
                            OrdoAxio SaaS - это платформа AIO (Architecture for Information Optimization). Система автоматически находит «Data Voids» (информационные пустоты) и структурирует ваши данные через JSON-LD микроразметку, чтобы ИИ-поисковики (ChatGPT, Perplexity, Gemini, Алиса, GigaChat) высоко ранжировали ваш бизнес.
                        </p>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <div className="section-label">Как это работает</div>
                <section className="steps-container">
                    <div className="step-item">
                        <div className="step-icon">01</div>
                        <div className="step-text">Наш <b>Vercel Serverless бэкенд</b> непрерывно анализирует рынок, чтобы находить «Data Voids» (низкоконкурентные запросы).</div>
                    </div>
                    <div className="step-item">
                        <div className="step-icon">02</div>
                        <div className="step-text">Система автоматически выстраивает <b>машиночитаемую архитектуру и JSON-LD микроразметку</b>, надежно сохраняя все активы в Firebase (Firestore).</div>
                    </div>
                    <div className="step-item">
                        <div className="step-icon">03</div>
                        <div className="step-text">Структурированные данные гарантируют <b>высокую индексацию и приоритетные рекомендации</b> в ChatGPT, Perplexity, Gemini, Алисе и GigaChat.</div>
                    </div>
                </section>

                <div className="section-label">Тарифы</div>
                <section className="pricing-container">
                    <article className="price-card">
                        <h3 className="price-title">Месячный</h3>
                        <div className="price-value">14 900 ₽ / мес</div>
                        <p className="price-desc">Оплата каждый месяц.</p>
                        <ul className="price-features">
                            <li>Развертывание на React/Vercel</li>
                            <li>Безлимитное программное SEO</li>
                            <li>Интеграция Firebase Auth</li>
                            <li>Telegram Bot API</li>
                        </ul>
                        <button onClick={handleOpenModal} className="btn-metal" style={{ width: '100%', border: 'none', cursor: 'pointer' }}>Оформить подписку</button>
                    </article>

                    <article className="price-card featured">
                        <h3 className="price-title">Годовой</h3>
                        <div className="price-value">149 000 ₽ / год</div>
                        <p className="price-desc">Выгода 29 800 ₽ (два месяца в подарок).</p>
                        <ul className="price-features">
                            <li>Развертывание на React/Vercel</li>
                            <li>Безлимитное программное SEO</li>
                            <li>Интеграция Firebase Auth</li>
                            <li>Telegram Bot API</li>
                        </ul>
                        <button onClick={handleOpenModal} className="btn-metal" style={{ width: '100%', border: 'none', cursor: 'pointer' }}>Оформить подписку</button>
                    </article>
                </section>

                {/* FAQ SECTION */}
                <div className="section-label">FAQ / Вопросы</div>
                <section className="faq-container" style={{ marginBottom: '60px', width: '100%' }}>
                    
                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Как быстро запускается платформа?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>Развертывание AIO-архитектуры и первичный сбор Data Voids для вашей ниши занимает до 48 часов.</p>
                    </details>

                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Нужен ли мне разработчик для правок?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>Система полностью автономна. Управление платформой и мониторинг позиций осуществляется через инженерию данных, Telegram Bot API и закрытый дашборд.</p>
                    </details>

                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Как происходит управление и мониторинг?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>Мы используем Telegram для мгновенных уведомлений о захваченных Data Voids, а Firebase Auth обеспечивает безопасный доступ к вашему проекту.</p>
                    </details>

                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Что такое AIO и Data Voids?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>Наш бэкенд обращается к ИИ для поиска низкоконкурентных запросов («Data Voids»). Затем платформа автоматически формирует семантическое ядро и микроразметку, чтобы захватить этот трафик в ChatGPT, Perplexity, Gemini, Алисе и GigaChat.</p>
                    </details>

                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Как происходит оплата?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>Оплата производится по подписке (SaaS-модель) ежемесячно или ежегодно. Вы получаете автоматический доступ к дашборду сразу после оплаты.</p>
                    </details>

                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Какие гарантии?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
                            Первые 14 дней после сдачи - бесплатная поддержка логики работы. Если генерация JSON-LD сбоит, Vercel-функции выдают ошибки или отваливается база Firebase - чиним за свой счёт.
                        </p>
                    </details>

                    <details style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '10px', padding: '15px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}>Почему это выгоднее обычного SEO?</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
                            Традиционное SEO требует постоянных затрат. Наша автоматизированная архитектура на базе Firebase/Vercel создает перманентный цифровой актив, не требующий обслуживания. AIO эффективно захватывает современный ИИ-трафик.
                        </p>
                    </details>
                </section>

                <div className="invisible-context" aria-hidden="false">
                    SaaS платформа для AIO в <span className="user-city">вашем городе</span>, захват Data Voids, JSON-LD разметка.
                </div>
            </main>

            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-main)', border: '1px solid var(--card-border)',
                        padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px',
                        position: 'relative'
                    }}>
                        <button onClick={() => setIsModalOpen(false)} style={{
                            position: 'absolute', top: '10px', right: '15px',
                            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                            fontSize: '1.5rem', cursor: 'pointer'
                        }}>×</button>
                        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Оставить заявку</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input 
                                type="text" 
                                placeholder="Ваше имя" 
                                required 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)',
                                    background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                            <input 
                                type="text" 
                                placeholder="Проект (URL) или Контакт" 
                                required 
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                style={{
                                    padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)',
                                    background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                            <button type="submit" className="btn-metal" disabled={isSubmitting} style={{ border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? 'Отправка...' : 'Отправить'}
                            </button>
                            {submitStatus === 'success' && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', textAlign: 'center' }}>Успешно отправлено!</p>}
                            {submitStatus === 'error' && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>Ошибка при отправке.</p>}
                        </form>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default Landing;
