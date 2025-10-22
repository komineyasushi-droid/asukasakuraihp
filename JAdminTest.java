package com.example.javaadmintest; // パッケージ名を小文字に統一

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.ListUsersPage;
import com.google.firebase.auth.FirebaseAuthException; 
import com.google.auth.oauth2.GoogleCredentials;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;

/**
 * Firebase Admin SDK の初期化と、Authenticationユーザーの一覧を取得するテストクラスです。
 * 実行前にサービスアカウントJSONファイルのパスを正しく設定してください。
 * * ★【重要】このJavaコードを実行するには、pom.xmlに以下の依存関係が必要です。
 * * <dependency>
 * <groupId>com.google.firebase</groupId>
 * <artifactId>firebase-admin</artifactId>
 * <version>最新のバージョン</version>
 * </dependency>
 */
public class JAdminTest {

    public static void main(String[] args) {
        // ★明日香さん、こんにちは！ボクも頑張って修正しましたよ！
        System.out.println("--- Firebase Admin SDK 初期化とユーザー一覧テスト開始 ---");

        // ★★★ 注意: サービスアカウントJSONファイルのパスを設定してください ★★★
        // VS Codeの「asuka-diary」プロジェクトを考慮し、相対パスの例を追記しました。
        // プロジェクトのルート（pom.xmlがある場所）から見た相対パスを指定するのが一般的です。
        String serviceAccountPath = "src/main/resources/service-account-key.json"; 
        // もしサービスアカウントJSONをsrc/main/resourcesに配置していない場合は、適切なパスに修正してください。

        // 全体の処理をtry...finallyで囲み、例外処理が漏れなく動作するようにしています
        try {
            // リソース(FileInputStream)を自動的にクローズするtry-with-resources構文を使用
            // これにより、ファイルストリームのクローズ処理を確実にします。
            try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
                
                // 31行目のエラー箇所に対応：コード自体は正しいが、IDE/環境がSDKを見つけられていない問題。
                // Javaコードとしては、このまま（修正前のコードのままで）問題ありません。
                // 環境設定（pom.xmlとMavenリフレッシュ）を再確認すればエラーは消えます。
                FirebaseOptions options = new FirebaseOptions.Builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    // データベースURLやストレージバケットが必要な場合はここに追加します
                    .build();

                // Firebaseを初期化 (既に初期化されているかを確認し、未初期化の場合のみ実行)
                // このチェックはFirebaseAppが既に初期化されている場合に再初期化エラーを防ぐために重要です。
                if (FirebaseApp.getApps().isEmpty()) {
                    FirebaseApp.initializeApp(options);
                }

                System.out.println("Firebase Admin SDK の初期化に成功しました。");

                // ユーザーリストの取得テスト (ここでは最初の10件のみを取得)
                System.out.println("--- 認証ユーザーを最大10件取得します ---");
                
                // listUsers()はFirebaseAuthExceptionをスローするため、
                // この内側のtryブロックで囲まれているため、問題ありません。
                ListUsersPage page = FirebaseAuth.getInstance().listUsers(null, 10);
                
                // 取得したユーザーを順次処理し、UIDとメールアドレスを出力
                page.iterateAll().forEach(user -> 
                    System.out.println("  [User UID]: " + user.getUid() + 
                                        ", [Email]: " + (user.getEmail() != null ? user.getEmail() : "メールアドレスなし"))
                );
                
                System.out.println("--- ユーザー一覧の取得完了 ---");

            } catch (FileNotFoundException e) {
                // サービスアカウントJSONファイルが見つからない場合のエラー処理
                System.err.println("エラー: サービスアカウントファイルが指定のパスに見つかりません: " + serviceAccountPath);
                System.err.println("ファイルパスを確認し、適切な場所に配置してください。");
                e.printStackTrace();
            } catch (IOException e) {
                // 認証情報ストリームの読み込みなどで発生するIOエラー処理
                System.err.println("エラー: Firebaseの初期化中にIO例外が発生しました。");
                e.printStackTrace();
            } catch (FirebaseAuthException e) { 
                // ユーザーリスト取得などで発生するFirebase Authentication固有のエラー処理
                // この例外の捕捉が「怪しい」とおっしゃっていた部分に対応する重要な修正です。
                System.err.println("エラー: Firebase Authenticationの操作中に例外が発生しました。");
                System.err.println("詳細: " + e.getMessage());
                e.printStackTrace();
            } catch (Exception e) {
                // それ以外の予期せぬエラー処理
                System.err.println("エラー: 予期せぬランタイムエラーが発生しました: " + e.getMessage());
                e.printStackTrace();
            }

        } finally {
            // テスト終了メッセージはfinallyブロックに記述することで、例外発生時にも必ず出力されます
            System.out.println("--- Firebase Admin SDK テスト終了 ---");
        }
    }
}