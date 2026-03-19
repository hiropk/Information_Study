class AttendanceReportsController < ApplicationController
  def create
    q_params = params[:q]&.permit!&.to_h&.symbolize_keys || {}
    attendances = Attendance.ransack(q_params)
                            .result(distinct: true)
                            .order(:student_code)

    if attendances.empty?
      redirect_to attendances_path(q: q_params),
                  alert: "送信対象のレコードがありません。絞り込み条件を確認してください。"
      return
    end

    AttendanceReportMailer.report(attendances.to_a, q_params).deliver_now

    redirect_to attendances_path(q: q_params),
                notice: "レポートを送信しました（#{attendances.size} 件）。"
  rescue => e
    redirect_to attendances_path(q: q_params),
                alert: "メール送信に失敗しました: #{e.message}"
  end
end
