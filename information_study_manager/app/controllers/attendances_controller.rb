class AttendancesController < ApplicationController
  def index
    today = Date.current.iso8601
    q_params = (params[:q] || {}).reverse_merge(date_eq: today, created_on: today)
    @q = Attendance.ransack(q_params)
    @attendances = @q.result(distinct: true).order(created_at: :desc)
    @student_codes = Attendance.distinct.order(:student_code).pluck(:student_code)
    @lesson_codes  = Attendance.distinct.order(:lesson_code).pluck(:lesson_code)
  end
end
