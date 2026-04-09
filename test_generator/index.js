import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
];

// ---------------------------------------------------------------------------
// Markdown パーサー
//
// フォーマット:
//   # フォームタイトル
//   > フォームの説明文
//
//   [student]
//   クラス: 1組, 2組, 3組     ← カンマ区切りで選択肢列挙
//   番号: 1-40                 ← 範囲指定で自動展開
//
//   ## 問題文
//   - 選択肢
//   - *正解の選択肢   ← * で正解マーク
//   score: 10
//   解説: 解説テキスト
// ---------------------------------------------------------------------------
function parseRange(value) {
  const match = value.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  const [, start, end] = match.map(Number);
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
}

function parseMd(content) {
  const lines = content.split('\n').map((l) => l.trim());

  let title = '';
  let description = '';
  const studentFields = [];
  const questions = [];
  let current = null;
  let inStudent = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
    } else if (line.startsWith('> ') && !current && !inStudent) {
      description = line.slice(2).trim();
    } else if (line === '[student]') {
      inStudent = true;
    } else if (inStudent && line.includes(':') && !line.startsWith('##')) {
      const colonIdx = line.indexOf(':');
      const label = line.slice(0, colonIdx).trim();
      const rawValue = line.slice(colonIdx + 1).trim();
      const range = parseRange(rawValue);
      const options = range ?? rawValue.split(',').map((v) => v.trim()).filter(Boolean);
      studentFields.push({ label, options });
    } else if (line.startsWith('## ')) {
      inStudent = false;
      if (current) questions.push(current);
      current = { text: line.slice(3).trim(), options: [], correct: null, score: 1, explanation: '' };
    } else if (line.startsWith('- ') && current) {
      const raw = line.slice(2).trim();
      if (raw.startsWith('*')) {
        const value = raw.slice(1).trim();
        current.options.push(value);
        current.correct = value;
      } else {
        current.options.push(raw);
      }
    } else if (line.startsWith('score:') && current) {
      current.score = parseInt(line.split(':')[1].trim(), 10);
    } else if (line.startsWith('解説:') && current) {
      current.explanation = line.slice(3).trim();
    }
  }

  if (current) questions.push(current);

  return { title, description, studentFields, questions };
}

// ---------------------------------------------------------------------------
// OAuth 認証
// ---------------------------------------------------------------------------
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  return await getNewToken(oAuth2Client);
}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n認証URLをブラウザで開いてね↓');
  console.log(authUrl);

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
// フォーム作成
// ---------------------------------------------------------------------------
async function createForm(auth, { title, description, studentFields, questions }) {
  const forms = google.forms({ version: 'v1', auth });

  const createRes = await forms.forms.create({
    requestBody: { info: { title } },
  });

  const formId = createRes.data.formId;
  console.log(`\nフォーム作成完了！ formId: ${formId}`);

  // 学籍番号ドロップダウン（採点なし）を先頭に、続いてクイズ問題を追加
  const studentRequests = studentFields.map((f, i) => ({
    createItem: {
      item: {
        title: f.label,
        questionItem: {
          question: {
            required: true,
            choiceQuestion: {
              type: 'DROP_DOWN',
              options: f.options.map((v) => ({ value: v })),
            },
          },
        },
      },
      location: { index: i },
    },
  }));

  const quizRequests = questions.map((q, i) => ({
    createItem: {
      item: {
        title: q.text,
        questionItem: {
          question: {
            required: true,
            grading: {
              pointValue: q.score,
              correctAnswers: { answers: [{ value: q.correct }] },
              ...(q.explanation && {
                whenRight: { text: q.explanation },
                whenWrong: { text: q.explanation },
              }),
            },
            choiceQuestion: {
              type: 'RADIO',
              options: q.options.map((v) => ({ value: v })),
              shuffle: false,
            },
          },
        },
      },
      location: { index: studentFields.length + i },
    },
  }));

  const requests = [
    {
      updateSettings: {
        settings: { quizSettings: { isQuiz: true } },
        updateMask: 'quizSettings.isQuiz',
      },
    },
    ...(description
      ? [{ updateFormInfo: { info: { description }, updateMask: 'description' } }]
      : []),
    ...studentRequests,
    ...quizRequests,
  ];

  await forms.forms.batchUpdate({ formId, requestBody: { requests } });

  console.log(`問題を ${questions.length} 問追加したよ！`);
  console.log(`\n✅ フォームURL: https://docs.google.com/forms/d/${formId}/edit`);
}

// ---------------------------------------------------------------------------
// エントリーポイント
// ---------------------------------------------------------------------------
(async () => {
  const mdPath = process.argv[2];

  if (!mdPath) {
    console.error('使い方: node index.js <mdファイルのパス>');
    console.error('例:     node index.js test/sample.md');
    process.exit(1);
  }

  const resolvedPath = path.resolve(mdPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`ファイルが見つからないよ: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const { title, description, studentFields, questions } = parseMd(content);

    if (!title) {
      console.error('mdファイルに # タイトル が見つからないよ');
      process.exit(1);
    }
    if (questions.length === 0) {
      console.error('mdファイルに問題（## 〜）が見つからないよ');
      process.exit(1);
    }

    console.log(`\n📄 読み込んだファイル: ${resolvedPath}`);
    console.log(`📝 タイトル: ${title}`);
    if (description) console.log(`📋 説明: ${description}`);
    if (studentFields.length > 0) {
      console.log(`🎓 学籍番号項目: ${studentFields.map((f) => f.label).join(', ')}`);
    }
    console.log(`❓ 問題数: ${questions.length} 問`);

    const auth = await authorize();
    await createForm(auth, { title, description, studentFields, questions });
  } catch (err) {
    console.error('エラー発生:', err.message ?? err);
  }
})();
