# 出席管理 — 設計方針

## やること

- 生徒向け公開サイトのフォームから POST リクエストが来たら出席レコードを作成する
- 管理者は一覧画面で出席状況を確認・絞り込みできる
- 一覧画面は Action Cable でリアルタイム更新する

---

## モデル

```
attendances
  id
  student_code   string    # 必須  例: "2-1-01"
  lesson_code    string    # 必須  例: "2026-I-2-1-01"（年度・科目・クラス・回）
  date           date      # 必須  授業日
  status         integer   # 必須  enum（下記）
  comment        text      # 任意  備考・連絡事項
  created_at     datetime  # Rails が自動セット（送信日時として使用）
  updated_at     datetime

  unique index: [student_code, date]
```

### status enum

| 値         | 意味   |
| ---------- | ------ |
| `present`  | 出席   |
| `absent`   | 欠席   |
| `late`     | 遅刻   |
| `early`    | 早退   |
| `excused`  | 公欠   |
| `bereaved` | 忌引き |
| `other`    | その他 |

---

## 画面・ルーティング

```
root  →  attendances#index   # 一覧（管理画面トップ）
```

### 一覧画面（attendances#index）

- Ransack で絞り込み検索
  - 絞り込み項目: `student_code`、`lesson_code`、`status`、`date`（授業日範囲）、`created_at`（送信日範囲）
- Action Cable（`AttendancesChannel`）で購読
  - `create` 時にブロードキャスト → 画面を再描画なしで最新行を追加

---

## API

### 出席登録

```
POST /api/v1/attendances
Content-Type: application/json

{
  "student_code": "2-1-01",
  "lesson_code":  "2026-I-2-1-01",
  "date":         "2026-04-08",
  "status":       "present",
  "comment":      "体調不良のため見学"   // 任意
}
```

レスポンス:

```json
{ "status": "ok" }
{ "status": "error", "message": "..." }
```

### create の動作

1. `student_code` + `date` の組み合わせで既存レコードを検索
2. **なければ** そのまま create
3. **あれば** 受け取ったデータ（新しい方）で既存レコードを update（upsert）
4. 保存後に `AttendancesChannel` へブロードキャスト

### CORS

公開サイト（GitHub Pages）からのリクエストを許可するため `rack-cors` を使用。

---

## TODO

- [x] Attendance モデル作成（`[student_code, date]` ユニーク制約）
- [x] `attendances#index` 実装（Ransack 絞り込み）
- [x] root を `attendances#index` に設定
- [x] `AttendancesChannel` 実装（Action Cable）
- [x] `Api::V1::AttendancesController#create` 実装（upsert）
- [x] create 時に `AttendancesChannel` へブロードキャスト
- [x] CORS 設定（GitHub Pages からのリクエストを許可）
- [x] spec 作成（model / request）
