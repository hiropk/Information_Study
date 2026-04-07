# 情報（高等学校） 授業管理リポジトリ

- 公開サイト（生徒向け）: `docs/`（GitHub Pagesで公開）
- 非公開データ: `private/` や `students/` 等（`.gitignore` 済み、**コミットしない**）

## GitHub Pages 公開手順

GitHub のリポジトリ設定で以下を指定します。

- Settings → Pages
- Build and deployment
  - Source: Deploy from a branch
  - Branch: `main`
  - Folder: `/docs`

公開後は `docs/index.html` がトップになります。

## スライド作成（Rabbit）

授業スライドは `slides/` 以下に RD 形式（`.rd`）で管理します。

```
slides/
├── _sample/       # 記法サンプル・テンプレート
│   └── sample.rd
└── 01_xxx/        # 授業回ごとにディレクトリを切る
    └── xxx.rd
```

`slides/_sample/sample.rd` に箇条書き・番号付きリスト・コードブロック・発表者ノートなど主要な記法のサンプルがあります。新しいスライドを作るときの参考にしてください。

### PDF への変換

```bash
# 出力先省略 → docs/slides/<ファイル名>.pdf に自動出力
bin/rd2pdf slides/01_xxx/xxx.rd

# 出力先を明示
bin/rd2pdf slides/01_xxx/xxx.rd docs/slides/xxx.pdf
```

> `slides/` 以下の `.pdf` は `.gitignore` で除外済み。
> `docs/assets/slides/` に出力した PDF はコミット対象になり、公開サイトから参照できます。

## 出席管理サーバー（information_study_manager）

Rails アプリ。授業中に生徒が出席を送信する API サーバー。

### 起動方法

```bash
# Rails + ngrok を一発起動（URL 自動更新・コミット・push まで全部やる）
bin/serve
```

### 初回セットアップ

```bash
cd information_study_manager
bundle install
rails db:migrate
cp .env.sample .env   # .env に Gmail 設定を書く
```

### 環境変数（.env）

`.env.sample` をコピーして `.env` を作り、以下を設定する。

```
GMAIL_ADDRESS=your_address@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # Google アプリパスワード（16桁）
REPORT_TO=recipient@example.com
```

> `.env` は `.gitignore` 済みなので **絶対にコミットしない**。

---

## フォルダ方針（おすすめ）

- `docs/`: 生徒に公開してよい内容だけ置く
- `docs/assets/slides/`: PDF 化したスライド（公開対象）
- `slides/`: 授業スライドのソース（RD形式）
- `information_study_manager/`: 出席管理 Rails アプリ
- `private/`: 配布前資料・作業メモなど
- `students/`, `submissions/`, `grades/`: 生徒情報・提出物・成績（**絶対に公開しない**）
