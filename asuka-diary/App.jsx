/**
 * App.jsx - 聖桜バスケ部 桜井明日香 ホームページ統合版（カレンダー・DB連携）
 * * 機能: 日付カレンダーUI、当日最新日記表示、日付プルダウン選択、Firestore連携準備
 * * コンセプト: 淡い青（#B0E0E6）を基調としたミニマルで洗練されたデザイン。
 * * キャラクター: 桜井 明日香 (一人称: ボク)
 */
import React, { useState, useEffect, useMemo } from 'react';

// --- [ 1. Firebase/Firestore の初期設定とインポート ] ---
// TODO: GitHub/Vercelにデプロイする際は、この設定を独自のFirebaseプロジェクトの鍵に置き換えるか、環境変数から取得してください。
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'asuka-diary-default-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebaseサービスインポート（この環境ではインラインURLを使用）
// NOTE: window.firebaseが提供されていない環境ではエラーになる可能性があります。
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
        alt="桜井明日香のバスケットボール姿" // 漢字を「明日香」に修正
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

    signIn();

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      setUserId(user?.uid || crypto.randomUUID());
    });
    return () => unsubscribeAuth();
  }, [auth]);

  // Firestoreから選択日付の日記を取得
  useEffect(() => {
    if (!db || !userId) return;
    setLoading(true);

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const date = selectedDate.getDate();

    const diaryRef = collection(db, 'artifacts', appId, 'users', userId, 'diaries');
    const searchDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;

    const q = query(
      diaryRef,
      where('dateString', '==', searchDate),
      limit(1) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.docs.length > 0) {
        setCurrentDiary(snapshot.docs[0].data());
      } else {
        // 日記がない場合のモックデータ
        setCurrentDiary({
            title: `[日記なし] ${formatDate(selectedDate)} のボク`,
            excerpt: "今日は特に何も書いてないみたい。バスケに集中してたのかな？また次の日を見てみて！",
            content: "...",
            dateString: searchDate
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, selectedDate]);

  // カレンダーの日付セルコンポーネント
  const CalendarCell = ({ date }) => {
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = date.toDateString() === selectedDate.toDateString();

    const dayClass = isSelected 
      ? `bg-[${COLORS.accent}] text-white font-bold shadow-md`
      : isToday 
      ? `bg-[${COLORS.main}] text-[${COLORS.dark}] font-bold border-2 border-[${COLORS.dark}]`
      : 'bg-white text-gray-700 hover:bg-gray-100';

    return (
      <button
        onClick={() => setSelectedDate(date)}
        className={`w-full aspect-square flex items-center justify-center rounded-lg transition duration-200 text-sm md:text-base ${dayClass}`}
        style={{ borderWidth: isSelected ? '0' : (isToday ? '2px' : '1px'), borderColor: isToday ? COLORS.dark : '#e5e7eb' }}
      >
        {date.getDate()}
      </button>
    );
  };

  // カレンダー表示ロジック
  const renderCalendar = () => {
    const firstDayOfMonth = new Date(selectedYear, selectedDate.getMonth(), 1);
    const lastDayOfMonth = new Date(selectedYear, selectedDate.getMonth() + 1, 0);
    const numDays = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0: Sunday, 6: Saturday

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-1"></div>);
    }
    for (let i = 1; i <= numDays; i++) {
      const date = new Date(selectedYear, selectedDate.getMonth(), i);
      days.push(<div key={i} className="p-1"><CalendarCell date={date} /></div>);
    }
    
    return (
        <div className="grid grid-cols-7 gap-1 md:gap-2 p-3" style={{ border: `1px solid ${COLORS.main}`, backgroundColor: 'white' }}>
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-500 pb-1 border-b" style={{ borderColor: COLORS.main }}>{day}</div>
            ))}
            {days}
        </div>
    );
  };
  
  const yearOptions = generateYearOptions();
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i }));

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setSelectedYear(newYear);
    // 年が変わっても、月と日は維持
    const newDate = new Date(newYear, selectedDate.getMonth(), selectedDate.getDate());
    setSelectedDate(newDate);
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    // 月が変わっても、年は維持
    const newDate = new Date(selectedYear, newMonth, selectedDate.getDate());
    setSelectedDate(newDate);
  };

  return (
    <section className="py-16 px-4 md:py-24" style={{ backgroundColor: COLORS.dark }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12" id="diary-section">
        
        {/* 1. カレンダー UI (紙のカレンダー風) */}
        <div className="lg:col-span-1 p-6 rounded-xl shadow-2xl" style={{ backgroundColor: COLORS.main }}>
          <h3 className="text-2xl font-extrabold mb-4 pb-2 border-b-2 text-white" style={{ borderColor: COLORS.dark }}>
            ダイアリーカレンダー
          </h3>
          
          {/* 年/月 プルダウン */}
          <div className="flex space-x-2 mb-4">
            <select 
              value={selectedYear} 
              onChange={handleYearChange}
              className="p-2 rounded-lg border-2 w-1/2" style={{ borderColor: COLORS.dark, color: COLORS.dark }}
            >
              {yearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select 
              value={selectedDate.getMonth()} 
              onChange={handleMonthChange}
              className="p-2 rounded-lg border-2 w-1/2" style={{ borderColor: COLORS.dark, color: COLORS.dark }}
            >
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* カレンダー本体 */}
          <div className="bg-white p-4 rounded-lg shadow-inner">
            <p className="text-center font-bold text-lg mb-2" style={{ color: COLORS.dark }}>
              {selectedYear}年 {selectedDate.getMonth() + 1}月
            </p>
            {renderCalendar()}
          </div>
          
        </div>
        
        {/* 2. 選択された日の最新日記カード */}
        <div className="lg:col-span-2">
            <div className="mb-12">
                <h2 className="text-4xl font-extrabold mb-6 pb-2 text-white border-b" style={{ borderColor: COLORS.main }}>
                    {formatDate(selectedDate)} のボク
                </h2>
                
                {loading ? (
                    <div className="p-10 text-center bg-white rounded-xl shadow-xl">
                        <p className="text-gray-500 font-bold">読み込み中... 少し待ってて！</p>
                    </div>
                ) : (
                    <DiaryPostCard post={currentDiary} selectedDate={selectedDate} />
                )}
            </div>

            {/* 3. 当日最新の日記更新表示 (選択日に関わらず今日の日記を表示) */}
            <TodayUpdateCard db={db} userId={userId} today={today} />
        </div>

      </div>
    </section>
  );
};

// 日記カードコンポーネント
const DiaryPostCard = ({ post, selectedDate }) => (
    <div 
        className="bg-white shadow-2xl rounded-xl overflow-hidden cursor-pointer transition duration-300 hover:shadow-3xl"
        style={{ borderLeft: `6px solid ${post.dateString === formatDate(new Date()).replace(/\./g, '-') ? COLORS.accent : COLORS.dark}` }}
    >
        <div className="p-6 md:p-10">
            <p className="text-sm text-gray-500 mb-2">{post.dateString || formatDate(selectedDate)}</p>
            <h3 className="text-3xl font-bold mb-4" style={{ color: COLORS.dark }}>
                {post.title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed whitespace-pre-wrap">
                {post.excerpt}
            </p>
            
            <button 
                className="text-white font-semibold py-3 px-8 rounded-full shadow-md transition duration-150 hover:opacity-90"
                style={{ backgroundColor: COLORS.accent }}
            >
                記事全文を読む
            </button>
        </div>
    </div>
);

// 当日最新の日記更新表示カード
const TodayUpdateCard = ({ db, userId, today }) => {
    const [todayPost, setTodayPost] = useState(null);
    const [loadingToday, setLoadingToday] = useState(true);

    useEffect(() => {
        if (!db || !userId) return;
        setLoadingToday(true);
        
        const todayString = formatDate(today).replace(/\./g, '-');
        const diaryRef = collection(db, 'artifacts', appId, 'users', userId, 'diaries');
        
        const q = query(
            diaryRef,
            where('dateString', '==', todayString),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.docs.length > 0) {
                setTodayPost(snapshot.docs[0].data());
            } else {
                setTodayPost(null);
            }
            setLoadingToday(false);
        }, (error) => {
            console.error("Today's data fetch error:", error);
            setLoadingToday(false);
        });

        return () => unsubscribe();
    }, [db, userId, today]);

    // モックデータ初期化用ボタン (テスト用に残しておきます)
    const handleInitialize = async () => {
        if (!db || !userId) return;
        const diaryRef = collection(db, 'artifacts', appId, 'users', userId, 'diaries');
        const todayString = formatDate(today).replace(/\./g, '-');
        
        try {
            // Firestoreにドキュメントを追加 (当日分)
            await window.firebase.firestore.setDoc(doc(diaryRef, todayString), {
                title: `今日のボクの特訓！ ${formatDate(today)}`,
                excerpt: `今日はシュート練習に時間をかけたんだ。昨日の失敗を活かして、ボクは絶対にエースとして成長してみせる。誰にも負けないアツい覚悟で、明日の試合に臨むよ！これが今日の記録だ！`,
                dateString: todayString,
                timestamp: new Date()
            });
            console.log("Mock data initialized for today.");
        } catch (e) {
            console.error("Error setting document: ", e);
        }
    };

    return (
        <div className="p-6 rounded-xl shadow-xl" style={{ backgroundColor: COLORS.main }}>
            <h3 className="text-xl font-extrabold mb-4 text-white border-b-2 pb-2" style={{ borderColor: COLORS.dark }}>
                [速報] 当日最新のボクの更新
            </h3>
            {loadingToday ? (
                <p className="text-white">確認中...</p>
            ) : todayPost ? (
                <div>
                    <p className="text-sm font-bold text-white mb-2">{todayPost.title}</p>
                    <p className="text-gray-800 text-sm mb-4">{todayPost.excerpt.substring(0, 80)}...</p>
                    <button className="text-sm text-white px-4 py-1 rounded-full shadow-md" style={{ backgroundColor: COLORS.accent }}>
                        今日の全文を見る
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-start space-y-3">
                    <p className="text-white">今日の更新はまだないみたい。夕方の特訓後かな？</p>
                    {/* テスト用ボタン: 実際の運用では不要 */}
                    {userId && (
                        <button onClick={handleInitialize} className="text-xs text-white px-3 py-1 rounded bg-gray-500 hover:bg-gray-600 transition">
                            (開発: 今日分を登録)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};


// フッター/スマホ固定ナビゲーション
const Footer = () => (
    <>
      <footer className="hidden md:block py-6 border-t" style={{ backgroundColor: COLORS.dark }}>
        <div className="max-w-7xl mx-auto text-center text-sm text-white opacity-70">
          © 2025 SEIO BASKETBALL DIARY. All Rights Reserved.
        </div>
      </footer>
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 shadow-2xl pb-safe" style={{ backgroundColor: COLORS.dark }}>
        <div className="flex justify-around items-center h-16">
          {[{ label: 'Home', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.5a.75.75 0 00.75.75h3.75a.75.75 0 00.75-.75V15a.75.75 0 01.75-.75h3.75a.75.75 0 01.75.75v5.25a.75.75 0 00.75.75h3.75a.75.75 0 00.75-.75V9.75' }, 
            { label: 'Diary', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z' }, 
            { label: 'Profile', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0 .75.75 0 01-.482.646l-2.553-.882a15.228 15.228 0 01-4.823-.482l-2.553.882a.75.75 0 01-.482-.646z' }, 
            { label: 'More', icon: 'M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' }
          ].map((item) => (
            <a key={item.label} href={`#${item.label.toLowerCase()}`} className="flex flex-col items-center justify-center h-full flex-1 text-sm transition duration-150 hover:bg-white/10" style={{ color: item.label === 'Diary' ? COLORS.accent : 'white' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </>
);


// メインアプリケーションコンポーネント
export default function App() {
  return (
    <div className="min-h-screen font-sans antialiased bg-gray-50">
      <Header />
      <main>
        <HeroSection />
        <DiaryCalendarSection db={db} auth={auth} />
      </main>
      <Footer />
    </div>
  );
}
