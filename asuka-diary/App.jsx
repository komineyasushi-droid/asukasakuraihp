/**
 * App.jsx - 聖桜バスケ部 桜井明日香 ホームページ統合版（カレンダー・DB連携）
 * * 機能: 日付カレンダーUI、当日最新日記表示、日付プルダウン選択、Firestore連携準備
 * * コンセプト: 淡い青（#B0E0E6）を基調としたミニマルで洗練されたデザイン。
 * * キャラクター: 桜井 明日香 (正しい漢字表記)
 */
import React, { useState, useEffect, useMemo } from 'react';

// --- [ 1. Firebase/Firestore の初期設定とインポート ] ---
// TODO: GitHub/Vercelにデプロイする際は、この設定を独自のFirebaseプロジェクトの鍵に置き換えるか、環境変数から取得してください。
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'asuka-diary-default-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebaseサービスインポート（この環境ではインラインURLを使用）
const { initializeApp } = window.firebase;
const { getAuth, signInWithCustomToken, signInAnonymously } = window.firebase.auth;
const { 
  getFirestore, doc, onSnapshot, collection, query, where, limit, orderBy
} = window.firebase.firestore;

// 初期化とDB/Authインスタンスの取得
let db, auth;
if (Object.keys(firebaseConfig).length > 0) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    window.firebase.firestore.setLogLevel('debug'); 
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
} else {
    console.warn("Firebase config not found. Running in mock data mode.");
}

// --- [ 2. ユーティリティ関数と定数 ] ---

// カスタムカラーをインラインで定義 (Tailwind JITで動作)
const COLORS = {
  main: '#B0E0E6',       // 淡い青 (清涼感)
  accent: '#FF7F50',     // 情熱のアクセントカラー
  dark: '#1F3F5F',       // 濃い青 (視認性)
};

// 日付フォーマットヘルパー
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
};

// 年のプルダウン選択肢を生成 (過去5年, 当日, 未来5年)
const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -5; i <= 5; i++) {
        years.push(currentYear + i);
    }
    return years.map(year => ({
        label: `${year}年`,
        value: year
    }));
};

// --- [ 3. コンポーネント群 ] ---

// ヘッダー/ナビゲーション
const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-[#1F3F5F] bg-opacity-95 shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
      <h1 className="text-xl font-bold text-white tracking-widest">
        SEIO DIARY
      </h1>
      <nav className="hidden md:flex space-x-6">
        {['Diary', 'Profile', 'Gallery', 'About'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="text-white hover:text-[#FF7F50] transition duration-150 font-medium">
            {item}
          </a>
        ))}
      </nav>
      <button className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
    </div>
  </header>
);

// HeroSectionコンポーネント (淡青・白抜き、ボク強調)
const HeroSection = () => {
  // 画像URLは public フォルダからの相対パス
  const ASUKA_IMAGE_URL = "/asuka_main_character.png"; 
  const GYM_BG_URL = "/1760128952830.jpg"; // ユーザーのファイル名に合わせました

  return (
    <section 
      className="relative h-screen overflow-hidden flex flex-col justify-start items-center pt-16 md:pt-0"
      style={{ backgroundColor: COLORS.dark }}
    >
      
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30" 
        style={{ backgroundImage: `url('${GYM_BG_URL}')` }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: COLORS.main, opacity: 0.7 }}></div> 
      </div>

      <img
        src={ASUKA_IMAGE_URL} 
        alt="桜井明日香のバスケットボール姿" // 漢字は「明日香」です
        // Vercelでの画像の表示失敗を防ぐため、エラー時のフォールバックを追加
        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/600x900/1F3F5F/FFFFFF?text=ASUKA+LOAD+ERROR"; }}
        className="absolute bottom-0 z-10 w-2/3 max-w-sm md:w-1/3 md:max-w-md object-contain transition-transform duration-1000 ease-out"
      />

      <div className="relative z-20 text-center px-4 mt-20 md:mt-40">
        <p className="text-white text-xl md:text-2xl font-bold tracking-widest mb-4 opacity-80">SEIO BASKETBALL DIARY</p>
        
        <h1 className="text-white text-5xl sm:text-6xl md:text-8xl font-extrabold leading-tight drop-shadow-2xl">
          <span style={{ color: COLORS.accent }}>ボク</span>の、今日の
          <br className="sm:hidden" />
          バスケとアツい覚悟。
        </h1>
      </div>

      <div className="absolute bottom-10 z-20">
        <p className="text-white text-lg font-bold animate-bounce opacity-90">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 17.25-4.5-4.5-4.5 4.5m4.5-16.5v12" />
            </svg>
            SCROLL
        </p>
      </div>

    </section>
  );
};

// 日記の表示とカレンダーUIを統合したメインセクション
const DiaryCalendarSection = ({ db, auth }) => {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [currentDiary, setCurrentDiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // 認証ロジック
  useEffect(() => {
    if (!auth) return;
    const signIn = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Authentication failed:", error);
      }
    };
