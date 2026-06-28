# 情報Ⅰ（高等学校） 授業管理リポジトリ

高校「情報Ⅰ」の授業運営をまとめたリポジトリ。スライド・小テスト・定期テスト・公開サイト・出席管理サーバーを一元管理している。

- 公開サイト（生徒向け）: `docs/`（GitHub Pages で公開）
- 非公開データ: `study_materials/`・`exams/`・`private/` 等（`.gitignore` 済み、**コミットしない**）
- 定型作業は Cursor のルール（`.cursor/rules/`）でワークフロー化している

---

## ディレクトリ構成

```
Information_Study/
├── docs/                      # 公開サイト（GitHub Pages, /docs 公開）
│   ├── index.html             #   トップページ
│   ├── course.html            #   授業ページ（資料・確認テスト一覧）
│   ├── syllabus.html          #   シラバス
│   ├── announcements/         #   お知らせ（提出状況ページ等）
│   ├── partials/              #   共通パーツ（ヘッダー/フッター）
│   └── assets/                #   CSS・JS・favicon・公開用スライドPDF
│       └── slides/            #     公開するスライドPDF（コミット対象）
├── slides/                    # 授業スライド（Rabbit / RD形式）
│   ├── 2026/                  #   年度ごとの .rd ソース（chXX-secYY.rd）
│   ├── _sample/sample.rd      #   記法サンプル
│   └── Gemfile               #   Rabbit 用（bundle install）
├── assignments/              # プログラミング演習（Jupyter Notebook, Ruby）
├── test_generator/           # 小テスト→Google Forms 生成＆回答CSVエクスポート（Node.js）
│   ├── index.js              #   .md からクイズ Form を生成
│   ├── export.js             #   Form の回答を CSV で書き出し
│   ├── test/                 #   小テスト下書き（chXX-secYY.md）
│   └── result/               #   エクスポートした回答CSV（gitignore・個人情報）
├── exams/                    # 定期テスト案・評価レポート（gitignore・非公開）
├── information_study_manager/ # 出席管理 API サーバー（Rails）
├── study_materials/          # 教科書データ（gitignore・著作権保護）
├── bin/                      # 補助コマンド（serve / rd2pdf）
└── .cursor/rules/            # Cursor 用ワークフロー定義
```

---

## 公開サイト（GitHub Pages）

`docs/` を GitHub Pages で公開している。

- Settings → Pages → Build and deployment
  - Source: Deploy from a branch
  - Branch: `main` / Folder: `/docs`

公開後は `docs/index.html` がトップになる。授業ページ `docs/course.html` に、各節のスライドPDFリンクと確認テスト（Google Forms）カードを掲載する。

---

## スライド作成（Rabbit / RD形式）

授業スライドは `slides/2026/` 以下に RD 形式（`.rd`）で管理する。1ファイル＝1節（`chXX-secYY.rd`）が基本単位。

```
slides/2026/
├── ch01-sec01.rd   # 1章1節
├── ch01-sec02.rd   # 1章2節
├── ...
├── info-study.rb   # 共通テーマ
└── special-*.rd    # 特別演習
```

記法は `slides/_sample/sample.rd` を参照。詳細ルールは `.cursor/rules/slide-creation.mdc`。

### PDF への変換

```bash
# 出力先を明示（公開用は docs/assets/slides/ に置く）
bin/rd2pdf slides/2026/ch01-sec01.rd docs/assets/slides/ch01-sec01.pdf

# 出力先を省略 → docs/assets/slides/<ファイル名>.pdf に保存
bin/rd2pdf slides/2026/ch01-sec01.rd
```

> `slides/` 以下に生成される `.pdf` / `.ps` / `.png` は `.gitignore` 済み。
> 公開サイトから参照するPDFは `docs/assets/slides/` に出力し、こちらはコミット対象。

初回は `slides/` で `bundle install`（Ruby 3.3.6 / rbenv）が必要。

---

## 小テスト生成・回答エクスポート（test_generator）

Google Forms のクイズ作成と、回答CSVのエクスポートを行う Node.js ツール。`googleapis` を使い、OAuth 認証情報は `credentials.json`／`token.json`（いずれも gitignore）で管理する。

### 初回セットアップ

```bash
cd test_generator
npm install
# credentials.json を配置（Google Cloud のOAuthクライアント）
# 初回実行時に認証フローで token.json を生成
```

### 小テスト Form を生成する

下書き Markdown（`test/chXX-secYY.md`）からクイズ Form を自動生成する。記法は `.cursor/rules/test-creation.mdc` を参照。

```bash
cd test_generator
node index.js test/ch01-sec01.md
```

実行すると Form が作成され、編集URLが表示される。

### 回答を CSV でエクスポートする

このアプリが作成した Form を Drive API で自動検出し、Google Forms 標準と同じ列構成（`タイムスタンプ`／`総得点`／各問の `回答`・`[スコア]`・`[フィードバック]`）の CSV を書き出す。

```bash
cd test_generator

# 作成済みの全Formを result/exam_1/ に出力
node export.js          # または npm run export

# Form名で絞り込み（部分一致）
node export.js ch01-sec01 special-typing

# 出力先を変更
node export.js --out=result/exam_2
```

- 出力先デフォルト: `test_generator/result/exam_1/`
- 回答CSVは個人情報を含むため `test_generator/result/` ごと gitignore 済み
- 回答読み取りには `forms.responses.readonly` スコープが必要。未付与のトークンの場合は初回のみ再認証が走る（取得し直すトークンには作成系スコープも含むため `index.js` もそのまま動作する）

---

## 定期テスト評価（exams）

定期テストの試験案（`.docx`）を授業スライドと照合し、大問ごとに評価レポート（Markdown）を作成する。ワークフローは `.cursor/rules/exam-report.mdc`。

- `exams/` は試験問題・解答・評価レポートを含むため `.gitignore` 済み（**共有しない**）

---

## 出席管理サーバー（information_study_manager）

授業中に生徒が出席を送信する Rails 製 API サーバー。

### 起動

```bash
# Rails + ngrok を一括起動（公開URLの自動更新・コミット・push まで実行）
bin/serve
```

`bin/serve` は次を自動で行う（詳細は `.cursor/rules/bin-commands.mdc`）。

1. Rails をポート 3001 で起動
2. ngrok で外部公開し、公開URLを取得
3. `docs/assets/site.js` の `API_URL` を書き換え
4. `docs/course.html` のキャッシュバスティング更新
5. git commit → push

停止は `Ctrl + C`（Rails・ngrok 両方が停止）。

### 初回セットアップ

```bash
cd information_study_manager
bundle install
rails db:migrate
cp .env.sample .env   # .env に Gmail 設定を書く
```

### 環境変数（.env）

```
GMAIL_ADDRESS=your_address@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # Google アプリパスワード（16桁）
REPORT_TO=recipient@example.com
```

事前に `ngrok` のインストールと認証が必要（`brew install ngrok` → `ngrok config add-authtoken <トークン>`）。

---

## Cursor ワークフロー（.cursor/rules）

定型作業はルール化してあり、一言の指示で自動実行できる。

| ルール | 起動例 | 内容 |
|---|---|---|
| `lesson-prep.mdc` | 「次の予習して」 | スライド作成→PDF→小テスト→Form生成→course.html更新 |
| `slide-creation.mdc` | （スライド作成時に参照） | RD形式スライドの記法・構成ルール |
| `test-creation.mdc` | （小テスト作成時に参照） | test_generator 用 .md の記法ルール |
| `exam-report.mdc` | 「テストレポート作って」 | 定期テスト案の評価レポート作成 |
| `bin-commands.mdc` | （bin の使い方を聞いたとき） | `bin/serve`・`bin/rd2pdf` の使い方 |

---

## 非公開データの扱い

`.gitignore` で以下を除外している。**個人情報・著作物・認証情報はコミットしない。**

- `study_materials/`（教科書データ）
- `exams/`（定期テスト一式）
- `test_generator/result/`（回答CSV）・`credentials.json`・`token.json`
- `private/` `students/` `submissions/` `grades/` `roster/` `attendance/`
- 名簿・成績・出席・個人情報・答案 等を含むファイル名パターン
