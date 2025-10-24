const { google } = require('googleapis');

function todayVN_DDMMYYYY() {
  const fmt = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  return fmt.format(new Date()); // ví dụ "24/10/2025"
}

// ===== AI extract (Gemini) =====
// Chú ý: cần GEMINI_API_KEY trong env
async function aiExtractExpense(text) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

  const TODAY_VN = todayVN_DDMMYYYY();

  const prompt = `
Nhiệm vụ: Chuẩn hoá tin nhắn chi tiêu tiếng Việt thành JSON.

Ràng buộc:
- Múi giờ: Asia/Ho_Chi_Minh.
- TODAY_VN = "${TODAY_VN}" (định dạng DD/MM/YYYY).
- Nếu có "Hôm nay/Hôm qua/Hôm kia" thì NGHĨA BẮT BUỘC:
  * Hôm nay  -> chính là TODAY_VN
  * Hôm qua  -> TODAY_VN - 1 ngày
  * Hôm kia  -> TODAY_VN - 2 ngày
- Nếu là ngày tuyệt đối (vd 1/1/2024, 10-10-2025, 01/01/2024) thì giữ nguyên nhưng chuẩn hoá thành DD/MM/YYYY.
- amount: số nguyên VND. Quy tắc: 70k=70000; 1.5m=1500000; 2tr=2000000; "70.000"=70000; "70000 VND"=70000; "₫70.000"=70000.
- note: phần còn lại (ghi chú mô tả).
- Chỉ trả về JSON DUY NHẤT theo schema sau, không thêm chữ nào khác:
{"date":"DD/MM/YYYY","note":"string","amount":number}

Tin nhắn: "${text}"
`.trim();

  const res = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const out = (res.response.text() || '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI did not return JSON');

  const data = JSON.parse(m[0]);
  // đảm bảo kiểu dữ liệu tối thiểu
  if (!data || typeof data !== 'object') throw new Error('AI JSON invalid');
  if (typeof data.date !== 'string') data.date = '';
  if (typeof data.note !== 'string') data.note = '';
  if (typeof data.amount !== 'number') data.amount = Number(data.amount) || null;

  return data; // { date:"DD/MM/YYYY", note:"...", amount: 70000 }
}


module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('ok');

    const wanted = process.env.TELEGRAM_SECRET_TOKEN;
    const got = req.headers['x-telegram-bot-api-secret-token'];
    if (wanted && got !== wanted) return res.status(403).send('forbidden');

    const update = req.body || {};
    const msg = update.message || update.edited_message;
    if (!msg) return res.status(200).send('ok');

    const text = msg.text || msg.caption || '';
    const chatId = msg.chat?.id ?? '';
    const userId = msg.from?.id ?? '';
    const username = msg.from?.username || `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim();

        // --- ƯU TIÊN AI ---
    let dateFormatted = '';
    let note = '';
    let amount = null;

    const ai = await aiExtractExpense(text);
    if (ai && (ai.date || ai.amount || ai.note)) {
      // Chuẩn hoá date bằng parser VN sẵn có của bạn để luôn ra DD/MM/YYYY
      const p = parseDateVN(ai.date || '', 'Asia/Ho_Chi_Minh');
      dateFormatted = p.formatted || '';
      note = (ai.note || '').trim();
      amount = (typeof ai.amount === 'number' && Number.isFinite(ai.amount)) ? ai.amount : null;
    }

    // --- FALLBACK thủ công nếu AI không chắc ---
    if (!dateFormatted || amount === null || !note) {
      const parts = (text || '').split(',').map(s => s.trim());
      const dateRaw = parts[0] || '';
      const parsedDate = parseDateVN(dateRaw, 'Asia/Ho_Chi_Minh');
      const fallbackNote = parts[1] || '';
      const moneyRaw = parts[2] || '';
      const fallbackAmount = parseMoneyVN(moneyRaw);

      if (!dateFormatted) dateFormatted = parsedDate.formatted || '';
      if (!note) note = fallbackNote;
      if (amount === null) amount = fallbackAmount;
    }

    // --- Timestamp VN (UTC+7) giữ nguyên như bạn đang làm ---
    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const timestampVN = nowVN.toISOString().replace('T', ' ').substring(0, 19);

    console.log('AI/date:', dateFormatted, '| note:', note, '| amount:', amount);

    console.log('Parsed date:', dateFormatted);
    console.log('Parsed note:', note);
    console.log('Parsed amount:', amount);

    // --- FIX: chuẩn hoá private key ---
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const fixedKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

    try {
        console.log('⚙️ Using service account email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        console.log('🔑 Private key starts with:', fixedKey.slice(0, 40));

        // ✅ Dùng object-form thay vì positional args
        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: fixedKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const token = await auth.authorize();
        console.log('✅ Got access token (starts with):', token.access_token?.slice(0, 20));

        // Thay vì hardcode
        const baUserId = parseInt(process.env.BA_USER_ID || '0', 10);
        
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SHEET_ID,
            range: `${process.env.SHEET_TAB || 'Sheet1'}!A:E`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    [timestampVN,
                    userId === baUserId ? 'Ba' : 'Mẹ',
                        dateFormatted,
                        note,
                    amount ?? '',
                    ]],
            },
        });

        console.log('✅ Sheets append success');
    } catch (e) {
        console.error('❌ Sheets append error:', e?.response?.data || e.message);
    }

    return res.status(200).send('ok');
};

// ===== Date utils (VN) =====

/** Lấy y/m/d theo 1 timezone (mặc định Asia/Ho_Chi_Minh) */
function getPartsInTZ(date = new Date(), timeZone = 'Asia/Ho_Chi_Minh') {
    const fmt = new Intl.DateTimeFormat('vi-VN', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    // fmt.format -> "dd/mm/yyyy"
    const [d, m, y] = fmt.format(date).split('/');
    return { y: Number(y), m: Number(m), d: Number(d) };
}

/** Tạo Date (UTC) tương ứng với yyyy-mm-dd trong timezone chỉ định (00:00 của tz đó) */
function dateFromYMDInTZ(y, m, d, timeZone = 'Asia/Ho_Chi_Minh') {
    // Lấy offset chênh lệch tz so với UTC tại thời điểm đó bằng cách so 00:00 tz -> UTC
    // Cách an toàn: tạo chuỗi “dd/mm/yyyy 00:00” rồi parse lại sang UTC bằng Intl.
    // Nhưng Node không parse locale string → ta lấy offset bằng cách so 12:00 UTC.
    // Giản lược: vì Asia/Ho_Chi_Minh là UTC+7 không DST, có thể dùng trực tiếp:
    const utc = Date.UTC(y, m - 1, d, 0, 0, 0);
    // Asia/Ho_Chi_Minh là +7h
    return new Date(utc - 7 * 60 * 60 * 1000); // chuyển về “00:00 ở VN” như một mốc chuẩn
}

/** Chuẩn hoá tiếng Việt bỏ dấu để so sánh khoá từ (hôm nay/quà/kia) */
function stripVN(s) {
    return s
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/gi, 'd')
        .toLowerCase();
}

/** Format DD/MM/YYYY (2 chữ số ngày/tháng) */
function fmtDDMMYYYY(y, m, d) {
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${dd}/${mm}/${y}`;
}

/**
 * Parse ngày từ chuỗi tiếng Việt:
 * - "Hôm nay" / "Hôm qua" / "Hôm kia"
 * - "DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY", "D-M-YYYY"
 * Trả về { y, m, d, formatted } hoặc { error }
 */
function parseDateVN(input, timeZone = 'Asia/Ho_Chi_Minh') {
    if (!input || typeof input !== 'string') {
        return { error: 'empty' };
    }
    const raw = input.trim();
    const key = stripVN(raw);

    // 1) Từ khoá tương đối
    if (key === 'hom nay') {
        const { y, m, d } = getPartsInTZ(new Date(), timeZone);
        return { y, m, d, formatted: fmtDDMMYYYY(y, m, d) };
    }
    if (key === 'hom qua') {
        const now = new Date();
        const { y, m, d } = getPartsInTZ(now, timeZone);
        const today = new Date(Date.UTC(y, m - 1, d)); // mốc ngày (không giờ)
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const p = getPartsInTZ(yesterday, timeZone);
        return { ...p, formatted: fmtDDMMYYYY(p.y, p.m, p.d) };
    }
    if (key === 'hom kia') {
        const now = new Date();
        const { y, m, d } = getPartsInTZ(now, timeZone);
        const today = new Date(Date.UTC(y, m - 1, d));
        const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
        const p = getPartsInTZ(twoDaysAgo, timeZone);
        return { ...p, formatted: fmtDDMMYYYY(p.y, p.m, p.d) };
    }

    // 2) Ngày tuyệt đối: dd/mm/yyyy | d/m/yyyy | dd-mm-yyyy | d-m-yyyy
    //   - Năm bắt buộc 4 chữ số
    const mAbs = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (mAbs) {
        const d = Number(mAbs[1]);
        const m = Number(mAbs[2]);
        const y = Number(mAbs[3]);
        // Validate cơ bản
        if (m < 1 || m > 12) return { error: 'month' };
        if (d < 1 || d > 31) return { error: 'day' };
        const test = new Date(y, m - 1, d);
        if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) {
            return { error: 'invalid-date' };
        }
        return { y, m, d, formatted: fmtDDMMYYYY(y, m, d) };
    }

    return { error: 'unrecognized' };
}

// ===== Money utils (VN) =====
function stripVN(s) {
    return (s || '')
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/gi, 'd')
        .toLowerCase();
}

/**
 * Trả về số nguyên (VND) hoặc null nếu không parse được.
 * Hỗ trợ: 70000 | 70.000 | 70,000 | 70000vnd | ₫70.000 | 70k | 1m | 1.5m | 2tr | 2 trieu
 */
function parseMoneyVN(input) {
    if (input == null) return null;
    let s = stripVN(input).replace(/\s+/g, '');

    // Bỏ đơn vị tiền tệ phổ biến
    s = s.replace(/vnd|vnđ|vn|d|₫/g, '');

    // k / m / tr / trieu (có thể có phần thập phân, ví dụ 1.5m)
    let m = s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([km]|tr|trieu)$/i);
    if (m) {
        const base = parseFloat(m[1].replace(',', '.'));
        const unit = m[2].toLowerCase();
        const mult =
            unit === 'k' ? 1_000 :
                unit === 'm' ? 1_000_000 :
                    (unit === 'tr' || unit === 'trieu') ? 1_000_000 : 1;
        return Math.round(base * mult);
    }

    // Số thuần có dấu . , ngăn cách
    const digits = s.replace(/[^0-9]/g, '');
    if (!digits) return null;

    // Tránh leading zeros vô nghĩa: parseInt sẽ xử lý
    return parseInt(digits, 10);
}
