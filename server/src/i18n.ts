/**
 * Dịch thông điệp lỗi gửi cho client theo `lang` trong hello. Mã gốc viết tiếng Việt;
 * bảng dưới đây ánh xạ sang tiếng Anh. Thông điệp không có trong bảng giữ nguyên.
 */
const EN: Record<string, string> = {
  'Cần gửi hello trước': 'Send hello first',
  'Chế độ ngoại tuyến': 'Online features are turned off',
  'Không thể đổi deviceId trên cùng kết nối': 'deviceId cannot change on the same connection',
  'Thiết bị đã bị khoá': 'This device has been blocked',
  'Nội dung không hợp lệ': 'Invalid content',
  'Không tìm thấy đèn': 'Lantern not found',
  'Bạn đã thả tim đèn này': 'You already liked this lantern',
  'Không tìm thấy người dùng': 'User not found',
  'Không thể báo cáo chính mình': 'You cannot report yourself',
  'Bạn đã báo cáo mục này': 'You already reported this',
  'Không thể chặn chính mình': 'You cannot block yourself',
  'Hết chỗ tạo phòng': 'No room capacity left',
  'Phòng đã đủ người': 'The room is full',
  'Mã phòng không tồn tại': 'Room code not found',
  'Lỗi máy chủ': 'Server error',
  'Lời nguyện đang trống': 'Your wish is empty',
  'Lời nguyện có từ ngữ không phù hợp': 'Your wish contains inappropriate words',
  'Không được chèn đường dẫn': 'Links are not allowed',
  'Không được chèn số điện thoại': 'Phone numbers are not allowed',
  'Không được quảng cáo': 'Advertising is not allowed',
  'Nội dung lặp lại bất thường': 'Content looks like spam',
};

export function translate(message: string, lang: string | undefined): string {
  if (!lang || !lang.toLowerCase().startsWith('en')) return message;
  if (EN[message]) return EN[message];
  let m = /^Tính năng (\w+) đang tắt$/.exec(message);
  if (m) return `Feature ${m[1]} is turned off`;
  m = /^Lời nguyện tối đa (\d+) ký tự$/.exec(message);
  if (m) return `Wishes are limited to ${m[1]} characters`;
  return message;
}
