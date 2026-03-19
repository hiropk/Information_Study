# 出席レポートメール送信 — 設計方針

## やること

- 管理画面の現在の絞り込み条件をそのままメールで送信する
- メール本文に学籍番号昇順の出席データを記載する
- Gmail のアプリパスワードを使って指定のメールアドレスに1件送信する

---

## 画面・操作フロー

1. `attendances#index` の「レコード一覧」パネルヘッドに「レポート送信」ボタンを追加
2. ボタンを押すと現在の `q` パラメータを引き継いで `POST /attendance_reports` にリクエストを送信
3. コントローラーが `q` パラメータで Ransack クエリを組み立て、学籍番号昇順でレコードを取得してメール送信
4. 完了後、フラッシュメッセージで結果を表示して元の絞り込み条件を保ったままインデックスにリダイレクト

---

## ルーティング

```
POST /attendance_reports   →  attendance_reports#create
```

---

## メール内容

### 件名

```
出席レポート [絞り込み条件の概要]
例: 出席レポート 2026-04-08
```

条件に `date_eq` があれば日付を件名に含める。なければ送信日時を使う。

### 本文（テキスト形式）

```
送信日時: 2026-04-08 10:30
絞り込み条件: 授業日 2026-04-08

学籍番号   授業コード          状態    備考
2-1-01    2026-I-2-1-01    出席
2-1-02    2026-I-2-1-01    遅刻    電車遅延
2-1-03    2026-I-2-1-01    欠席
...

合計 30 件
```

---

## 実装コンポーネント

| ファイル                                             | 役割                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `config/routes.rb`                                   | `resources :attendance_reports, only: [:create]`                    |
| `app/controllers/attendance_reports_controller.rb`   | `q` パラメータで絞り込み → 学籍番号昇順 → メール送信 → リダイレクト |
| `app/mailers/attendance_report_mailer.rb`            | ActionMailer でメール組み立て                                       |
| `app/views/attendance_report_mailer/report.text.erb` | メール本文テンプレート                                              |
| `config/credentials.yml.enc`                         | Gmail アドレス・アプリパスワード・送信先メアドを保存                |
| `config/environments/development.rb`                 | SMTP 設定（Gmail）                                                  |

---

## 認証情報（credentials）

```yaml
gmail:
  address: "hiroyuki.kanou.m@gmail.com"
  password: "afyr ymwh umiz xuki" # Googleアプリパスワード
  report_to: "ambitious0327@gmail.com"
```

---

## TODO

- [ ] `config/credentials.yml.enc` に Gmail 認証情報を追加
- [ ] `development.rb` に ActionMailer SMTP 設定を追加
- [ ] `AttendanceReportMailer` 作成
- [ ] `AttendanceReportsController#create` 実装
- [ ] ルーティング追加
- [ ] `index.html.erb` にレポート送信ボタンを追加（`q` パラメータを hidden で引き継ぐ）
- [ ] `spec/mailers/attendance_report_mailer_spec.rb` 作成（件名・本文・宛先の検証）
- [ ] `spec/requests/attendance_reports_spec.rb` 作成（正常系: メール送信 & リダイレクト、異常系: 0件時の挙動）
