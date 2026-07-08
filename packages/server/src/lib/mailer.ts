import nodemailer from "nodemailer";
import dns from "node:dns";

// Khắc phục lỗi ENETUNREACH (IPv6) của Node 18+ trên Render
dns.setDefaultResultOrder("ipv4first");

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendVerificationEmail(toEmail: string, otp: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️ SMTP credentials not configured in .env!");
    console.warn(`Mock sending email to ${toEmail} with OTP: ${otp}`);
    return;
  }

  const mailOptions = {
    from: `"Pulse Chat" <${SMTP_USER}>`,
    to: toEmail,
    subject: "Mã xác nhận đăng ký tài khoản",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác nhận địa chỉ email của bạn</h2>
        <p>Chào bạn,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP dưới đây để hoàn tất việc đăng ký:</p>
        <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <h1 style="letter-spacing: 4px; margin: 0; color: #18181b;">${otp}</h1>
        </div>
        <p>Mã này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Verification email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending email:", error);
    console.log(`\n====================================================`);
    console.log(`[MOCK EMAIL] Không thể gửi email qua SMTP (có thể do bị chặn cổng).`);
    console.log(`[MOCK EMAIL] Hỗ trợ Bypass -> OTP của tài khoản ${toEmail} là: ${otp}`);
    console.log(`====================================================\n`);
  }
}
