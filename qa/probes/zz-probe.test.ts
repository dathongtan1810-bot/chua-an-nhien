import { test } from 'vitest';
import { startServer, newUser, sleep } from '../lib/harness';
const samples = [
 'địt mẹ mày','dit me may','đ ị t','d.i.t m.e','đm','dm may','vcl','vkl','cc','đéo','deo hieu','đ!t','đjt mẹ','djt me','l0n','lồn','loz','cặc','cak','buồi',
 'ｄｉｔ ｍｅ','đ​ị​t','dịt me','địt'.normalize('NFD')+' mẹ','dịt mẹ','đĩ','con đĩ','đĩ điếm','fuck you','f u c k','fuk','sh1t','bitch','ngu như bò','óc chó','thằng ngu','mẹ kiếp','mả mẹ','chó chết',
 'zalo 0912345678','0912 345 678','0 9 1 2 3 4 5 6 7 8','không chín một hai ba bốn năm sáu bảy tám','+84912345678','zalo.me/0912345678','fb.com/abc','t.me/abc','www . abc . com','abc[.]com','abc dot com','https://x.y','bit.ly/abc','ib mình nhé','inbox nhận quà','kết bạn zalo','mua bán acc','cá độ bóng đá','nhà cái uy tín','vay tiền nhanh',
 'Cầu cho mẹ khỏe mạnh','Mong cả nhà bình an','Thi đỗ đại học 2026','Con đi học về','Đi ngủ ngon nhé','Bưởi Năm Roi ngon','lớn lên làm bác sĩ','Ước mơ cao lớn','con cặc kè','Cái đít nồi','Đi du lịch Đà Lạt','Dám ước mơ','Vũ Đình Tuấn','Mong ông Đĩnh khỏe','Nguyễn Thị Lồng','ủng hộ quỹ từ thiện','chúc mừng sinh nhật Thùy','bệnh viện Chợ Rẫy','Phòng 101','Mã số 0912',
];
test('probe', async () => {
  const s = await startServer({ MAX_CONN_PER_IP: '200' });
  const out: string[] = [];
  let i = 0;
  for (const t of samples) {
    const c = await newUser(s.url, null);
    const a = await c.emit('release_lantern', { text: t, color: 'vang' });
    out.push(`${a.ok ? 'PASS  ' : 'BLOCK '} ${JSON.stringify(t)} ${a.ok ? a.status : a.code}`);
    c.close();
    if (++i % 14 === 0) await s.restart();
  }
  (await import('node:fs')).writeFileSync('.tmp/probe.txt', out.join('\n'));
  await s.stop();
}, 300000);
