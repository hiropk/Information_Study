# 情報Ⅰ（高等学校） 授業管理リポジトリ

高校「情報Ⅰ」の授業運営用リポジトリ。生徒向け公開サイト、確認テスト生成、プログラミング演習、出席管理サーバーをまとめて扱っている。

---

## ディレクトリ構成

```
Information_Study/
├── docs/                         # 公開サイト（GitHub Pages）
│   ├── index.html                #   トップ
│   ├── course.html               #   授業ページ（資料・確認テスト）
│   ├── syllabus.html             #   シラバス
│   ├── announcements/            #   お知らせ
│   ├── partials/                 #   共通ヘッダー／フッター
│   └── assets/                   #   CSS・JS・favicon・公開用PDF
│       └── slides/               #     公開する自作資料のPDF
├── assignments/                  # プログラミング演習（Jupyter / HTML）
├── test_generator/               # 小テスト → Google Forms 生成・回答CSV書き出し
│   ├── index.js                  #   .md からクイズ Form を生成
│   ├── export.js                 #   Form の回答を CSV で書き出し
│   └── test/                     #   小テスト下書き（chXX-secYY.md）
├── information_study_manager/    # 出席管理 API（Rails）
├── bin/                          # serve / rd2pdf
└── rgb-raster-vector-demo.html   # RGB・ラスタ／ベクタの授業デモ
```

---

## 公開サイト（GitHub Pages）

`docs/` を GitHub Pages で公開している。

- Settings → Pages → Build and deployment
  - Source: Deploy from a branch
  - Branch: `main` / Folder: `/docs`

公開後のトップは `docs/index.html`。授業ページは `docs/course.html`。

### `course.html` に載せるもの

- 資料: 教科書本文に沿っていない自作資料だけ（ガイダンス、特別課題、自作ルーブリックなど）
- 確認テスト: Google Forms へのリンクだけ（問題文・解答はサイト上に書かない）

教科書の節に対応した授業スライド PDF や、例題・確認問題の解答ページは置かない。

---

## 小テスト生成・回答エクスポート（test_generator）

Google Forms のクイズ作成と、回答 CSV のエクスポートを行う Node.js ツール。

### セットアップ

```bash
cd test_generator
npm install
```

OAuth 用のクライアント設定を置いたうえで、初回実行時に認証する。

### Form を生成する

```bash
cd test_generator
node index.js test/ch01-sec01.md
```

下書きは `test/chXX-secYY.md`。選択14問＋記述3問（100点）が基本形。実行すると編集用 URL が表示されるので、`docs/course.html` の確認テスト欄に `viewform` リンクを載せる。

### 回答を CSV で書き出す

```bash
cd test_generator

# 作成済みの全 Form を result/exam_1/ に出力
node export.js

# Form 名で絞り込み（部分一致）
node export.js ch01-sec01 special-typing

# 出力先を変更
node export.js --out=result/exam_2
```

列構成は Google Forms 標準に合わせてあり、`タイムスタンプ`／`総得点`／各問の `回答`・`[スコア]`・`[フィードバック]` になる。

---

## プログラミング演習（assignments）

Jupyter Notebook や HTML の演習ファイルを置く。

- `ch02-sec03-*` … 文書・プレゼンまわり
- `ch04-ruby-*` … Ruby プログラミング演習
- `special-*` … 特別課題用

---

## PDF 変換（bin/rd2pdf）

Rabbit（RD）のスライドを PDF にする。

```bash
# 公開してよい自作資料だけ docs/assets/slides/ へ
bin/rd2pdf path/to/special-typing.rd docs/assets/slides/special-typing.pdf
```

出力先を省略すると `docs/slides/` に保存される。公開用は必ず `docs/assets/slides/` を指定する。

---

## 出席管理サーバー（information_study_manager）

授業中に生徒が出席を送る Rails API。

### 起動

```bash
bin/serve
```

`bin/serve` がやること:

1. Rails をポート 3001 で起動
2. ngrok で外部公開し、公開 URL を取得
3. `docs/assets/site.js` の `API_URL` を書き換え
4. `docs/course.html` のキャッシュバスティングを更新
5. git commit → push

停止は `Ctrl + C`（Rails・ngrok の両方が止まる）。

### 初回セットアップ

```bash
cd information_study_manager
bundle install
rails db:migrate
cp .env.sample .env
```

`.env` の例:

```
GMAIL_ADDRESS=your_address@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # Google アプリパスワード（16桁）
REPORT_TO=recipient@example.com
```

事前に `ngrok` のインストールと認証が必要（`brew install ngrok` → `ngrok config add-authtoken <トークン>`）。
