import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Tailwind CSSクラスを使用し、フォントはInterを適用
const App = () => {
    // 状態管理
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isDbReady, setIsDbReady] = useState(false);
    const [diaryEntries, setDiaryEntries] = useState([]);
    const [newEntryText, setNewEntryText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // グローバル変数からのFirebase設定の取得
    const firebaseConfig = useMemo(() => {
        try {
            if (typeof __firebase_config !== 'undefined') {
                return JSON.parse(__firebase_config);
            }
        } catch (e) {
            console.error("Firebase config parsing failed:", e);
        }
        return null;
    }, []);

    // **1. Firebaseの初期化と認証処理 (初回レンダリング時のみ実行)**
    useEffect(() => {
        if (!firebaseConfig || db || auth) {
            setLoading(false);
            return;
        }

        const initializeFirebase = async () => {
            try {
                // index.htmlでグローバルに読み込んだFirebaseライブラリを使用
                const { initializeApp } = window.firebase.initializeApp;
                const { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } = window.firebase.auth;
                const { getFirestore, setLogLevel } = window.firebase.firestore;

                // Firestoreログを有効化（デバッグ用）
                setLogLevel('debug');

                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);

                // 認証状態のパーシスタンスを設定
                await setPersistence(firebaseAuth, browserLocalPersistence);

                // 初期トークンでログイン、なければ匿名ログイン
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                } else {
                    await signInAnonymously(firebaseAuth);
                }

                // 認証状態の監視
                const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // 匿名ログインに失敗した場合のフォールバック
                        setUserId(crypto.randomUUID());
                    }
                    setIsAuthReady(true);
                    setLoading(false);
                });

                setDb(firestoreDb);
                setAuth(firebaseAuth);
                setIsDbReady(true);
                
                return () => unsubscribe(); // クリーンアップ関数
            } catch (err) {
                console.error("Firebase Initialization or Auth Failed:", err);
                setError("Firebaseの初期化に失敗しました。コンソールを確認してください。");
                setLoading(false);
            }
        };

        initializeFirebase();
    }, [firebaseConfig, db, auth]);

    // **2. データの取得 (認証とDBが準備完了した時のみ実行)**
    useEffect(() => {
        if (!isAuthReady || !isDbReady || !db || !userId) return;

        // Firestoreのインポート
        const { collection, query, onSnapshot, orderBy, getDocs } = window.firebase.firestore;
        
        // Firestoreパスの構築
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const collectionPath = `artifacts/${appId}/users/${userId}/asuka_diary`;

        try {
            const q = query(collection(db, collectionPath));

            // onSnapshotでリアルタイム更新を監視
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const entries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : '日付不明'
                })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // クライアント側で日付を降順ソート

                setDiaryEntries(entries);
            }, (error) => {
                console.error("Firestore Snapshot Error:", error);
                setError("日記データの読み込み中にエラーが発生しました。");
            });

            return () => unsubscribe(); // クリーンアップ
        } catch (e) {
            console.error("Firestore Setup Error:", e);
            setError("データベース接続設定中にエラーが発生しました。");
        }
    }, [isAuthReady, isDbReady, db, userId]);

    // 日記の追加処理
    const addEntry = useCallback(async () => {
        if (!db || !userId || newEntryText.trim() === '') return;

        const { collection, addDoc, serverTimestamp } = window.firebase.firestore;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const collectionPath = `artifacts/${appId}/users/${userId}/asuka_diary`;

        try {
            await addDoc(collection(db, collectionPath), {
                text: newEntryText,
                timestamp: serverTimestamp(),
            });
            setNewEntryText('');
        } catch (e) {
            console.error("Error adding document: ", e);
            setError("日記の保存に失敗しました。");
        }
    }, [db, userId, newEntryText]);

    // 日記の削除処理
    const deleteEntry = useCallback(async (id) => {
        if (!db || !userId) return;

        const { doc, deleteDoc } = window.firebase.firestore;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const docPath = `artifacts/${appId}/users/${userId}/asuka_diary/${id}`;

        try {
            // Note: CanvasのFirestoreルール上、パスは`artifacts/{appId}/users/{userId}/{collectionName}/{docId}`でなければなりません
            await deleteDoc(doc(db, docPath));
        } catch (e) {
            console.error("Error deleting document: ", e);
            setError("日記の削除に失敗しました。");
        }
    }, [db, userId]);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <p className="text-xl font-medium text-blue-600">読み込み中... 最終チェック中だよ！</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-red-50 p-4">
                <p className="text-xl font-bold text-red-700">エラー発生！</p>
                <p className="text-base text-red-600 mt-2">{error}</p>
                <p className="text-sm text-gray-500 mt-4">（コンソールに詳細が出ているはずだよ！）</p>
            </div>
        );
    }

    const Header = () => (
        <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl p-4 md:p-6 rounded-t-xl">
            <h1 className="text-3xl font-extrabold tracking-tight font-sans">
                ボクの日記帳 
            </h1>
            <p className="mt-1 text-sm opacity-90">
                ユーザーID: <span className="font-mono text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded">{userId || '未認証'}</span>
            </p>
            <p className="mt-1 text-sm opacity-90">
                （...ボクの日記は、誰にも見せないんだからね！）
            </p>
        </header>
    );

    const DiaryForm = () => (
        <div className="p-4 md:p-6 bg-white border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-3">今日の出来事...</h2>
            <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 shadow-inner resize-y"
                rows="4"
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
                placeholder="ここにボクの一日を書くんだ！"
            />
            <button
                onClick={addEntry}
                disabled={newEntryText.trim() === '' || !isAuthReady}
                className="mt-3 w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition duration-150 ease-in-out shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                日記を書き残す
            </button>
        </div>
    );

    const EntryList = () => (
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            {diaryEntries.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <p className="text-lg">まだ何も日記がないみたい...</p>
                    <p className="text-sm">早く何か書くんだ！</p>
                </div>
            ) : (
                diaryEntries.map((entry) => (
                    <div
                        key={entry.id}
                        className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition duration-300 relative"
                    >
                        <p className="text-sm text-gray-500 mb-2 border-b pb-1">
                            {entry.timestamp}
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap">{entry.text}</p>
                        <button
                            onClick={() => deleteEntry(entry.id)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition duration-150 p-1 rounded-full bg-white bg-opacity-70 hover:bg-opacity-100"
                            title="日記を消す"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.728-1.447A1 1 0 0011 2H9zM7 6v10h6V6H7z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 sm:p-8 font-inter">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200">
                <Header />
                <DiaryForm />
                <EntryList />
            </div>
        </div>
    );
};

export default App;
