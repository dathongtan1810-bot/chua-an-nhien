// Kiểm thử bộ lọc từ. Chạy: node --test content/tu-cam.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chuanHoa, boDau, kiemTra, che } from './tools/loc-tu.mjs';

const data = JSON.parse(readFileSync(new URL('./tu-cam.json', import.meta.url), 'utf8'));

const bat = (text, tu) => {
  const kq = kiemTra(text, data);
  assert.equal(kq.hopLe, false, `phải chặn: "${text}"`);
  if (tu) assert.ok(kq.viPham.some((v) => v.tu === tu), `"${text}" phải khớp "${tu}", nhận: ${JSON.stringify(kq.viPham)}`);
  return kq;
};
const cho = (text) => {
  const kq = kiemTra(text, data);
  assert.equal(kq.hopLe, true, `không được chặn nhầm: "${text}" -> ${JSON.stringify(kq.viPham)}`);
};

// ---- Cấu trúc dữ liệu ----
test('dữ liệu hợp lệ: 150–300 mục, nhóm & mức độ đúng', () => {
  const NHOM = new Set(['tuc-tuc', 'xuc-pham', 'tinh-duc', 'bao-luc', 'phan-biet', 'lua-dao',
    'chinh-tri-cuc-doan', 'ma-tuy', 'bang-thuong-ton-giao']);
  assert.equal(data.version, 1);
  assert.ok(data.tuCam.length >= 150 && data.tuCam.length <= 300, `số mục: ${data.tuCam.length}`);
  for (const m of data.tuCam) {
    assert.ok(m.tu && typeof m.tu === 'string');
    assert.ok(NHOM.has(m.nhom), m.nhom);
    assert.ok([1, 2, 3].includes(m.mucDo));
    assert.ok(Array.isArray(m.bienThe));
    assert.equal(m.tu, m.tu.normalize('NFC'));
  }
  assert.ok(data.allowlist.includes('dâm bụt'));
});

// ---- Hàm tiện ích ----
test('boDau bỏ dấu tiếng Việt và đ→d', () => {
  assert.equal(boDau('Nam mô A Di Đà Phật'), 'Nam mo A Di Da Phat');
  assert.equal(boDau('đường lớn'), 'duong lon');
});
test('chuanHoa: chữ thường, thay ký tự lách, nối chữ cái rời', () => {
  assert.equal(chuanHoa('L0N'), 'lon');
  assert.equal(chuanHoa('c.a.c'), 'cac');
  assert.equal(chuanHoa('đ i t'), 'đit');
  assert.equal(chuanHoa('Xin   Chào'), 'xin chào');
  assert.equal(chuanHoa('ngu!'), 'ngu!'); // "!" cuối từ không bị đổi thành "i"
  assert.equal(chuanHoa('năm 2024'), 'năm 2024');
});

// ---- Bắt từ cấm ----
test('bắt từ có dấu', () => bat('đồ địt', 'địt'));
test('bắt chữ hoa', () => bat('ĐỊT MẸ', 'địt mẹ'));
test('bắt không dấu', () => bat('dit me may', 'địt mẹ'));
test('bắt viết tắt đm / dm', () => { bat('đm', 'đm'); bat('dm cuộc đời', 'đm'); });
test('bắt viết tắt vcl, vkl, clgt', () => { bat('vcl', 'vcl'); bat('hay vkl', 'vcl'); bat('clgt', 'clgt'); });
test('bắt viết tắt đcm, dmm, cmm, cc, vl', () => {
  bat('đcm', 'đcm'); bat('dmm', 'đmm'); bat('cmm', 'cmm'); bat('cc', 'cc'); bat('vl', 'vl');
});
test('bắt loz / lol', () => { bat('loz', 'lồn'); bat('lol', 'lol'); });
test('bắt teencode đ!t, d1t, đjt', () => { bat('đ!t', 'địt'); bat('d1t', 'địt'); bat('đjt', 'địt'); });
test('bắt teencode cak, cặk, l0n, lìn', () => { bat('cak', 'cặc'); bat('cặk', 'cặc'); bat('l0n', 'lồn'); bat('lìn', 'lồn'); });
test('bắt chèn dấu chấm / gạch: c.a.c, c-ặ-c, f.u.c.k', () => {
  bat('c.a.c', 'cặc'); bat('c-ặ-c', 'cặc'); bat('f.u.c.k', 'fuck');
});
test('bắt chèn khoảng trắng: đ i t, c a c', () => { bat('đ i t', 'địt'); bat('c a c', 'cặc'); });
test('bắt lặp ký tự: đmmmm, vcllll, nguuuu', () => {
  bat('đmmmm', 'đm'); bat('vcllll', 'vcl'); bat('nguuuu', 'ngu');
});
test('bắt ký tự lách lặp: l00n', () => bat('l00n', 'lồn'));
test('bắt xúc phạm: óc chó, súc vật, khốn nạn', () => {
  bat('óc chó', 'óc chó'); bat('oc cho', 'óc chó'); bat('đồ súc vật', 'súc vật'); bat('khon nan', 'khốn nạn');
});
test('bắt tình dục', () => { bat('xem phim sex', 'phim sex'); bat('hiep dam', 'hiếp dâm'); });
test('bắt bạo lực / đe dọa', () => {
  bat('tao giết mày', 'giết mày'); bat('cau cho no chet', 'cho nó chết');
});
test('bắt lừa đảo / spam', () => {
  bat('nạp thẻ nhận quà', 'nạp thẻ'); bat('kiem tien online', 'kiếm tiền online');
  bat('vay nhanh lãi thấp', 'vay nhanh'); bat('vào https://abc.xyz', 'http');
});
test('bắt ma túy', () => { bat('bán cần sa', 'cần sa'); bat('thuoc lac', 'thuốc lắc'); });
test('bắt xúc phạm tôn giáo', () => { bat('phật ngu', 'phật ngu'); bat('su ho mang', 'sư hổ mang'); });
test('bắt tiếng Anh', () => { bat('FUCK you', 'fuck you'); bat('sh1t', 'shit'); bat('b1tch', 'bitch'); });
test('bắt dù có emoji / ký tự vô hình chen giữa', () => { bat('đ​m', 'đm'); bat('vcl😂', 'vcl'); });
test('mucDoCaoNhat và nhóm', () => {
  const kq = bat('đụ má mày ngu', 'đụ má');
  assert.equal(kq.mucDoCaoNhat, 3);
  assert.equal(kq.viPham[0].nhom, 'tuc-tuc');
});

// ---- Không chặn nhầm ----
const SACH = [
  'hoa dâm bụt', 'Cây dâm bụt trước sân chùa', 'lon nước ngọt', 'lon nuoc ngot', 'các bạn', 'cac ban',
  'buổi sáng', 'buoi sang', 'quả bưởi', 'qua buoi', 'lớn lên', 'lon len', 'Đức Phật', 'con chim sẻ',
  'cánh bướm', 'đầu năm', 'dau nam', 'dám nghĩ dám làm', 'dam nghi', 'đi chùa', 'di chua',
  'Nam mô A Di Đà Phật', 'nam mo a di da phat', 'thịt bò', 'thit bo', 'học sinh giỏi',
  'Chúc cả nhà ngủ ngon', 'chuc ngu ngon', 'đeo kính', 'dẻo dai', 'đi du lịch', 'dù mà',
  'đít nồi', 'cô bác', 'đảm đang', 'mưa dầm', 'từ từ', 'treo cờ', 'cả cuộc đời',
  'Cầu cho con trai cai nghiện ma túy', 'ức hiếp', 'Ngọc Bích', 'năm 2024!', 'Phật ngủ',
  'Con xin sám hối, mong tâm bớt tham sân si', 'Cầu cho ba mẹ bình an, mạnh khỏe',
  'Mong chồng con bỏ cờ bạc', 'Con chó nhà con mất rồi, mong bé được yên', 'chim bay lạc đàn',
  'Xin cho con thi đậu đại học', 'Lễ Vu Lan báo hiếu', 'Rằm tháng Giêng',
];
for (const s of SACH) test(`không chặn nhầm: "${s}"`, () => cho(s));

// ---- Che ----
test('che thay đoạn vi phạm bằng *** và giữ phần còn lại', () => {
  assert.equal(che('Bạn ngu quá, đi ngủ đi', data), 'Bạn *** quá, đi ngủ đi');
  assert.equal(che('vcl thật', data), '*** thật');
  assert.equal(che('đmmmm', data), '***');
  assert.equal(che('c.a.c gì vậy', data), '*** gì vậy');
});
test('che không đổi chuỗi sạch', () => {
  const s = 'Nam mô A Di Đà Phật, con xin cầu bình an.';
  assert.equal(che(s, data), s);
});
