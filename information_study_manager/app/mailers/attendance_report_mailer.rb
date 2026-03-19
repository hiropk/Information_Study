class AttendanceReportMailer < ApplicationMailer
  def report(attendances, q_params = {})
    @attendances = attendances
    @q_params    = q_params
    @sent_at     = Time.current

    date_label = q_params[:date_eq].presence || @sent_at.strftime("%Y-%m-%d")

    mail(
      to:      ENV["REPORT_TO"] || Rails.application.credentials.dig(:gmail, :report_to),
      subject: "出席レポート #{date_label}"
    )
  end
end
