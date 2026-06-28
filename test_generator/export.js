import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// index.js（フォーム作成）と同じ token.json を共有するため、作成系スコープも含めて要求する。
// 回答の読み取りには forms.responses.readonly が必須。
const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file',
];
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/forms.responses.readonly';

// 出力先（--out=... で上書き可）
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'result', 'exam_1');

// Google Forms（クイズ）のファイル種別
const FORM_MIME = 'application/vnd.google-apps.form';

// ---------------------------------------------------------------------------
// OAuth 認証（index.js と同じ流れ。スコープ不足時は再認証する）
// ---------------------------------------------------------------------------
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const hasScope = (token.scope ?? '').includes(REQUIRED_SCOPE);
    if (hasScope) {
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }
    console.log('既存トークンに回答読み取りスコープがないから、もう一度だけ認証してね。');
  }

  return await getNewToken(oAuth2Client);
}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n認証URLをブラウザで開いてね↓');
  console.log(authUrl);
  console.log('\n（同意後 http://localhost/?code=... に飛ぶので、URL の code= の値をコピーして貼り付けて）');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => {
    rl.question('\n認証後に表示されたコードを貼り付けて: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('token.json を保存したよ！');

  return oAuth2Client;
}

// ---------------------------------------------------------------------------
// このアプリが作成したフォーム一覧を Drive から取得
// ---------------------------------------------------------------------------
async function listForms(auth) {
  const drive = google.drive({ version: 'v3', auth });
  const forms = [];
  let pageToken;

  do {
    const res = await drive.files.list({
      q: `mimeType='${FORM_MIME}' and trashed=false`,
      fields: 'nextPageToken, files(id, name, createdTime)',
      pageSize: 100,
      spaces: 'drive',
      pageToken,
    });
    forms.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return forms;
}

// ---------------------------------------------------------------------------
// 1フォーム分の回答を取得し、Google Forms 標準と同じ列構成の CSV 文字列を作る
// ---------------------------------------------------------------------------
async function buildCsv(auth, formId) {
  const formsApi = google.forms({ version: 'v1', auth });

  const form = (await formsApi.forms.get({ formId })).data;

  // 設問（questionItem を持つ item）を表示順に並べる
  const questions = (form.items ?? [])
    .filter((item) => item.questionItem?.question)
    .map((item) => ({
      title: item.title ?? '',
      questionId: item.questionItem.question.questionId,
      pointValue: item.questionItem.question.grading?.pointValue ?? 0,
    }));

  const maxScore = questions.reduce((sum, q) => sum + q.pointValue, 0);

  // 回答をページングしながら全件取得
  const responses = [];
  let pageToken;
  do {
    const res = await formsApi.forms.responses.list({ formId, pageToken });
    responses.push(...(res.data.responses ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  // 提出時刻の昇順で並べる
  responses.sort((a, b) =>
    (a.lastSubmittedTime ?? '').localeCompare(b.lastSubmittedTime ?? ''),
  );

  // --- ヘッダー行 ---
  const header = ['タイムスタンプ', '総得点'];
  for (const q of questions) {
    header.push(q.title, `${q.title} [スコア]`, `${q.title} [フィードバック]`);
  }

  // --- 各回答行 ---
  const rows = responses.map((resp) => {
    const row = [
      formatTimestamp(resp.lastSubmittedTime ?? resp.createTime),
      `${Number(resp.totalScore ?? 0).toFixed(2)} / ${maxScore}`,
    ];

    for (const q of questions) {
      const ans = resp.answers?.[q.questionId];
      const value = (ans?.textAnswers?.answers ?? [])
        .map((a) => a.value)
        .join(', ');

      const grade = ans?.grade;
      const scoreText =
        grade && typeof grade.score === 'number'
          ? grade.score.toFixed(2)
          : '--';
      const scoreCell = `${scoreText} / ${q.pointValue}`;
      const feedback = grade?.feedback?.text ?? '';

      row.push(value, scoreCell, feedback);
    }
    return row;
  });

  const lines = [header, ...rows].map((cols) => cols.map(csvEscape).join(','));
  // Excel でも文字化けしないよう BOM 付き UTF-8
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------
function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

// "2026/04/17 9:30:44 午前 GMT+9" 形式（JST）に整形
function formatTimestamp(iso) {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod')} GMT+9`;
}

function parseArgs(argv) {
  const names = [];
  let outDir = DEFAULT_OUTPUT_DIR;
  for (const arg of argv) {
    if (arg.startsWith('--out=')) {
      outDir = path.resolve(arg.slice('--out='.length));
    } else {
      names.push(arg);
    }
  }
  return { names, outDir };
}

// ---------------------------------------------------------------------------
// エントリーポイント
// ---------------------------------------------------------------------------
(async () => {
  // 使い方:
  //   node export.js                       … アプリが作った全フォームを result/exam_1/ に出力
  //   node export.js ch01-sec01 typing     … 名前に含まれる文字列で絞り込み
  //   node export.js --out=path/to/dir     … 出力先を変更
  const { names, outDir } = parseArgs(process.argv.slice(2));

  try {
    const auth = await authorize();

    let forms = await listForms(auth);
    if (forms.length === 0) {
      console.error('このアプリが作成したフォームが見つからないよ（drive.file スコープの範囲外かも）');
      process.exit(1);
    }

    // 名前フィルタ（指定があれば部分一致で絞り込み）
    if (names.length > 0) {
      forms = forms.filter((f) => names.some((n) => f.name.includes(n)));
      if (forms.length === 0) {
        console.error(`指定した名前に一致するフォームがないよ: ${names.join(', ')}`);
        process.exit(1);
      }
    }

    fs.mkdirSync(outDir, { recursive: true });
    console.log(`\n📁 出力先: ${outDir}`);
    console.log(`📋 対象フォーム: ${forms.length} 件\n`);

    for (const form of forms) {
      process.stdout.write(`  - ${form.name} ... `);
      const csv = await buildCsv(auth, form.id);
      const outPath = path.join(outDir, `${form.name}.csv`);
      fs.writeFileSync(outPath, csv);
      const rowCount = csv.trimEnd().split('\r\n').length - 1; // ヘッダーを除く
      console.log(`✅ ${rowCount} 件の回答`);
    }

    console.log('\n✅ エクスポート完了！');
  } catch (err) {
    console.error('エラー発生:', err.message ?? err);
    process.exit(1);
  }
})();
