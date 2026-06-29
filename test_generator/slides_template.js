import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// index.js / export.js と token.json を共有するため、全機能のスコープをまとめて要求する。
// スライド作成には presentations が必須。
const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
];
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/presentations';

// ---------------------------------------------------------------------------
// 配布するスライドの型（2章3節「自分の好きなもの」プレゼン課題）
//   layout: TITLE … 表紙用（CENTERED_TITLE + SUBTITLE）
//   layout: TITLE_AND_BODY … 本文用（TITLE + BODY）
// ---------------------------------------------------------------------------
const TEMPLATE_TITLE = '【型】私の好きなもの プレゼンテーション';

const SLIDES = [
  {
    layout: 'TITLE',
    title: '私の好きな○○\n（ここにタイトルを入力）',
    body: '○年○組○番　氏名を入力\n2026年　　月　　日',
  },
  {
    layout: 'TITLE_AND_BODY',
    title: '紹介するもの',
    body: '・何を紹介する？\n・なぜ好き？（ひとことで）',
  },
  {
    layout: 'TITLE_AND_BODY',
    title: '魅力①',
    body: '・魅力を1つ書こう\n・写真や図を入れよう\n（1スライド1項目）',
  },
  {
    layout: 'TITLE_AND_BODY',
    title: '魅力②',
    body: '・魅力を1つ書こう\n・写真や図を入れよう',
  },
  {
    layout: 'TITLE_AND_BODY',
    title: '魅力③',
    body: '・魅力を1つ書こう\n・写真や図を入れよう',
  },
  {
    layout: 'TITLE_AND_BODY',
    title: 'まとめ',
    body: '・魅力を要約しよう\n・いちばん伝えたいこと',
  },
];

// レイアウトごとのプレースホルダ種別
const PLACEHOLDERS = {
  TITLE: { title: 'CENTERED_TITLE', body: 'SUBTITLE' },
  TITLE_AND_BODY: { title: 'TITLE', body: 'BODY' },
};

// ---------------------------------------------------------------------------
// OAuth 認証（index.js と同じ流れ。スコープ不足時は再認証する）
// ---------------------------------------------------------------------------
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    if ((token.scope ?? '').includes(REQUIRED_SCOPE)) {
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }
    console.log('既存トークンにスライド作成スコープがないから、もう一度だけ認証してね。');
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
// テンプレート用プレゼンテーションを作成
// ---------------------------------------------------------------------------
async function createTemplate(auth, title) {
  const slidesApi = google.slides({ version: 'v1', auth });

  // 1. 空のプレゼンを作成（初期スライドが1枚自動で付く）
  const created = await slidesApi.presentations.create({ requestBody: { title } });
  const presentationId = created.data.presentationId;
  const defaultSlideId = created.data.slides?.[0]?.objectId;

  // 2. スライドを順番に作成（レイアウト＋プレースホルダID割り当て）
  const requests = [];
  SLIDES.forEach((slide, i) => {
    const slideId = `slide_${i}`;
    const titleId = `${slideId}_title`;
    const bodyId = `${slideId}_body`;
    const ph = PLACEHOLDERS[slide.layout];

    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: i,
        slideLayoutReference: { predefinedLayout: slide.layout },
        placeholderIdMappings: [
          { layoutPlaceholder: { type: ph.title, index: 0 }, objectId: titleId },
          { layoutPlaceholder: { type: ph.body, index: 0 }, objectId: bodyId },
        ],
      },
    });
    requests.push({ insertText: { objectId: titleId, text: slide.title } });
    requests.push({ insertText: { objectId: bodyId, text: slide.body } });
  });

  // 3. 自動で付いてきた初期スライドを削除
  if (defaultSlideId) {
    requests.push({ deleteObject: { objectId: defaultSlideId } });
  }

  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  });

  // 4. Drive 上のファイル名を整える
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.update({ fileId: presentationId, requestBody: { name: title } });

  return presentationId;
}

// ---------------------------------------------------------------------------
// エントリーポイント
// ---------------------------------------------------------------------------
(async () => {
  // 使い方:
  //   node slides_template.js                  … デフォルトのタイトルで型を作成
  //   node slides_template.js "好きな本 紹介"  … タイトルを指定
  const title = process.argv[2] || TEMPLATE_TITLE;

  try {
    const auth = await authorize();
    console.log(`\n📊 スライドの型を作成中: ${title}`);

    const presentationId = await createTemplate(auth, title);

    console.log(`\nスライド ${SLIDES.length} 枚の型を作成したよ！`);
    console.log(`\n✅ 編集URL: https://docs.google.com/presentation/d/${presentationId}/edit`);
    console.log('   → Classroom では「各生徒にコピーを作成」で配布してね。');
  } catch (err) {
    console.error('エラー発生:', err.errors ?? err.message ?? err);
    process.exit(1);
  }
})();
