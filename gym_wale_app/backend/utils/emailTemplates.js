// Reusable semantic email body generators (content only).
// These return bodyHtml fragments (NOT full documents) intended to be wrapped by wrapEmail via sendEmail.

function gymApprovalBody(gym) {
  return `
    <p>Hello ${gym.contactPerson || gym.gymName || 'Gym Owner'},</p>
    <p>Your gym <strong>${gym.gymName}</strong> has been <strong>approved</strong>. You can now configure settings, add trainers, and manage members.</p>
    <ol style="margin:16px 0 22px;padding-left:22px;">
      <li>Upload your logo & cover images</li>
      <li>Define membership plans & pricing</li>
      <li>Invite trainers and assign roles</li>
      <li>Start onboarding members</li>
    </ol>
    <p style="margin-top:0;">Need assistance? Visit the support center anytime.</p>
  `;
}

function gymRejectionBody(gym, reason) {
  return `
    <p>Hello ${gym.ownerName || gym.gymName || 'Gym Owner'},</p>
    <p>We reviewed the registration for <strong>${gym.gymName || gym.name || 'your gym'}</strong> and could not approve it at this time.</p>
    <p><strong>Reason:</strong></p>
    <blockquote style="margin:14px 0;padding:14px 18px;background:#1e293b;border-left:4px solid #e11d48;border-radius:10px;color:#f1f5f9;">${reason}</blockquote>
    <p>Please correct the above and resubmit your application. Common issues: missing documents, incomplete profile, unverifiable address.</p>
  `;
}

function passwordResetBody(nameOrLabel, otp) {
  return `
    <p>Hello ${nameOrLabel || 'User'},</p>
    <p>Use the security code below to reset your password:</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:18px 0 10px;color:#38bdf8;">${otp}</div>
    <p style="margin:0 0 14px;">This code expires in <strong>10 minutes</strong>.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;
}

function welcomeUserBody(firstName) {
  return `
    <p>Hi ${firstName || 'there'},</p>
    <p>Welcome to <strong>Gym-Wale</strong>! Your account is ready and you can now explore programs, manage memberships, and track your progress.</p>
    <p style="margin-top:18px;">For the best experience, complete your profile and enable notifications.</p>
  `;
}

module.exports = {
  gymApprovalBody,
  gymRejectionBody,
  passwordResetBody,
  welcomeUserBody
};
