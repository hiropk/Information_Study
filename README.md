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

## フォルダ方針（おすすめ）

- `docs/`: 生徒に公開してよい内容だけ置く
- `private/`: 配布前資料・作業メモなど
- `students/`, `submissions/`, `grades/`: 生徒情報・提出物・成績（**絶対に公開しない**）

