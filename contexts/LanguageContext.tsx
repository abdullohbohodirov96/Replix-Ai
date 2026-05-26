'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Lang = 'uz' | 'ru' | 'en'

const translations = {
  uz: {
    dashboard: 'Dashboard', managers: 'Managerlar', calls: "Qo'ng'iroqlar",
    reports: 'Hisobotlar', analytics: 'AI Tahlil', integrations: 'Integratsiyalar',
    users: 'Foydalanuvchilar', settings: 'Sozlamalar', profile: 'Profil',
    logout: 'Chiqish', admin: 'Admin', search: 'Qidirish',
    totalCalls: "Jami qo'ng'iroqlar", avgRating: "O'rtacha baho",
    today: 'Bugun', week: 'Hafta', month: 'Oy', custom: 'Boshqa',
    sale: 'Sotildi', followup: 'Davom', rejected: 'Rad etildi', unknown: "Noma'lum",
    positive: 'Ijobiy', negative: 'Salbiy', neutral: 'Neytral',
    hot: 'Issiq', warm: 'Iliq', cold: 'Sovuq',
    save: 'Saqlash', cancel: 'Bekor', edit: 'Tahrirlash', delete: "O'chirish",
    add: "Qo'shish", view: 'Ko\'rish', archive: 'Arxivlash',
    upload: 'Yuklash', analyze: 'Tahlil', loading: 'Yuklanmoqda...',
    fileName: 'Fayl nomi', manager: 'Manager', phone: 'Telefon',
    duration: 'Davomiyligi', status: 'Holati', category: 'Kategoriya',
    score: 'Ball', analyzedAt: 'Tahlil vaqti', createdAt: 'Yaratilgan',
    transcription: 'Transkripsiya', summary: 'Xulosa', nextSteps: 'Keyingi qadam',
    criteria: 'Mezonlar', objections: "E'tirozlar", speechRatio: 'Nutq nisbati',
    errors: 'Xatoliklar', recommendations: 'Tavsiyalar',
    addCategory: "Kategoriya qo'shish", addCriteria: "Mezon qo'shish",
    companySettings: 'Kompaniya sozlamalari', profileSettings: 'Profil sozlamalari',
    aiContext: 'AI konteksti', industry: 'Soha',
    project: 'Loyiha', projects: 'Loyihalar',
    leadQuality: 'Lead sifati',
    noData: "Ma'lumot yo'q",
    callDetail: "Qo'ng'iroq tafsiloti",
  },
  ru: {
    dashboard: 'Дашборд', managers: 'Менеджеры', calls: 'Звонки',
    reports: 'Отчёты', analytics: 'AI Анализ', integrations: 'Интеграции',
    users: 'Пользователи', settings: 'Настройки', profile: 'Профиль',
    logout: 'Выйти', admin: 'Админ', search: 'Поиск',
    totalCalls: 'Всего звонков', avgRating: 'Средний рейтинг',
    today: 'Сегодня', week: 'Неделя', month: 'Месяц', custom: 'Другой',
    sale: 'Продажа', followup: 'Продолжение', rejected: 'Отказ', unknown: 'Неизвестно',
    positive: 'Положительный', negative: 'Отрицательный', neutral: 'Нейтральный',
    hot: 'Горячий', warm: 'Тёплый', cold: 'Холодный',
    save: 'Сохранить', cancel: 'Отмена', edit: 'Изменить', delete: 'Удалить',
    add: 'Добавить', view: 'Просмотр', archive: 'Архив',
    upload: 'Загрузить', analyze: 'Анализ', loading: 'Загрузка...',
    fileName: 'Имя файла', manager: 'Менеджер', phone: 'Телефон',
    duration: 'Длительность', status: 'Статус', category: 'Категория',
    score: 'Балл', analyzedAt: 'Время анализа', createdAt: 'Создан',
    transcription: 'Транскрипция', summary: 'Резюме', nextSteps: 'Следующие шаги',
    criteria: 'Критерии', objections: 'Возражения', speechRatio: 'Соотношение речи',
    errors: 'Ошибки', recommendations: 'Рекомендации',
    addCategory: 'Добавить категорию', addCriteria: 'Добавить критерий',
    companySettings: 'Настройки компании', profileSettings: 'Настройки профиля',
    aiContext: 'AI контекст', industry: 'Отрасль',
    project: 'Проект', projects: 'Проекты',
    leadQuality: 'Качество лида',
    noData: 'Нет данных',
    callDetail: 'Детали звонка',
  },
  en: {
    dashboard: 'Dashboard', managers: 'Managers', calls: 'Calls',
    reports: 'Reports', analytics: 'AI Analytics', integrations: 'Integrations',
    users: 'Users', settings: 'Settings', profile: 'Profile',
    logout: 'Logout', admin: 'Admin', search: 'Search',
    totalCalls: 'Total calls', avgRating: 'Avg rating',
    today: 'Today', week: 'Week', month: 'Month', custom: 'Custom',
    sale: 'Sale', followup: 'Follow-up', rejected: 'Rejected', unknown: 'Unknown',
    positive: 'Positive', negative: 'Negative', neutral: 'Neutral',
    hot: 'Hot', warm: 'Warm', cold: 'Cold',
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
    add: 'Add', view: 'View', archive: 'Archive',
    upload: 'Upload', analyze: 'Analyze', loading: 'Loading...',
    fileName: 'File name', manager: 'Manager', phone: 'Phone',
    duration: 'Duration', status: 'Status', category: 'Category',
    score: 'Score', analyzedAt: 'Analyzed at', createdAt: 'Created',
    transcription: 'Transcription', summary: 'Summary', nextSteps: 'Next steps',
    criteria: 'Criteria', objections: 'Objections', speechRatio: 'Speech ratio',
    errors: 'Errors', recommendations: 'Recommendations',
    addCategory: 'Add category', addCriteria: 'Add criteria',
    companySettings: 'Company settings', profileSettings: 'Profile settings',
    aiContext: 'AI context', industry: 'Industry',
    project: 'Project', projects: 'Projects',
    leadQuality: 'Lead quality',
    noData: 'No data',
    callDetail: 'Call detail',
  },
}

type TKey = keyof typeof translations.uz

const LanguageContext = createContext<{ lang: Lang; t: (key: TKey) => string; setLang: (l: Lang) => void }>({
  lang: 'uz', t: (k) => translations.uz[k] || k, setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('uz')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && ['uz', 'ru', 'en'].includes(saved)) setLang(saved)
  }, [])

  const handleSetLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('lang', l)
  }

  const t = (key: TKey): string => translations[lang][key] || translations.uz[key] || key

  return (
    <LanguageContext.Provider value={{ lang, t, setLang: handleSetLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
