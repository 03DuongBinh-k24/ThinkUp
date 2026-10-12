// TODO(pre-deploy): Nhớ xóa cửa sổ OAuth giả lập khi tích hợp đăng nhập mạng xã hội thật.
export function openMockOAuthPopup(provider: 'Google' | 'Facebook', action: 'Login' | 'SignUp'): Window | null {
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(
    'about:blank',
    `ThinkUp_${provider}_${action}`,
    `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0`
  );
  if (popup) {
    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>${action === 'Login' ? 'Đăng nhập' : 'Đăng ký'} bằng ${provider}</title></head>
      <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
        <h3 style="color: #0f172a; margin-bottom: 8px;">Đang kết nối ${provider}...</h3>
        <p style="color: #64748b; font-size: 13px;">Vui lòng chờ trong giây lát.</p>
      </body>
      </html>
    `);
  }
  return popup;
}
