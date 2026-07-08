import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const resend = new Resend(RESEND_API_KEY);

export async function sendVerificationEmail(toEmail: string, otp: string) {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured in .env!");
    console.warn(`Mock sending email to ${toEmail} with OTP: ${otp}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Pulse Chat <onboarding@resend.dev>",
      to: [toEmail],
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
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw new Error("Lỗi từ Resend API");
    }

    console.log(`✉️ Verification email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Không thể gửi email xác nhận. Vui lòng thử lại sau.");
  }
}
